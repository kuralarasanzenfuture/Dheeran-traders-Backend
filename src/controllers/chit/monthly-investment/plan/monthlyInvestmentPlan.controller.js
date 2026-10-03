import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import {
  generateMeaningfulMonthlyPlanCode,
  createPlanSlug,
} from "../../../../utils/generateMonthlyInvestmentPlanCode.js";

export const DEFAULT_INTEREST_PAYMENT_DAYS = "1, 5, 10, 15, 20, 25, 30";
export const DEFAULT_INTEREST_PAYMENT_DAYS_ARRAY = [1, 5, 10, 15, 20, 25, 30];

export const VALID_INTEREST_FREQUENCIES = ["MONTHLY"];
export const VALID_INTEREST_CALCULATIONS = ["MONTHLY_PERIOD"];
export const VALID_FINAL_PAYOUT_TYPES = ["INTEREST_PLUS_PRINCIPAL"];
export const VALID_STATUSES = ["DRAFT", "ACTIVE", "CLOSED", "INACTIVE"];

/**
 * Validates and formats interest_payment_days into a clean, sorted, deduplicated string:
 * e.g., [1, 5, 10, 15, 20, 25, 30] -> "1, 5, 10, 15, 20, 25, 30"
 * or "1, 15, 5" -> "1, 5, 15"
 */
export const sanitizeInterestPaymentDays = (input) => {
  if (input === undefined || input === null || input === "") {
    return {
      isValid: true,
      formattedString: DEFAULT_INTEREST_PAYMENT_DAYS,
      daysArray: [...DEFAULT_INTEREST_PAYMENT_DAYS_ARRAY],
    };
  }

  let days = [];
  if (Array.isArray(input)) {
    days = input.map((d) => parseInt(d, 10));
  } else if (typeof input === "string") {
    days = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((d) => parseInt(d, 10));
  } else if (typeof input === "number") {
    days = [parseInt(input, 10)];
  } else {
    return {
      isValid: false,
      message:
        "interest_payment_days must be a comma-separated string (e.g. '1, 5, 10, 15, 20, 25, 30') or an array of numbers [1, 5, 10, 15, 20, 25, 30]",
    };
  }

  if (days.length === 0) {
    return {
      isValid: false,
      message: "interest_payment_days cannot be empty if specified",
    };
  }

  const validDays = [];
  for (const day of days) {
    if (isNaN(day) || day < 1 || day > 31) {
      return {
        isValid: false,
        message: `Invalid day "${day}" in interest_payment_days. Days must be integers between 1 and 31`,
      };
    }
    validDays.push(day);
  }

  const uniqueSortedDays = Array.from(new Set(validDays)).sort((a, b) => a - b);
  const formattedString = uniqueSortedDays.join(", ");

  return {
    isValid: true,
    formattedString,
    daysArray: uniqueSortedDays,
  };
};

/**
 * Parses interest_payment_days string into array of numbers
 */
export const parseInterestPaymentDays = (str) => {
  if (!str || typeof str !== "string") {
    return [...DEFAULT_INTEREST_PAYMENT_DAYS_ARRAY];
  }
  return str
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 31);
};

/**
 * Validates a YYYY-MM-DD date string.
 */
const isValidDateString = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

/**
 * Normalizes Date object or date string to YYYY-MM-DD for reliable comparison
 */
const normalizeDate = (d) => {
  if (!d) return "";
  if (d instanceof Date) {
    return d.toISOString().split("T")[0];
  }
  const str = String(d).trim();
  if (str.includes("T")) return str.split("T")[0];
  return str.slice(0, 10);
};

/**
 * CREATE MONTHLY INVESTMENT PLAN
 * Auto-generates a unique plan_code from plan_name if not provided.
 * Optionally allows bulk initial amounts via `amounts` array.
 */
export const createMonthlyInvestmentPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      plan_name,
      plan_code,
      description = null,
      plan_start_date,
      plan_end_date,
      interest_frequency = "MONTHLY",
      interest_calculation = "MONTHLY_PERIOD",
      final_payout_type = "INTEREST_PLUS_PRINCIPAL",
      interest_payment_days,
      status = "DRAFT",
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
      `SELECT id FROM monthly_investment_plans WHERE plan_name = ?`,
      [plan_name]
    );

    if (existingName.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Monthly investment plan with name "${plan_name}" already exists`,
      });
    }

    // 2. Auto-generate or sanitize plan_code
    if (!plan_code || typeof plan_code !== "string" || !plan_code.trim()) {
      plan_code = await generateMeaningfulMonthlyPlanCode(plan_name, connection);
    } else {
      plan_code = plan_code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-_]/g, "")
        .slice(0, 50);

      if (!plan_code) {
        plan_code = await generateMeaningfulMonthlyPlanCode(plan_name, connection);
      } else {
        // Check duplicate plan_code
        const [existingCode] = await connection.query(
          `SELECT id FROM monthly_investment_plans WHERE plan_code = ?`,
          [plan_code]
        );

        if (existingCode.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Monthly investment plan with code "${plan_code}" already exists`,
          });
        }
      }
    }

    // 3. Validate plan dates
    if (!plan_start_date || !isValidDateString(plan_start_date)) {
      return res.status(400).json({
        success: false,
        message: "plan_start_date is required and must be in YYYY-MM-DD format",
      });
    }

    if (!plan_end_date || !isValidDateString(plan_end_date)) {
      return res.status(400).json({
        success: false,
        message: "plan_end_date is required and must be in YYYY-MM-DD format",
      });
    }

    if (plan_end_date < plan_start_date) {
      return res.status(400).json({
        success: false,
        message: "plan_end_date must be greater than or equal to plan_start_date",
      });
    }

    // 4. Validate ENUMs & interest_payment_days
    interest_frequency = String(interest_frequency).toUpperCase();
    if (!VALID_INTEREST_FREQUENCIES.includes(interest_frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interest_frequency. Allowed: ${VALID_INTEREST_FREQUENCIES.join(", ")}`,
      });
    }

    interest_calculation = String(interest_calculation).toUpperCase();
    if (!VALID_INTEREST_CALCULATIONS.includes(interest_calculation)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interest_calculation. Allowed: ${VALID_INTEREST_CALCULATIONS.join(", ")}`,
      });
    }

    final_payout_type = String(final_payout_type).toUpperCase();
    if (!VALID_FINAL_PAYOUT_TYPES.includes(final_payout_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid final_payout_type. Allowed: ${VALID_FINAL_PAYOUT_TYPES.join(", ")}`,
      });
    }

    const daysValidation = sanitizeInterestPaymentDays(interest_payment_days);
    if (!daysValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: daysValidation.message,
      });
    }
    const formattedPaymentDays = daysValidation.formattedString;

    status = String(status).toUpperCase();
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // 5. Insert monthly_investment_plans
    const [result] = await connection.query(
      `INSERT INTO monthly_investment_plans (
        plan_name,
        plan_code,
        description,
        plan_start_date,
        plan_end_date,
        interest_frequency,
        interest_calculation,
        final_payout_type,
        interest_payment_days,
        status,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan_name,
        plan_code,
        description || null,
        plan_start_date,
        plan_end_date,
        interest_frequency,
        interest_calculation,
        final_payout_type,
        formattedPaymentDays,
        status,
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

        const minInterest = Number(item.minimum_monthly_interest || 0);
        const maxInterest = Number(
          item.maximum_monthly_interest !== undefined
            ? item.maximum_monthly_interest
            : minInterest
        );

        if (isNaN(minInterest) || minInterest < 0) {
          return res.status(400).json({
            success: false,
            message: "minimum_monthly_interest must be >= 0",
          });
        }

        if (isNaN(maxInterest) || maxInterest < minInterest) {
          return res.status(400).json({
            success: false,
            message: "maximum_monthly_interest must be greater than or equal to minimum_monthly_interest",
          });
        }

        const isActive =
          item.is_active === undefined
            ? true
            : item.is_active === true ||
              item.is_active === "true" ||
              item.is_active === 1;

        const [amountResult] = await connection.query(
          `INSERT INTO monthly_investment_plan_amounts (
            plan_id,
            principal_amount,
            minimum_monthly_interest,
            maximum_monthly_interest,
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
          `SELECT * FROM monthly_investment_plan_amounts WHERE id = ?`,
          [amountResult.insertId]
        );

        insertedAmounts.push(insertedAmountRow[0]);

        // Audit log for each inserted amount
        await AuditLog({
          connection,
          table: "monthly_investment_plan_amounts",
          recordId: amountResult.insertId,
          action: "INSERT",
          newData: insertedAmountRow[0],
          userId,
          remarks: `Initial plan amount ₹${normalizedPrincipal} for monthly investment plan ${plan_name}`,
        });
      }
    }

    // 7. Fetch newly created plan
    const [newPlanRows] = await connection.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [planId]
    );

    const newPlan = newPlanRows[0];
    newPlan.amounts = insertedAmounts;
    newPlan.interest_payment_days_list = parseInterestPaymentDays(
      newPlan.interest_payment_days
    );

    // 8. Audit log for plan
    await AuditLog({
      connection,
      table: "monthly_investment_plans",
      recordId: planId,
      action: "INSERT",
      newData: newPlan,
      userId,
      remarks: remarks || `Created monthly investment plan "${plan_name}" (${plan_code})`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Monthly investment plan created successfully",
      data: newPlan,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create monthly investment plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating monthly investment plan",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL MONTHLY INVESTMENT PLANS
 * Optional query filters: status, search, startDate, endDate, include_amounts
 */
export const getAllMonthlyInvestmentPlans = async (req, res) => {
  try {
    const {
      status,
      search,
      startDate,
      endDate,
      interest_payment_day,
      include_amounts = "true",
    } = req.query;

    let query = `
      SELECT 
        mip.id,
        mip.plan_name,
        mip.plan_code,
        mip.description,
        mip.plan_start_date,
        mip.plan_end_date,
        mip.interest_frequency,
        mip.interest_calculation,
        mip.final_payout_type,
        mip.interest_payment_days,
        mip.status,
        mip.created_by,
        mip.updated_by,
        mip.created_at,
        mip.updated_at,
        (SELECT COUNT(*) FROM monthly_investment_plan_amounts mipa WHERE mipa.plan_id = mip.id) AS total_amounts_count,
        (SELECT COUNT(*) FROM monthly_investment_plan_amounts mipa WHERE mipa.plan_id = mip.id AND mipa.is_active = TRUE) AS active_amounts_count,
        (SELECT COUNT(*) FROM monthly_investment_subscriptions mis WHERE mis.plan_id = mip.id) AS total_subscriptions_count
      FROM monthly_investment_plans mip
      WHERE 1=1
    `;
    const params = [];

    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      query += ` AND mip.status = ?`;
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (mip.plan_name LIKE ? OR mip.plan_code LIKE ? OR mip.description LIKE ?)`;
      params.push(term, term, term);
    }

    if (startDate) {
      query += ` AND mip.plan_start_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND mip.plan_end_date <= ?`;
      params.push(endDate);
    }

    if (interest_payment_day) {
      const dayNum = Number(interest_payment_day);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        query += ` AND FIND_IN_SET(?, REPLACE(mip.interest_payment_days, ' ', '')) > 0`;
        params.push(String(dayNum));
      }
    }

    query += ` ORDER BY mip.id DESC`;

    const [plans] = await db.query(query, params);

    // Parse interest payment days array for each plan
    for (const plan of plans) {
      plan.interest_payment_days_list = parseInterestPaymentDays(
        plan.interest_payment_days
      );
    }

    // Optionally attach amounts to each plan
    if (include_amounts === "true" || include_amounts === true) {
      for (const plan of plans) {
        const [amounts] = await db.query(
          `SELECT 
            id,
            plan_id,
            principal_amount,
            minimum_monthly_interest,
            maximum_monthly_interest,
            is_active,
            created_at,
            updated_at
          FROM monthly_investment_plan_amounts 
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
    console.error("Get all monthly investment plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment plans",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT PLAN BY ID
 */
export const getMonthlyInvestmentPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan ID is required",
      });
    }

    const [plans] = await db.query(
      `SELECT 
        mip.*,
        (SELECT COUNT(*) FROM monthly_investment_subscriptions mis WHERE mis.plan_id = mip.id) AS total_subscriptions_count
       FROM monthly_investment_plans mip 
       WHERE mip.id = ?`,
      [Number(id)]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan not found",
      });
    }

    const plan = plans[0];

    // Fetch associated amounts
    const [amounts] = await db.query(
      `SELECT 
        id,
        plan_id,
        principal_amount,
        minimum_monthly_interest,
        maximum_monthly_interest,
        is_active,
        created_at,
        updated_at
      FROM monthly_investment_plan_amounts 
      WHERE plan_id = ?
      ORDER BY principal_amount ASC`,
      [plan.id]
    );

    plan.amounts = amounts;
    plan.interest_payment_days_list = parseInterestPaymentDays(
      plan.interest_payment_days
    );

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Get monthly investment plan by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment plan",
    });
  }
};

/**
 * UPDATE MONTHLY INVESTMENT PLAN
 */
export const updateMonthlyInvestmentPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan ID is required",
      });
    }

    // 1. Check existing record
    const [existingRows] = await connection.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan not found",
      });
    }

    const oldData = existingRows[0];

    // 2. Check if subscriptions exist for this plan (direct or through amount tiers)
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count 
       FROM monthly_investment_subscriptions 
       WHERE plan_id = ? 
          OR plan_amount_id IN (SELECT id FROM monthly_investment_plan_amounts WHERE plan_id = ?)`,
      [Number(id), Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    const hasSubscriptions = subscriptionCount > 0;

    // If subscriptions exist, prevent changing core period and contract fields
    if (hasSubscriptions) {
      const restrictedFields = [
        {
          key: "plan_start_date",
          label: "plan_start_date",
          isChanged: (newVal, oldVal) =>
            normalizeDate(newVal) !== normalizeDate(oldVal),
        },
        {
          key: "plan_end_date",
          label: "plan_end_date",
          isChanged: (newVal, oldVal) =>
            normalizeDate(newVal) !== normalizeDate(oldVal),
        },
        {
          key: "plan_code",
          label: "plan_code",
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
          key: "interest_calculation",
          label: "interest_calculation",
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
        {
          key: "interest_payment_days",
          label: "interest_payment_days",
          isChanged: (newVal, oldVal) => {
            const parsedNew = sanitizeInterestPaymentDays(newVal);
            const parsedOld = sanitizeInterestPaymentDays(oldVal);
            if (!parsedNew.isValid) return true;
            return parsedNew.formattedString !== parsedOld.formattedString;
          },
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
          message: `Cannot modify contract fields (${blockedFields.join(", ")}) because this plan is linked to ${subscriptionCount} customer subscription(s). You can only update non-financial fields (plan_name, description, status).`,
        });
      }
    }

    let {
      plan_name,
      plan_code,
      description,
      plan_start_date,
      plan_end_date,
      interest_frequency,
      interest_calculation,
      final_payout_type,
      interest_payment_days,
      status,
      remarks,
    } = req.body;

    // Validate plan_name if provided
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
          `SELECT id FROM monthly_investment_plans WHERE plan_name = ? AND id != ?`,
          [targetPlanName, Number(id)]
        );
        if (duplicateName.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Another monthly investment plan with name "${targetPlanName}" already exists`,
          });
        }
      }
    }

    // Validate plan_code if provided
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
          `SELECT id FROM monthly_investment_plans WHERE plan_code = ? AND id != ?`,
          [targetPlanCode, Number(id)]
        );
        if (duplicateCode.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Another monthly investment plan with code "${targetPlanCode}" already exists`,
          });
        }
      }
    }

    // Validate dates
    let targetStartDate = oldData.plan_start_date;
    if (plan_start_date !== undefined) {
      if (!isValidDateString(plan_start_date)) {
        return res.status(400).json({
          success: false,
          message: "plan_start_date must be in YYYY-MM-DD format",
        });
      }
      targetStartDate = plan_start_date;
    }

    let targetEndDate = oldData.plan_end_date;
    if (plan_end_date !== undefined) {
      if (!isValidDateString(plan_end_date)) {
        return res.status(400).json({
          success: false,
          message: "plan_end_date must be in YYYY-MM-DD format",
        });
      }
      targetEndDate = plan_end_date;
    }

    if (targetEndDate < targetStartDate) {
      return res.status(400).json({
        success: false,
        message: "plan_end_date must be greater than or equal to plan_start_date",
      });
    }

    // Validate ENUMs
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

    let targetInterestCalculation = oldData.interest_calculation;
    if (interest_calculation !== undefined) {
      targetInterestCalculation = String(interest_calculation).toUpperCase();
      if (!VALID_INTEREST_CALCULATIONS.includes(targetInterestCalculation)) {
        return res.status(400).json({
          success: false,
          message: `Invalid interest_calculation. Allowed: ${VALID_INTEREST_CALCULATIONS.join(", ")}`,
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

    let targetInterestPaymentDays =
      oldData.interest_payment_days || DEFAULT_INTEREST_PAYMENT_DAYS;
    if (interest_payment_days !== undefined) {
      const daysValidation = sanitizeInterestPaymentDays(interest_payment_days);
      if (!daysValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: daysValidation.message,
        });
      }
      targetInterestPaymentDays = daysValidation.formattedString;
    }

    let targetDescription =
      description !== undefined ? description : oldData.description;

    // 2. Perform Update
    await connection.query(
      `UPDATE monthly_investment_plans
       SET plan_name = ?,
           plan_code = ?,
           description = ?,
           plan_start_date = ?,
           plan_end_date = ?,
           interest_frequency = ?,
           interest_calculation = ?,
           final_payout_type = ?,
           interest_payment_days = ?,
           status = ?,
           updated_by = ?
       WHERE id = ?`,
      [
        targetPlanName,
        targetPlanCode,
        targetDescription,
        targetStartDate,
        targetEndDate,
        targetInterestFrequency,
        targetInterestCalculation,
        targetFinalPayoutType,
        targetInterestPaymentDays,
        targetStatus,
        userId,
        Number(id),
      ]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];
    updatedData.interest_payment_days_list = parseInterestPaymentDays(
      updatedData.interest_payment_days
    );

    // 3. Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_plans",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Updated monthly investment plan ID ${id} (${updatedData.plan_name})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Monthly investment plan updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update monthly investment plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating monthly investment plan",
    });
  } finally {
    connection.release();
  }
};

/**
 * TOGGLE STATUS (DRAFT / ACTIVE / CLOSED / INACTIVE)
 */
export const toggleMonthlyInvestmentPlanStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan not found",
      });
    }

    const oldData = rows[0];
    let newStatus;

    if (status) {
      newStatus = String(status).toUpperCase();
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`,
        });
      }
    } else {
      // Default toggle logic: ACTIVE -> INACTIVE, otherwise ACTIVE
      newStatus = oldData.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    }

    await connection.query(
      `UPDATE monthly_investment_plans SET status = ?, updated_by = ? WHERE id = ?`,
      [newStatus, userId, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];
    updatedData.interest_payment_days_list = parseInterestPaymentDays(
      updatedData.interest_payment_days
    );

    await AuditLog({
      connection,
      table: "monthly_investment_plans",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Changed status of monthly investment plan ID ${id} to ${newStatus}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Monthly investment plan status updated to ${newStatus}`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle monthly investment plan status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while toggling plan status",
    });
  } finally {
    connection.release();
  }
};

/**
 * DELETE MONTHLY INVESTMENT PLAN
 * Rejects deletion if linked to existing monthly investment subscriptions.
 */
export const deleteMonthlyInvestmentPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment plan ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment plan not found",
      });
    }

    const oldData = rows[0];

    // Safety check: is plan used in monthly_investment_subscriptions?
    const [subRows] = await connection.query(
      `SELECT COUNT(*) AS sub_count FROM monthly_investment_subscriptions WHERE plan_id = ?`,
      [Number(id)]
    );

    const subscriptionCount = subRows[0]?.sub_count || 0;
    if (subscriptionCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIBED_PLAN",
        message: `Cannot delete monthly investment plan "${oldData.plan_name}" (${oldData.plan_code}) because it has ${subscriptionCount} associated customer subscription(s). Set its status to INACTIVE or CLOSED instead.`,
      });
    }

    // Safety check: check if any child plan amount is used in subscriptions
    const [subAmounts] = await connection.query(
      `SELECT COUNT(*) AS amount_sub_count 
       FROM monthly_investment_subscriptions s
       JOIN monthly_investment_plan_amounts pa ON s.plan_amount_id = pa.id
       WHERE pa.plan_id = ?`,
      [Number(id)]
    );

    const amountSubCount = subAmounts[0]?.amount_sub_count || 0;
    if (amountSubCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIBED_PLAN",
        message: `Cannot delete monthly investment plan "${oldData.plan_name}": ${amountSubCount} subscription(s) exist under its amount tiers. Deactivate the plan instead.`,
      });
    }

    // Delete associated plan amounts first
    await connection.query(
      `DELETE FROM monthly_investment_plan_amounts WHERE plan_id = ?`,
      [Number(id)]
    );

    // Delete plan
    await connection.query(
      `DELETE FROM monthly_investment_plans WHERE id = ?`,
      [Number(id)]
    );

    // Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_plans",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || `Deleted monthly investment plan ID ${id} (${oldData.plan_name})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Monthly investment plan deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete monthly investment plan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting monthly investment plan",
    });
  } finally {
    connection.release();
  }
};

/**
 * PREVIEW AUTO-GENERATED MONTHLY INVESTMENT PLAN CODE
 * Endpoint: GET /monthly-investment-plans/preview-code?plan_name=Wealth+Builder
 */
export const previewMonthlyInvestmentPlanCode = async (req, res) => {
  try {
    const { plan_name } = req.query;

    if (!plan_name || !plan_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "plan_name query parameter is required",
      });
    }

    const code = await generateMeaningfulMonthlyPlanCode(plan_name, db);
    const slug = createPlanSlug(plan_name);

    return res.status(200).json({
      success: true,
      plan_name,
      base_slug: slug,
      suggested_plan_code: code,
    });
  } catch (error) {
    console.error("Preview monthly plan code error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while previewing monthly plan code",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT PLAN OPTIONS & METADATA
 * Useful for frontend dropdowns, day pickers, and enum values.
 * Endpoint: GET /monthly-investment-plans/options
 */
export const getMonthlyInvestmentPlanOptions = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        default_interest_payment_days: DEFAULT_INTEREST_PAYMENT_DAYS,
        default_interest_payment_days_list: DEFAULT_INTEREST_PAYMENT_DAYS_ARRAY,
        valid_interest_payment_days_range: {
          min: 1,
          max: 31,
        },
        valid_statuses: VALID_STATUSES,
        valid_interest_frequencies: VALID_INTEREST_FREQUENCIES,
        valid_interest_calculations: VALID_INTEREST_CALCULATIONS,
        valid_final_payout_types: VALID_FINAL_PAYOUT_TYPES,
      },
    });
  } catch (error) {
    console.error("Get monthly investment plan options error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment plan options",
    });
  }
};

