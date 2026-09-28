import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import {
  generateMeaningfulPlanCode,
  createPlanSlug,
} from "../../../../utils/generateInvestmentPlanCode.js";

const VALID_INVESTMENT_TYPES = ["SINGLE"];
const VALID_INTEREST_FREQUENCIES = ["WEEKLY"];
const VALID_PAYOUT_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const VALID_INTEREST_START_RULES = ["AFTER_LOCK_IN"];
const VALID_FINAL_PAYOUT_TYPES = ["INTEREST_PLUS_PRINCIPAL"];
const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

/**
 * CREATE INVESTMENT PLAN
 * Auto-generates a meaningful plan_code from plan_name if not provided.
 * Optionally allows bulk initial amounts via `amounts` array.
 */
export const createInvestmentPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      plan_name,
      plan_code,
      investment_type = "SINGLE",
      lock_in_days = 106,
      interest_frequency = "WEEKLY",
      payout_day = "SATURDAY",
      interest_start_rule = "AFTER_LOCK_IN",
      final_payout_type = "INTEREST_PLUS_PRINCIPAL",
      status = "ACTIVE",
      description = null,
      amounts = [],
      remarks,
    } = req.body;

    const userId = req.user?.id || null;

    // 1. Validate plan_name
    if (!plan_name || typeof plan_name !== "string" || !plan_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "plan_name is required",
      });
    }

    plan_name = plan_name.trim();
    if (plan_name.length > 150) {
      return res.status(400).json({
        success: false,
        message: "plan_name must not exceed 150 characters",
      });
    }

    // Check duplicate plan_name
    const [existingName] = await connection.query(
      `SELECT id FROM investment_plans WHERE plan_name = ?`,
      [plan_name]
    );

    if (existingName.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Investment plan with name "${plan_name}" already exists`,
      });
    }

    // 2. Auto-generate or sanitize plan_code
    if (!plan_code || typeof plan_code !== "string" || !plan_code.trim()) {
      plan_code = await generateMeaningfulPlanCode(plan_name, connection);
    } else {
      plan_code = plan_code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-_]/g, "")
        .slice(0, 50);

      if (!plan_code) {
        plan_code = await generateMeaningfulPlanCode(plan_name, connection);
      } else {
        // Check duplicate plan_code
        const [existingCode] = await connection.query(
          `SELECT id FROM investment_plans WHERE plan_code = ?`,
          [plan_code]
        );

        if (existingCode.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Investment plan with code "${plan_code}" already exists`,
          });
        }
      }
    }

    // 3. Validate lock_in_days
    lock_in_days = Number(lock_in_days);
    if (isNaN(lock_in_days) || !Number.isInteger(lock_in_days) || lock_in_days <= 0) {
      return res.status(400).json({
        success: false,
        message: "lock_in_days must be a positive integer greater than 0",
      });
    }

    // 4. Validate ENUMs
    investment_type = String(investment_type).toUpperCase();
    if (!VALID_INVESTMENT_TYPES.includes(investment_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid investment_type. Allowed: ${VALID_INVESTMENT_TYPES.join(", ")}`,
      });
    }

    interest_frequency = String(interest_frequency).toUpperCase();
    if (!VALID_INTEREST_FREQUENCIES.includes(interest_frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interest_frequency. Allowed: ${VALID_INTEREST_FREQUENCIES.join(", ")}`,
      });
    }

    payout_day = String(payout_day).toUpperCase();
    if (!VALID_PAYOUT_DAYS.includes(payout_day)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payout_day. Allowed: ${VALID_PAYOUT_DAYS.join(", ")}`,
      });
    }

    interest_start_rule = String(interest_start_rule).toUpperCase();
    if (!VALID_INTEREST_START_RULES.includes(interest_start_rule)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interest_start_rule. Allowed: ${VALID_INTEREST_START_RULES.join(", ")}`,
      });
    }

    final_payout_type = String(final_payout_type).toUpperCase();
    if (!VALID_FINAL_PAYOUT_TYPES.includes(final_payout_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid final_payout_type. Allowed: ${VALID_FINAL_PAYOUT_TYPES.join(", ")}`,
      });
    }

    status = String(status).toUpperCase();
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // 5. Insert investment_plans
    const [result] = await connection.query(
      `INSERT INTO investment_plans (
        plan_name,
        plan_code,
        investment_type,
        lock_in_days,
        interest_frequency,
        payout_day,
        interest_start_rule,
        final_payout_type,
        status,
        description,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan_name,
        plan_code,
        investment_type,
        lock_in_days,
        interest_frequency,
        payout_day,
        interest_start_rule,
        final_payout_type,
        status,
        description || null,
        userId,
      ]
    );

    const planId = result.insertId;

    // 6. Handle optional initial amounts
    const insertedAmounts = [];
    if (Array.isArray(amounts) && amounts.length > 0) {
      const seenPrincipals = new Set();

      for (const item of amounts) {
        const principal = Number(item.principal_amount);
        if (isNaN(principal) || principal <= 0) {
          return res.status(400).json({
            success: false,
            message: "Each amount item must have a valid principal_amount > 0",
          });
        }

        const normalizedPrincipal = Number(principal.toFixed(2));
        if (seenPrincipals.has(normalizedPrincipal)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate principal_amount ₹${normalizedPrincipal} in initial amounts list`,
          });
        }
        seenPrincipals.add(normalizedPrincipal);

        const minInterest = Number(item.minimum_interest_amount || 0);
        const maxInterest = Number(
          item.maximum_interest_amount !== undefined
            ? item.maximum_interest_amount
            : minInterest
        );

        if (isNaN(minInterest) || minInterest < 0) {
          return res.status(400).json({
            success: false,
            message: "minimum_interest_amount must be >= 0",
          });
        }

        if (isNaN(maxInterest) || maxInterest < minInterest) {
          return res.status(400).json({
            success: false,
            message: "maximum_interest_amount must be greater than or equal to minimum_interest_amount",
          });
        }

        const isActive =
          item.is_active === undefined
            ? true
            : item.is_active === true ||
              item.is_active === "true" ||
              item.is_active === 1;

        const [amountResult] = await connection.query(
          `INSERT INTO investment_plan_amounts (
            plan_id,
            principal_amount,
            minimum_interest_amount,
            maximum_interest_amount,
            is_active,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            planId,
            normalizedPrincipal,
            Number(minInterest.toFixed(2)),
            Number(maxInterest.toFixed(2)),
            isActive,
            userId,
          ]
        );

        const [insertedAmountRow] = await connection.query(
          `SELECT * FROM investment_plan_amounts WHERE id = ?`,
          [amountResult.insertId]
        );

        insertedAmounts.push(insertedAmountRow[0]);

        // Audit log for each inserted amount
        await AuditLog({
          connection,
          table: "investment_plan_amounts",
          recordId: amountResult.insertId,
          action: "INSERT",
          newData: insertedAmountRow[0],
          userId,
          remarks: `Initial plan amount ₹${normalizedPrincipal} for plan ${plan_name}`,
        });
      }
    }

    // 7. Fetch newly created plan
    const [newPlanRows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [planId]
    );

    const newPlan = newPlanRows[0];
    newPlan.amounts = insertedAmounts;

    // 8. Audit log for plan
    await AuditLog({
      connection,
      table: "investment_plans",
      recordId: planId,
      action: "INSERT",
      newData: newPlan,
      userId,
      remarks: remarks || `Created investment plan "${plan_name}" (${plan_code})`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Investment plan created successfully",
      data: newPlan,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create investment plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating investment plan",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL INVESTMENT PLANS
 * Optional query filters: status, search, include_amounts
 */
export const getAllInvestmentPlans = async (req, res) => {
  try {
    const { status, search, include_amounts = "true" } = req.query;

    let query = `
      SELECT 
        ip.id,
        ip.plan_name,
        ip.plan_code,
        ip.investment_type,
        ip.lock_in_days,
        ip.interest_frequency,
        ip.payout_day,
        ip.interest_start_rule,
        ip.final_payout_type,
        ip.status,
        ip.description,
        ip.created_by,
        ip.updated_by,
        ip.created_at,
        ip.updated_at,
        (SELECT COUNT(*) FROM investment_plan_amounts ipa WHERE ipa.plan_id = ip.id) AS total_amounts_count,
        (SELECT COUNT(*) FROM investment_plan_amounts ipa WHERE ipa.plan_id = ip.id AND ipa.is_active = TRUE) AS active_amounts_count
      FROM investment_plans ip
      WHERE 1=1
    `;
    const params = [];

    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      query += ` AND ip.status = ?`;
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (ip.plan_name LIKE ? OR ip.plan_code LIKE ? OR ip.description LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY ip.id DESC`;

    const [plans] = await db.query(query, params);

    // Optionally attach amounts to each plan
    if (include_amounts === "true" || include_amounts === true) {
      for (const plan of plans) {
        const [amounts] = await db.query(
          `SELECT 
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
          ORDER BY principal_amount ASC`,
          [plan.id]
        );
        plan.amounts = amounts;
      }
    }

    return res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    console.error("Get all investment plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment plans",
    });
  }
};

/**
 * GET INVESTMENT PLAN BY ID
 */
export const getInvestmentPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan ID is required",
      });
    }

    const [plans] = await db.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    const plan = plans[0];

    // Fetch associated amounts
    const [amounts] = await db.query(
      `SELECT 
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
      ORDER BY principal_amount ASC`,
      [plan.id]
    );

    plan.amounts = amounts;

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Get investment plan by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment plan",
    });
  }
};

/**
 * UPDATE INVESTMENT PLAN
 */
export const updateInvestmentPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan ID is required",
      });
    }

    // 1. Check existing record
    const [existingRows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    const oldData = existingRows[0];

    // 2. Check if subscriptions exist for this plan
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count 
       FROM investment_subscriptions 
       WHERE plan_id = ?`,
      [Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    const hasSubscriptions = subscriptionCount > 0;

    // If subscriptions exist, prevent changing core financial and contract fields
    if (hasSubscriptions) {
      const restrictedFields = [
        {
          key: "lock_in_days",
          label: "lock_in_days",
          isChanged: (newVal, oldVal) => Number(newVal) !== Number(oldVal),
        },
        {
          key: "plan_code",
          label: "plan_code",
          isChanged: (newVal, oldVal) =>
            String(newVal).trim().toUpperCase() !==
            String(oldVal).trim().toUpperCase(),
        },
        {
          key: "investment_type",
          label: "investment_type",
          isChanged: (newVal, oldVal) =>
            String(newVal).trim().toUpperCase() !==
            String(oldVal).trim().toUpperCase(),
        },
        {
          key: "interest_frequency",
          label: "interest_frequency",
          isChanged: (newVal, oldVal) =>
            String(newVal).trim().toUpperCase() !==
            String(oldVal).trim().toUpperCase(),
        },
        {
          key: "payout_day",
          label: "payout_day",
          isChanged: (newVal, oldVal) =>
            String(newVal).trim().toUpperCase() !==
            String(oldVal).trim().toUpperCase(),
        },
        {
          key: "interest_start_rule",
          label: "interest_start_rule",
          isChanged: (newVal, oldVal) =>
            String(newVal).trim().toUpperCase() !==
            String(oldVal).trim().toUpperCase(),
        },
        {
          key: "final_payout_type",
          label: "final_payout_type",
          isChanged: (newVal, oldVal) =>
            String(newVal).trim().toUpperCase() !==
            String(oldVal).trim().toUpperCase(),
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
          code: "PLAN_HAS_ACTIVE_SUBSCRIPTIONS",
          message: `Cannot modify important contract fields (${blockedFields.join(", ")}) because this plan is linked to ${subscriptionCount} customer subscription(s). You can only update non-financial fields (description, plan_name, status).`,
        });
      }
    }

    let {
      plan_name,
      plan_code,
      investment_type,
      lock_in_days,
      interest_frequency,
      payout_day,
      interest_start_rule,
      final_payout_type,
      status,
      description,
      remarks,
    } = req.body;

    // Normalize plan_name
    let targetPlanName = oldData.plan_name;
    if (plan_name !== undefined) {
      if (!plan_name || typeof plan_name !== "string" || !plan_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "plan_name cannot be empty",
        });
      }
      targetPlanName = plan_name.trim();

      // Check unique plan_name
      if (targetPlanName !== oldData.plan_name) {
        const [duplicateName] = await connection.query(
          `SELECT id FROM investment_plans WHERE plan_name = ? AND id != ?`,
          [targetPlanName, Number(id)]
        );
        if (duplicateName.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Another investment plan with name "${targetPlanName}" already exists`,
          });
        }
      }
    }

    // Normalize plan_code
    let targetPlanCode = oldData.plan_code;
    if (plan_code !== undefined) {
      if (!plan_code || typeof plan_code !== "string" || !plan_code.trim()) {
        return res.status(400).json({
          success: false,
          message: "plan_code cannot be empty",
        });
      }
      targetPlanCode = plan_code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-_]/g, "")
        .slice(0, 50);

      // Check unique plan_code
      if (targetPlanCode !== oldData.plan_code) {
        const [duplicateCode] = await connection.query(
          `SELECT id FROM investment_plans WHERE plan_code = ? AND id != ?`,
          [targetPlanCode, Number(id)]
        );
        if (duplicateCode.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Another investment plan with code "${targetPlanCode}" already exists`,
          });
        }
      }
    }

    // Normalize lock_in_days
    let targetLockInDays = oldData.lock_in_days;
    if (lock_in_days !== undefined) {
      targetLockInDays = Number(lock_in_days);
      if (isNaN(targetLockInDays) || !Number.isInteger(targetLockInDays) || targetLockInDays <= 0) {
        return res.status(400).json({
          success: false,
          message: "lock_in_days must be a positive integer greater than 0",
        });
      }
    }

    // Normalize ENUMs
    let targetInvestmentType = oldData.investment_type;
    if (investment_type !== undefined) {
      targetInvestmentType = String(investment_type).toUpperCase();
      if (!VALID_INVESTMENT_TYPES.includes(targetInvestmentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid investment_type. Allowed: ${VALID_INVESTMENT_TYPES.join(", ")}`,
        });
      }
    }

    let targetInterestFrequency = oldData.interest_frequency;
    if (interest_frequency !== undefined) {
      targetInterestFrequency = String(interest_frequency).toUpperCase();
      if (!VALID_INTEREST_FREQUENCIES.includes(targetInterestFrequency)) {
        return res.status(400).json({
          success: false,
          message: `Invalid interest_frequency. Allowed: ${VALID_INTEREST_FREQUENCIES.join(", ")}`,
        });
      }
    }

    let targetPayoutDay = oldData.payout_day;
    if (payout_day !== undefined) {
      targetPayoutDay = String(payout_day).toUpperCase();
      if (!VALID_PAYOUT_DAYS.includes(targetPayoutDay)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payout_day. Allowed: ${VALID_PAYOUT_DAYS.join(", ")}`,
        });
      }
    }

    let targetInterestStartRule = oldData.interest_start_rule;
    if (interest_start_rule !== undefined) {
      targetInterestStartRule = String(interest_start_rule).toUpperCase();
      if (!VALID_INTEREST_START_RULES.includes(targetInterestStartRule)) {
        return res.status(400).json({
          success: false,
          message: `Invalid interest_start_rule. Allowed: ${VALID_INTEREST_START_RULES.join(", ")}`,
        });
      }
    }

    let targetFinalPayoutType = oldData.final_payout_type;
    if (final_payout_type !== undefined) {
      targetFinalPayoutType = String(final_payout_type).toUpperCase();
      if (!VALID_FINAL_PAYOUT_TYPES.includes(targetFinalPayoutType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid final_payout_type. Allowed: ${VALID_FINAL_PAYOUT_TYPES.join(", ")}`,
        });
      }
    }

    let targetStatus = oldData.status;
    if (status !== undefined) {
      targetStatus = String(status).toUpperCase();
      if (!VALID_STATUSES.includes(targetStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
        });
      }
    }

    let targetDescription = description !== undefined ? description : oldData.description;

    // 2. Perform Update
    await connection.query(
      `UPDATE investment_plans
       SET plan_name = ?,
           plan_code = ?,
           investment_type = ?,
           lock_in_days = ?,
           interest_frequency = ?,
           payout_day = ?,
           interest_start_rule = ?,
           final_payout_type = ?,
           status = ?,
           description = ?,
           updated_by = ?
       WHERE id = ?`,
      [
        targetPlanName,
        targetPlanCode,
        targetInvestmentType,
        targetLockInDays,
        targetInterestFrequency,
        targetPayoutDay,
        targetInterestStartRule,
        targetFinalPayoutType,
        targetStatus,
        targetDescription,
        userId,
        Number(id),
      ]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // 3. Audit Log
    await AuditLog({
      connection,
      table: "investment_plans",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Updated investment plan ID ${id} (${updatedData.plan_name})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Investment plan updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update investment plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating investment plan",
    });
  } finally {
    connection.release();
  }
};

/**
 * TOGGLE STATUS (ACTIVE / INACTIVE)
 */
export const toggleInvestmentPlanStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    const oldData = rows[0];
    const newStatus = status
      ? String(status).toUpperCase()
      : oldData.status === "ACTIVE"
      ? "INACTIVE"
      : "ACTIVE";

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
      });
    }

    await connection.query(
      `UPDATE investment_plans SET status = ?, updated_by = ? WHERE id = ?`,
      [newStatus, userId, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "investment_plans",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Changed status of investment plan ID ${id} to ${newStatus}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Investment plan ${newStatus.toLowerCase()} successfully`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle investment plan status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while toggling plan status",
    });
  } finally {
    connection.release();
  }
};

/**
 * DELETE INVESTMENT PLAN
 * Rejects deletion if linked to existing investment subscriptions.
 */
export const deleteInvestmentPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid investment plan ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    const oldData = rows[0];

    // Safety check: is plan used in investment_subscriptions?
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count FROM investment_subscriptions WHERE plan_id = ?`,
      [Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    if (subscriptionCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIBED_PLAN",
        message: `Cannot delete investment plan "${oldData.plan_name}" (${oldData.plan_code}) because it has ${subscriptionCount} associated customer subscription(s). Set its status to INACTIVE instead using PATCH /investment-plans/${id}/status.`,
      });
    }

    // Also check if any child plan amount is used in subscriptions
    const [subAmounts] = await connection.query(
      `SELECT COUNT(*) AS amount_sub_count 
       FROM investment_subscriptions s
       JOIN investment_plan_amounts pa ON s.plan_amount_id = pa.id
       WHERE pa.plan_id = ?`,
      [Number(id)]
    );

    const amountSubCount = subAmounts[0]?.amount_sub_count || 0;
    if (amountSubCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIBED_PLAN",
        message: `Cannot delete investment plan "${oldData.plan_name}": ${amountSubCount} subscription(s) exist under its amount tiers. Deactivate the plan instead.`,
      });
    }

    // Delete associated plan amounts first
    await connection.query(
      `DELETE FROM investment_plan_amounts WHERE plan_id = ?`,
      [Number(id)]
    );

    // Delete plan
    await connection.query(
      `DELETE FROM investment_plans WHERE id = ?`,
      [Number(id)]
    );

    // Audit Log
    await AuditLog({
      connection,
      table: "investment_plans",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || `Deleted investment plan ID ${id} (${oldData.plan_name})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Investment plan deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete investment plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting investment plan",
    });
  } finally {
    connection.release();
  }
};

/**
 * PREVIEW AUTO-GENERATED PLAN CODE
 * Useful for frontend form previews before submitting.
 * Endpoint: GET /investment-plans/preview-code?plan_name=Diamond+Growth
 */
export const previewInvestmentPlanCode = async (req, res) => {
  try {
    const { plan_name } = req.query;

    if (!plan_name || !plan_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "plan_name query parameter is required",
      });
    }

    const code = await generateMeaningfulPlanCode(plan_name, db);
    const slug = createPlanSlug(plan_name);

    return res.status(200).json({
      success: true,
      plan_name,
      base_slug: slug,
      suggested_plan_code: code,
    });
  } catch (error) {
    console.error("Preview plan code error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while previewing plan code",
    });
  }
};
