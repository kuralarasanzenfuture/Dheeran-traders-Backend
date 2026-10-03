import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";

/**
 * CREATE MONTHLY INVESTMENT PLAN AMOUNT
 */
export const createMonthlyInvestmentPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      plan_id,
      principal_amount,
      minimum_monthly_interest = 0.0,
      maximum_monthly_interest = 0.0,
      is_active = true,
      remarks,
    } = req.body;

    const userId = req.user?.id || null;

    // 1. Validation: Required fields
    if (
      plan_id === undefined ||
      plan_id === null ||
      principal_amount === undefined ||
      principal_amount === null
    ) {
      return res.status(400).json({
        success: false,
        message: "plan_id and principal_amount are required",
      });
    }

    // 2. Validate plan_id
    plan_id = Number(plan_id);
    if (isNaN(plan_id) || !Number.isInteger(plan_id) || plan_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "plan_id must be a valid positive integer",
      });
    }

    // 3. Verify plan exists
    const [planRows] = await connection.query(
      `SELECT id, plan_name, plan_code, plan_start_date, plan_end_date, interest_frequency, status 
       FROM monthly_investment_plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Monthly investment plan with ID ${plan_id} not found`,
      });
    }

    // 4. Validate principal_amount
    principal_amount = Number(principal_amount);
    if (isNaN(principal_amount) || principal_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "principal_amount must be a valid positive number greater than 0",
      });
    }
    principal_amount = Number(principal_amount.toFixed(2));

    // 5. Validate interest amounts
    minimum_monthly_interest = Number(minimum_monthly_interest);
    if (isNaN(minimum_monthly_interest) || minimum_monthly_interest < 0) {
      return res.status(400).json({
        success: false,
        message: "minimum_monthly_interest must be a valid number >= 0",
      });
    }
    minimum_monthly_interest = Number(minimum_monthly_interest.toFixed(2));

    if (maximum_monthly_interest === undefined || maximum_monthly_interest === null) {
      maximum_monthly_interest = minimum_monthly_interest;
    } else {
      maximum_monthly_interest = Number(maximum_monthly_interest);
      if (isNaN(maximum_monthly_interest) || maximum_monthly_interest < minimum_monthly_interest) {
        return res.status(400).json({
          success: false,
          message: "maximum_monthly_interest must be greater than or equal to minimum_monthly_interest",
        });
      }
      maximum_monthly_interest = Number(maximum_monthly_interest.toFixed(2));
    }

    // Normalize boolean
    is_active =
      is_active === true ||
      is_active === "true" ||
      is_active === 1 ||
      is_active === "1";

    // 6. Duplicate check: unique (plan_id, principal_amount)
    const [exists] = await connection.query(
      `SELECT id FROM monthly_investment_plan_amounts 
       WHERE plan_id = ? AND principal_amount = ?`,
      [plan_id, principal_amount]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Principal amount ₹${principal_amount} already exists for monthly investment plan "${planRows[0].plan_name}" (ID ${plan_id})`,
      });
    }

    // 7. Insert
    const [result] = await connection.query(
      `INSERT INTO monthly_investment_plan_amounts (
        plan_id,
        principal_amount,
        minimum_monthly_interest,
        maximum_monthly_interest,
        is_active,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        plan_id,
        principal_amount,
        minimum_monthly_interest,
        maximum_monthly_interest,
        is_active,
        userId,
      ]
    );

    const [newRows] = await connection.query(
      `SELECT 
        mipa.*,
        mip.plan_name,
        mip.plan_code,
        mip.plan_start_date,
        mip.plan_end_date,
        mip.interest_frequency,
        mip.status AS plan_status
       FROM monthly_investment_plan_amounts mipa
       JOIN monthly_investment_plans mip ON mipa.plan_id = mip.id
       WHERE mipa.id = ?`,
      [result.insertId]
    );

    const newRecord = newRows[0];

    // 8. Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_plan_amounts",
      recordId: result.insertId,
      action: "INSERT",
      newData: newRecord,
      userId,
      remarks:
        remarks ||
        `Created monthly investment plan amount ₹${principal_amount} for plan "${planRows[0].plan_name}"`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Monthly investment plan amount created successfully",
      data: newRecord,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create monthly investment plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating monthly investment plan amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL MONTHLY INVESTMENT PLAN AMOUNTS
 * Optional filters: plan_id, is_active, search
 */
export const getAllMonthlyInvestmentPlanAmounts = async (req, res) => {
  try {
    const { plan_id, is_active, search } = req.query;

    let query = `
      SELECT 
        mipa.id,
        mipa.plan_id,
        mipa.principal_amount,
        mipa.minimum_monthly_interest,
        mipa.maximum_monthly_interest,
        mipa.is_active,
        mipa.created_by,
        mipa.updated_by,
        mipa.created_at,
        mipa.updated_at,
        mip.plan_name,
        mip.plan_code,
        mip.plan_start_date,
        mip.plan_end_date,
        mip.interest_frequency,
        mip.status AS plan_status,
        (SELECT COUNT(*) FROM monthly_investment_subscriptions mis WHERE mis.plan_amount_id = mipa.id) AS subscriptions_count
      FROM monthly_investment_plan_amounts mipa
      JOIN monthly_investment_plans mip ON mipa.plan_id = mip.id
      WHERE 1=1
    `;
    const params = [];

    if (plan_id) {
      query += ` AND mipa.plan_id = ?`;
      params.push(Number(plan_id));
    }

    if (is_active !== undefined) {
      const activeBool =
        is_active === "true" || is_active === "1" || is_active === true;
      query += ` AND mipa.is_active = ?`;
      params.push(activeBool ? 1 : 0);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (mip.plan_name LIKE ? OR mip.plan_code LIKE ?)`;
      params.push(term, term);
    }

    query += ` ORDER BY mipa.plan_id ASC, mipa.principal_amount ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get all monthly investment plan amounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment plan amounts",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT PLAN AMOUNT BY ID
 */
export const getMonthlyInvestmentPlanAmountById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan amount ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        mipa.id,
        mipa.plan_id,
        mipa.principal_amount,
        mipa.minimum_monthly_interest,
        mipa.maximum_monthly_interest,
        mipa.is_active,
        mipa.created_by,
        mipa.updated_by,
        mipa.created_at,
        mipa.updated_at,
        mip.plan_name,
        mip.plan_code,
        mip.plan_start_date,
        mip.plan_end_date,
        mip.interest_frequency,
        mip.status AS plan_status,
        (SELECT COUNT(*) FROM monthly_investment_subscriptions mis WHERE mis.plan_amount_id = mipa.id) AS subscriptions_count
       FROM monthly_investment_plan_amounts mipa
       JOIN monthly_investment_plans mip ON mipa.plan_id = mip.id
       WHERE mipa.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan amount not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get monthly investment plan amount by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment plan amount",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT PLAN AMOUNTS BY PLAN ID
 */
export const getMonthlyInvestmentPlanAmountsByPlanId = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { all } = req.query;

    if (!plan_id || isNaN(plan_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan ID is required",
      });
    }

    const [plan] = await db.query(
      `SELECT id, plan_name, plan_code, plan_start_date, plan_end_date, interest_frequency, status 
       FROM monthly_investment_plans WHERE id = ?`,
      [Number(plan_id)]
    );

    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan not found",
      });
    }

    let query = `
      SELECT 
        id,
        plan_id,
        principal_amount,
        minimum_monthly_interest,
        maximum_monthly_interest,
        is_active,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM monthly_investment_subscriptions mis WHERE mis.plan_amount_id = monthly_investment_plan_amounts.id) AS subscriptions_count
      FROM monthly_investment_plan_amounts
      WHERE plan_id = ?
    `;
    const params = [Number(plan_id)];

    if (all !== "true" && all !== "1") {
      query += ` AND is_active = TRUE`;
    }

    query += ` ORDER BY principal_amount ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      plan: plan[0],
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get monthly investment plan amounts by plan id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching amounts for monthly investment plan",
    });
  }
};

/**
 * UPDATE MONTHLY INVESTMENT PLAN AMOUNT
 */
export const updateMonthlyInvestmentPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;
    let {
      plan_id,
      principal_amount,
      minimum_monthly_interest,
      maximum_monthly_interest,
      is_active,
      remarks,
    } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan amount ID is required",
      });
    }

    // 1. Check existing record
    const [existingRows] = await connection.query(
      `SELECT * FROM monthly_investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan amount not found",
      });
    }

    const oldData = existingRows[0];

    // 2. Check if subscriptions exist for this plan amount
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count 
       FROM monthly_investment_subscriptions 
       WHERE plan_amount_id = ?`,
      [Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    const hasSubscriptions = subscriptionCount > 0;

    // If subscriptions exist, prevent changing core financial terms
    if (hasSubscriptions) {
      const restrictedFields = [
        {
          key: "plan_id",
          label: "plan_id",
          isChanged: (newVal, oldVal) => Number(newVal) !== Number(oldVal),
        },
        {
          key: "principal_amount",
          label: "principal_amount",
          isChanged: (newVal, oldVal) =>
            Number(Number(newVal).toFixed(2)) !==
            Number(Number(oldVal).toFixed(2)),
        },
        {
          key: "minimum_monthly_interest",
          label: "minimum_monthly_interest",
          isChanged: (newVal, oldVal) =>
            Number(Number(newVal).toFixed(2)) !==
            Number(Number(oldVal).toFixed(2)),
        },
        {
          key: "maximum_monthly_interest",
          label: "maximum_monthly_interest",
          isChanged: (newVal, oldVal) =>
            Number(Number(newVal).toFixed(2)) !==
            Number(Number(oldVal).toFixed(2)),
        },
      ];

      const blockedFields = [];
      for (const field of restrictedFields) {
        if (
          req.body[field.key] !== undefined &&
          field.isChanged(req.body[field.key], oldData[field.key])
        ) {
          blockedFields.push(field.label);
        }
      }

      if (blockedFields.length > 0) {
        return res.status(400).json({
          success: false,
          code: "AMOUNT_HAS_ACTIVE_SUBSCRIPTIONS",
          message: `Cannot modify core financial fields (${blockedFields.join(", ")}) because this tier is in use by ${subscriptionCount} customer subscription(s). You can toggle its active status using PATCH /monthly-investment-plan-amounts/${id}/status or create a new amount tier.`,
        });
      }
    }

    // 3. Resolve target plan_id
    let targetPlanId = oldData.plan_id;
    if (plan_id !== undefined) {
      targetPlanId = Number(plan_id);
      if (isNaN(targetPlanId) || !Number.isInteger(targetPlanId) || targetPlanId <= 0) {
        return res.status(400).json({
          success: false,
          message: "plan_id must be a valid positive integer",
        });
      }

      if (targetPlanId !== oldData.plan_id) {
        const [targetPlan] = await connection.query(
          `SELECT id FROM monthly_investment_plans WHERE id = ?`,
          [targetPlanId]
        );
        if (targetPlan.length === 0) {
          return res.status(404).json({
            success: false,
            message: `Target monthly investment plan ID ${targetPlanId} not found`,
          });
        }
      }
    }

    // 4. Resolve target principal_amount
    let targetPrincipal = Number(oldData.principal_amount);
    if (principal_amount !== undefined) {
      targetPrincipal = Number(principal_amount);
      if (isNaN(targetPrincipal) || targetPrincipal <= 0) {
        return res.status(400).json({
          success: false,
          message: "principal_amount must be a valid positive number greater than 0",
        });
      }
      targetPrincipal = Number(targetPrincipal.toFixed(2));
    }

    // 5. Resolve target interest range
    let targetMinInterest = Number(oldData.minimum_monthly_interest);
    if (minimum_monthly_interest !== undefined) {
      targetMinInterest = Number(minimum_monthly_interest);
      if (isNaN(targetMinInterest) || targetMinInterest < 0) {
        return res.status(400).json({
          success: false,
          message: "minimum_monthly_interest must be a valid number >= 0",
        });
      }
      targetMinInterest = Number(targetMinInterest.toFixed(2));
    }

    let targetMaxInterest = Number(oldData.maximum_monthly_interest);
    if (maximum_monthly_interest !== undefined) {
      targetMaxInterest = Number(maximum_monthly_interest);
      if (isNaN(targetMaxInterest) || targetMaxInterest < targetMinInterest) {
        return res.status(400).json({
          success: false,
          message: "maximum_monthly_interest must be greater than or equal to minimum_monthly_interest",
        });
      }
      targetMaxInterest = Number(targetMaxInterest.toFixed(2));
    } else if (minimum_monthly_interest !== undefined && targetMaxInterest < targetMinInterest) {
      targetMaxInterest = targetMinInterest;
    }

    // 6. Check unique (plan_id, principal_amount) if changed
    if (
      targetPlanId !== oldData.plan_id ||
      targetPrincipal !== Number(oldData.principal_amount)
    ) {
      const [duplicate] = await connection.query(
        `SELECT id FROM monthly_investment_plan_amounts 
         WHERE plan_id = ? AND principal_amount = ? AND id != ?`,
        [targetPlanId, targetPrincipal, Number(id)]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Principal amount ₹${targetPrincipal} already exists for this monthly investment plan`,
        });
      }
    }

    // 7. Resolve target is_active
    let targetIsActive = oldData.is_active;
    if (is_active !== undefined) {
      targetIsActive =
        is_active === true ||
        is_active === "true" ||
        is_active === 1 ||
        is_active === "1";
    }

    // 8. Execute UPDATE
    await connection.query(
      `UPDATE monthly_investment_plan_amounts
       SET plan_id = ?,
           principal_amount = ?,
           minimum_monthly_interest = ?,
           maximum_monthly_interest = ?,
           is_active = ?,
           updated_by = ?
       WHERE id = ?`,
      [
        targetPlanId,
        targetPrincipal,
        targetMinInterest,
        targetMaxInterest,
        targetIsActive,
        userId,
        Number(id),
      ]
    );

    const [updatedRows] = await connection.query(
      `SELECT 
        mipa.*,
        mip.plan_name,
        mip.plan_code,
        mip.plan_start_date,
        mip.plan_end_date,
        mip.interest_frequency,
        mip.status AS plan_status
       FROM monthly_investment_plan_amounts mipa
       JOIN monthly_investment_plans mip ON mipa.plan_id = mip.id
       WHERE mipa.id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // 9. Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_plan_amounts",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Updated monthly investment plan amount ID ${id} (₹${targetPrincipal})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Monthly investment plan amount updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update monthly investment plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating monthly investment plan amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * TOGGLE ACTIVE STATUS (is_active: true / false)
 */
export const toggleMonthlyInvestmentPlanAmountStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { is_active, remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan amount ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM monthly_investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan amount not found",
      });
    }

    const oldData = rows[0];
    let newStatus;

    if (is_active !== undefined) {
      newStatus =
        is_active === true ||
        is_active === "true" ||
        is_active === 1 ||
        is_active === "1";
    } else {
      newStatus = !oldData.is_active;
    }

    await connection.query(
      `UPDATE monthly_investment_plan_amounts 
       SET is_active = ?, updated_by = ? 
       WHERE id = ?`,
      [newStatus, userId, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT 
        mipa.*,
        mip.plan_name,
        mip.plan_code
       FROM monthly_investment_plan_amounts mipa
       JOIN monthly_investment_plans mip ON mipa.plan_id = mip.id
       WHERE mipa.id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "monthly_investment_plan_amounts",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Toggled status of monthly investment plan amount ID ${id} to ${newStatus ? "ACTIVE" : "INACTIVE"}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Monthly investment plan amount ${newStatus ? "activated" : "deactivated"} successfully`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle monthly investment plan amount status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while toggling amount status",
    });
  } finally {
    connection.release();
  }
};

/**
 * DELETE MONTHLY INVESTMENT PLAN AMOUNT
 * Rejects deletion if referenced in monthly_investment_subscriptions.
 */
export const deleteMonthlyInvestmentPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan amount ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM monthly_investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan amount not found",
      });
    }

    const oldData = rows[0];

    // Safety validation: Check if referenced in monthly_investment_subscriptions
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count 
       FROM monthly_investment_subscriptions 
       WHERE plan_amount_id = ?`,
      [Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    if (subscriptionCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIBED_AMOUNT",
        message: `Cannot delete monthly investment plan amount ₹${oldData.principal_amount}: It is in use by ${subscriptionCount} customer subscription(s). Deactivate it instead using PATCH /monthly-investment-plan-amounts/${id}/status.`,
      });
    }

    // Delete record
    await connection.query(
      `DELETE FROM monthly_investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    // Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_plan_amounts",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks:
        remarks ||
        `Deleted monthly investment plan amount ID ${id} (₹${oldData.principal_amount})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Monthly investment plan amount deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete monthly investment plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting monthly investment plan amount",
    });
  } finally {
    connection.release();
  }
};
