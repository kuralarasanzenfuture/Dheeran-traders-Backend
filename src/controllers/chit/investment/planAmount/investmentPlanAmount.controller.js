import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";

/**
 * CREATE INVESTMENT PLAN AMOUNT
 */
export const createInvestmentPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      plan_id,
      principal_amount,
      minimum_interest_amount = 0.0,
      maximum_interest_amount = 0.0,
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
      `SELECT id, plan_name, plan_code, lock_in_days, interest_frequency, payout_day, status 
       FROM investment_plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Investment plan with ID ${plan_id} not found`,
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
    minimum_interest_amount = Number(minimum_interest_amount);
    if (isNaN(minimum_interest_amount) || minimum_interest_amount < 0) {
      return res.status(400).json({
        success: false,
        message: "minimum_interest_amount must be a valid number >= 0",
      });
    }
    minimum_interest_amount = Number(minimum_interest_amount.toFixed(2));

    if (maximum_interest_amount === undefined || maximum_interest_amount === null) {
      maximum_interest_amount = minimum_interest_amount;
    } else {
      maximum_interest_amount = Number(maximum_interest_amount);
      if (isNaN(maximum_interest_amount) || maximum_interest_amount < minimum_interest_amount) {
        return res.status(400).json({
          success: false,
          message: "maximum_interest_amount must be greater than or equal to minimum_interest_amount",
        });
      }
      maximum_interest_amount = Number(maximum_interest_amount.toFixed(2));
    }

    // Normalize boolean
    is_active =
      is_active === true ||
      is_active === "true" ||
      is_active === 1 ||
      is_active === "1";

    // 6. Duplicate check: unique (plan_id, principal_amount)
    const [exists] = await connection.query(
      `SELECT id FROM investment_plan_amounts 
       WHERE plan_id = ? AND principal_amount = ?`,
      [plan_id, principal_amount]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Principal amount ₹${principal_amount} already exists for investment plan "${planRows[0].plan_name}" (ID ${plan_id})`,
      });
    }

    // 7. Insert
    const [result] = await connection.query(
      `INSERT INTO investment_plan_amounts (
        plan_id,
        principal_amount,
        minimum_interest_amount,
        maximum_interest_amount,
        is_active,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        plan_id,
        principal_amount,
        minimum_interest_amount,
        maximum_interest_amount,
        is_active,
        userId,
      ]
    );

    const [newRows] = await connection.query(
      `SELECT 
        ipa.*,
        ip.plan_name,
        ip.plan_code,
        ip.lock_in_days,
        ip.interest_frequency,
        ip.payout_day,
        ip.status AS plan_status
       FROM investment_plan_amounts ipa
       JOIN investment_plans ip ON ipa.plan_id = ip.id
       WHERE ipa.id = ?`,
      [result.insertId]
    );

    const newRecord = newRows[0];

    // 8. Audit Log
    await AuditLog({
      connection,
      table: "investment_plan_amounts",
      recordId: result.insertId,
      action: "INSERT",
      newData: newRecord,
      userId,
      remarks:
        remarks ||
        `Created investment plan amount ₹${principal_amount} for plan "${planRows[0].plan_name}"`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Investment plan amount created successfully",
      data: newRecord,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create investment plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating investment plan amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL INVESTMENT PLAN AMOUNTS
 * Optional filters: plan_id, is_active, search
 */
export const getAllInvestmentPlanAmounts = async (req, res) => {
  try {
    const { plan_id, is_active, search } = req.query;

    let query = `
      SELECT 
        ipa.id,
        ipa.plan_id,
        ipa.principal_amount,
        ipa.minimum_interest_amount,
        ipa.maximum_interest_amount,
        ipa.is_active,
        ipa.created_by,
        ipa.updated_by,
        ipa.created_at,
        ipa.updated_at,
        ip.plan_name,
        ip.plan_code,
        ip.lock_in_days,
        ip.interest_frequency,
        ip.payout_day,
        ip.status AS plan_status
      FROM investment_plan_amounts ipa
      JOIN investment_plans ip ON ipa.plan_id = ip.id
      WHERE 1=1
    `;
    const params = [];

    if (plan_id) {
      query += ` AND ipa.plan_id = ?`;
      params.push(Number(plan_id));
    }

    if (is_active !== undefined) {
      const activeBool =
        is_active === "true" || is_active === "1" || is_active === true;
      query += ` AND ipa.is_active = ?`;
      params.push(activeBool ? 1 : 0);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (ip.plan_name LIKE ? OR ip.plan_code LIKE ?)`;
      params.push(term, term);
    }

    query += ` ORDER BY ipa.plan_id ASC, ipa.principal_amount ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get all investment plan amounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment plan amounts",
    });
  }
};

/**
 * GET INVESTMENT PLAN AMOUNT BY ID
 */
export const getInvestmentPlanAmountById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan amount ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        ipa.id,
        ipa.plan_id,
        ipa.principal_amount,
        ipa.minimum_interest_amount,
        ipa.maximum_interest_amount,
        ipa.is_active,
        ipa.created_by,
        ipa.updated_by,
        ipa.created_at,
        ipa.updated_at,
        ip.plan_name,
        ip.plan_code,
        ip.lock_in_days,
        ip.interest_frequency,
        ip.payout_day,
        ip.status AS plan_status
       FROM investment_plan_amounts ipa
       JOIN investment_plans ip ON ipa.plan_id = ip.id
       WHERE ipa.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan amount not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get investment plan amount by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment plan amount",
    });
  }
};

/**
 * GET AMOUNTS BY PLAN ID (Convenience endpoint)
 */
export const getInvestmentPlanAmountsByPlanId = async (req, res) => {
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
      `SELECT id, plan_name, plan_code, lock_in_days, interest_frequency, payout_day, status 
       FROM investment_plans WHERE id = ?`,
      [Number(plan_id)]
    );

    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    let query = `
      SELECT 
        id,
        plan_id,
        principal_amount,
        minimum_interest_amount,
        maximum_interest_amount,
        is_active,
        created_at,
        updated_at
      FROM investment_plan_amounts
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
    console.error("Get investment plan amounts by plan id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching amounts for plan",
    });
  }
};

/**
 * UPDATE INVESTMENT PLAN AMOUNT
 */
export const updateInvestmentPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;
    let {
      plan_id,
      principal_amount,
      minimum_interest_amount,
      maximum_interest_amount,
      is_active,
      remarks,
    } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan amount ID is required",
      });
    }

    // 1. Check existing record
    const [existingRows] = await connection.query(
      `SELECT * FROM investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan amount not found",
      });
    }

    const oldData = existingRows[0];

    // 2. Check if subscriptions exist for this plan amount
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count 
       FROM investment_subscriptions 
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
          key: "minimum_interest_amount",
          label: "minimum_interest_amount",
          isChanged: (newVal, oldVal) =>
            Number(Number(newVal).toFixed(2)) !==
            Number(Number(oldVal).toFixed(2)),
        },
        {
          key: "maximum_interest_amount",
          label: "maximum_interest_amount",
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
          code: "AMOUNT_TIER_HAS_ACTIVE_SUBSCRIPTIONS",
          message: `Cannot modify important financial terms (${blockedFields.join(", ")}) because this amount tier is linked to ${subscriptionCount} customer subscription(s). You can deactivate this tier using PATCH /investment-plan-amounts/${id}/status so new subscriptions cannot select it.`,
        });
      }
    }

    // 3. Normalize and validate plan_id
    const targetPlanId =
      plan_id !== undefined && plan_id !== null
        ? Number(plan_id)
        : oldData.plan_id;

    if (isNaN(targetPlanId) || !Number.isInteger(targetPlanId) || targetPlanId <= 0) {
      return res.status(400).json({
        success: false,
        message: "plan_id must be a valid positive integer",
      });
    }

    if (targetPlanId !== oldData.plan_id) {
      const [targetPlan] = await connection.query(
        `SELECT id FROM investment_plans WHERE id = ?`,
        [targetPlanId]
      );
      if (targetPlan.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Investment plan with ID ${targetPlanId} not found`,
        });
      }
    }

    // 3. Normalize principal_amount
    let targetPrincipal = Number(oldData.principal_amount);
    if (principal_amount !== undefined && principal_amount !== null) {
      targetPrincipal = Number(principal_amount);
      if (isNaN(targetPrincipal) || targetPrincipal <= 0) {
        return res.status(400).json({
          success: false,
          message: "principal_amount must be a valid positive number greater than 0",
        });
      }
      targetPrincipal = Number(targetPrincipal.toFixed(2));
    }

    // 4. Normalize minimum_interest_amount
    let targetMinInterest = Number(oldData.minimum_interest_amount);
    if (
      minimum_interest_amount !== undefined &&
      minimum_interest_amount !== null
    ) {
      targetMinInterest = Number(minimum_interest_amount);
      if (isNaN(targetMinInterest) || targetMinInterest < 0) {
        return res.status(400).json({
          success: false,
          message: "minimum_interest_amount must be a valid number >= 0",
        });
      }
      targetMinInterest = Number(targetMinInterest.toFixed(2));
    }

    // 5. Normalize maximum_interest_amount
    let targetMaxInterest = Number(oldData.maximum_interest_amount);
    if (
      maximum_interest_amount !== undefined &&
      maximum_interest_amount !== null
    ) {
      targetMaxInterest = Number(maximum_interest_amount);
      if (isNaN(targetMaxInterest) || targetMaxInterest < targetMinInterest) {
        return res.status(400).json({
          success: false,
          message: "maximum_interest_amount must be greater than or equal to minimum_interest_amount",
        });
      }
      targetMaxInterest = Number(targetMaxInterest.toFixed(2));
    } else if (targetMinInterest > targetMaxInterest) {
      targetMaxInterest = targetMinInterest;
    }

    // 6. Normalize is_active
    let targetIsActive = oldData.is_active;
    if (is_active !== undefined && is_active !== null) {
      targetIsActive =
        is_active === true ||
        is_active === "true" ||
        is_active === 1 ||
        is_active === "1";
    }

    // 7. Duplicate check if plan_id or principal_amount changed
    if (
      targetPlanId !== oldData.plan_id ||
      targetPrincipal !== Number(oldData.principal_amount)
    ) {
      const [duplicate] = await connection.query(
        `SELECT id FROM investment_plan_amounts 
         WHERE plan_id = ? AND principal_amount = ? AND id != ?`,
        [targetPlanId, targetPrincipal, Number(id)]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Principal amount ₹${targetPrincipal} already exists for investment plan ID ${targetPlanId}`,
        });
      }
    }

    // 8. Update
    await connection.query(
      `UPDATE investment_plan_amounts
       SET plan_id = ?,
           principal_amount = ?,
           minimum_interest_amount = ?,
           maximum_interest_amount = ?,
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
        ipa.*,
        ip.plan_name,
        ip.plan_code,
        ip.lock_in_days,
        ip.interest_frequency,
        ip.payout_day,
        ip.status AS plan_status
       FROM investment_plan_amounts ipa
       JOIN investment_plans ip ON ipa.plan_id = ip.id
       WHERE ipa.id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // 9. Audit Log
    await AuditLog({
      connection,
      table: "investment_plan_amounts",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Updated investment plan amount ID ${id}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Investment plan amount updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update investment plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating investment plan amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * TOGGLE INVESTMENT PLAN AMOUNT STATUS (ACTIVE / INACTIVE)
 */
export const toggleInvestmentPlanAmountStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { is_active, remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan amount ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan amount not found",
      });
    }

    const oldData = rows[0];
    const newStatus =
      is_active !== undefined
        ? is_active === true ||
          is_active === "true" ||
          is_active === 1 ||
          is_active === "1"
        : !oldData.is_active;

    await connection.query(
      `UPDATE investment_plan_amounts 
       SET is_active = ?, updated_by = ? 
       WHERE id = ?`,
      [newStatus, userId, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "investment_plan_amounts",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Toggled investment plan amount ID ${id} to ${newStatus ? "ACTIVE" : "INACTIVE"}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Investment plan amount ${newStatus ? "activated" : "deactivated"} successfully`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle investment plan amount status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while toggling status",
    });
  } finally {
    connection.release();
  }
};

/**
 * DELETE INVESTMENT PLAN AMOUNT
 * Rejects deletion if linked to existing investment subscriptions.
 */
export const deleteInvestmentPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan amount ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan amount not found",
      });
    }

    const oldData = rows[0];

    // Safety validation: Check if referenced in investment_subscriptions
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count 
       FROM investment_subscriptions 
       WHERE plan_amount_id = ?`,
      [Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    if (subscriptionCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIBED_AMOUNT",
        message: `Cannot delete plan amount ₹${oldData.principal_amount}: It is in use by ${subscriptionCount} active customer subscription(s). Deactivate it instead using PATCH /investment-plan-amounts/${id}/status.`,
      });
    }

    // Delete record
    await connection.query(
      `DELETE FROM investment_plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    // Audit Log
    await AuditLog({
      connection,
      table: "investment_plan_amounts",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || `Deleted investment plan amount ID ${id}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Investment plan amount deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete investment plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting investment plan amount",
    });
  } finally {
    connection.release();
  }
};
