import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import {
  formatDateOnly,
  addDaysToDateStr,
  getNextOrSameDayDate,
  calculateInterestStartDateFromPlan,
  generateFullInterestSchedule,
  generateInvestmentSubscriptionNo,
} from "../../../../utils/generateInvestmentSchedule.js";

const VALID_SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "INTEREST_STARTED",
  "MATURED",
  "COMPLETED",
  "PRECLOSED",
  "CANCELLED",
];

/**
 * CREATE INVESTMENT SUBSCRIPTION + GENERATE FULL SCHEDULE UPFRONT
 * 
 * Step 1:
 * - Validates customer, active plan, and plan amount tier.
 * - Supports quantity (defaults to 1).
 * - Computes lock_in_end_date = investment_date + plan.lock_in_days.
 * - Sets interest_start_date (>= lock_in_end_date) aligned to payout_day.
 * - Upfront generates full 52-week interest schedule (or custom total_installments).
 * - Stores all rows in investment_interest_schedules within the same transaction.
 * - Sets interest_end_date to the final installment's due date.
 */
export const createInvestmentSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      customer_id,
      plan_id,
      plan_amount_id,
      quantity = 1,
      investment_date,
      interest_start_date,
      total_installments = 52,
      weekly_interest_amount,
      remarks,
    } = req.body;

    const userId = req.user?.id || null;

    // 1. Validate required fields
    if (!customer_id || isNaN(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid customer_id is required",
      });
    }

    if (!plan_id || isNaN(plan_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan_id is required",
      });
    }

    if (!plan_amount_id || isNaN(plan_amount_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan_amount_id is required",
      });
    }

    customer_id = Number(customer_id);
    plan_id = Number(plan_id);
    plan_amount_id = Number(plan_amount_id);

    // Quantity validation
    quantity = Number(quantity);
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a positive integer greater than or equal to 1",
      });
    }

    // 2. Verify Customer
    const [customerRows] = await connection.query(
      `SELECT id, name, phone FROM chit_customers WHERE id = ?`,
      [customer_id]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID ${customer_id} not found`,
      });
    }

    const customer = customerRows[0];

    // 3. Verify Plan & Status
    const [planRows] = await connection.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Investment plan with ID ${plan_id} not found`,
      });
    }

    const plan = planRows[0];
    if (plan.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: `Investment plan "${plan.plan_name}" is currently INACTIVE. Cannot create subscriptions under an inactive plan.`,
      });
    }

    // 4. Verify Plan Amount Tier
    const [amountRows] = await connection.query(
      `SELECT * FROM investment_plan_amounts WHERE id = ? AND plan_id = ?`,
      [plan_amount_id, plan_id]
    );

    if (amountRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Investment plan amount tier with ID ${plan_amount_id} not found for plan "${plan.plan_name}"`,
      });
    }

    const planAmount = amountRows[0];
    if (!planAmount.is_active) {
      return res.status(400).json({
        success: false,
        message: `The selected principal amount tier ₹${planAmount.principal_amount} is currently deactivated.`,
      });
    }

    const principalAmount = Number(planAmount.principal_amount);

    // 5. Date Calculations strictly derived from Plan ("Optional: Defaults to lock-in end")
    const {
      investmentDate: cleanInvestmentDate,
      lockInEndDate,
      interestStartDate: cleanInterestStartDate,
      payoutDay,
    } = calculateInterestStartDateFromPlan(
      investment_date,
      plan,
      interest_start_date
    );

    // 6. Total Installments validation
    total_installments = Number(total_installments);
    if (isNaN(total_installments) || !Number.isInteger(total_installments) || total_installments <= 0) {
      return res.status(400).json({
        success: false,
        message: "total_installments must be a positive integer (e.g. 52 for 1 year)",
      });
    }

    // 7. Weekly Interest Amount validation / defaulting
    let finalInterestAmount;
    if (weekly_interest_amount !== undefined && weekly_interest_amount !== null) {
      finalInterestAmount = Number(weekly_interest_amount);
      if (isNaN(finalInterestAmount) || finalInterestAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "weekly_interest_amount must be a valid positive number >= 0",
        });
      }

      const minAllowed = Number(planAmount.minimum_interest_amount);
      const maxAllowed = Number(planAmount.maximum_interest_amount);

      if (finalInterestAmount < minAllowed) {
        return res.status(400).json({
          success: false,
          message: `weekly_interest_amount (₹${finalInterestAmount}) cannot be less than minimum allowed ₹${minAllowed}`,
        });
      }

      if (maxAllowed > 0 && finalInterestAmount > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `weekly_interest_amount (₹${finalInterestAmount}) cannot exceed maximum allowed ₹${maxAllowed}`,
        });
      }
    } else {
      finalInterestAmount = Number(planAmount.minimum_interest_amount || 0);
    }

    // 8. Financial Calculations
    const principalAmountPerQuantity = principalAmount;
    const totalPrincipalAmount = Number((principalAmountPerQuantity * quantity).toFixed(2));
    const weeklyInterestPerQuantity = finalInterestAmount;
    const totalWeeklyInterest = Number((weeklyInterestPerQuantity * quantity).toFixed(2));
    const totalInterestAmount = Number((totalWeeklyInterest * total_installments).toFixed(2));
    const maturityPrincipalAmount = totalPrincipalAmount;
    const maturityInterestAmount = totalInterestAmount;
    const maturityTotalAmount = Number((totalPrincipalAmount + totalInterestAmount).toFixed(2));

    // 9. Generate Unique Subscription Number
    const subscriptionNo = await generateInvestmentSubscriptionNo(connection);

    // 10. Generate full upfront interest schedule
    const { schedules, valuesForInsert, interestEndDate } =
      generateFullInterestSchedule({
        subscriptionId: 0,
        interestStartDate: cleanInterestStartDate,
        payoutDay: plan.payout_day,
        totalInstallments: total_installments,
        weeklyInterestAmount: totalWeeklyInterest,
        createdBy: userId,
      });

    const firstInterestDueDate = schedules[0]?.interest_due_date || cleanInterestStartDate;
    const nextInterestDueDate = firstInterestDueDate;

    // 11. Insert Subscription Record with all metadata fields
    const [subResult] = await connection.query(
      `INSERT INTO investment_subscriptions (
        subscription_no,
        customer_id,
        plan_id,
        plan_amount_id,
        quantity,
        principal_per_quantity,
        principal_amount_per_quantity,
        total_principal_amount,
        principal_amount,
        interest_per_quantity,
        weekly_interest_amount_per_quantity,
        total_weekly_interest_amount,
        total_expected_interest,
        total_interest_amount,
        total_interest_paid,
        total_interest_pending,
        principal_pending_amount,
        maturity_principal_amount,
        maturity_interest_amount,
        maturity_total_amount,
        maturity_date,
        investment_date,
        lock_in_end_date,
        interest_start_date,
        interest_end_date,
        first_interest_due_date,
        next_interest_due_date,
        total_installments,
        completed_installments,
        pending_installments,
        status,
        principal_paid,
        principal_paid_amount,
        remarks,
        created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'ACTIVE', FALSE, 0.00,
        ?, ?
      )`,
      [
        subscriptionNo,
        customer_id,
        plan_id,
        plan_amount_id,
        quantity,
        principalAmountPerQuantity, // principal_per_quantity
        principalAmountPerQuantity, // principal_amount_per_quantity
        totalPrincipalAmount,
        totalPrincipalAmount, // principal_amount for legacy compatibility
        weeklyInterestPerQuantity, // interest_per_quantity
        weeklyInterestPerQuantity, // weekly_interest_amount_per_quantity
        totalWeeklyInterest,
        totalInterestAmount, // total_expected_interest
        totalInterestAmount,
        0.00, // total_interest_paid
        totalInterestAmount, // total_interest_pending
        totalPrincipalAmount, // principal_pending_amount
        maturityPrincipalAmount,
        maturityInterestAmount,
        maturityTotalAmount,
        interestEndDate, // maturity_date
        cleanInvestmentDate,
        lockInEndDate,
        cleanInterestStartDate,
        interestEndDate,
        firstInterestDueDate,
        nextInterestDueDate,
        total_installments,
        0, // completed_installments
        total_installments, // pending_installments
        remarks || null,
        userId,
      ]
    );

    const subscriptionId = subResult.insertId;

    // 12. Bulk insert schedules with correct subscriptionId
    const scheduleValues = valuesForInsert.map((row) => [
      subscriptionId,
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
    ]);

    await connection.query(
      `INSERT INTO investment_interest_schedules (
        subscription_id,
        installment_no,
        interest_due_date,
        interest_amount,
        status,
        paid_amount,
        created_by
      ) VALUES ?`,
      [scheduleValues]
    );

    // 12. Fetch newly created subscription with joined plan and customer
    const [createdRows] = await connection.query(
      `SELECT 
        s.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        p.investment_type,
        p.lock_in_days,
        p.interest_frequency,
        p.payout_day,
        p.interest_start_rule,
        p.final_payout_type,
        pa.minimum_interest_amount,
        pa.maximum_interest_amount
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       JOIN investment_plan_amounts pa ON s.plan_amount_id = pa.id
       WHERE s.id = ?`,
      [subscriptionId]
    );

    const newSubscription = createdRows[0];

    // 13. Audit Log
    await AuditLog({
      connection,
      table: "investment_subscriptions",
      recordId: subscriptionId,
      action: "INSERT",
      newData: {
        ...newSubscription,
        total_installments,
        weekly_interest_amount: finalInterestAmount,
        schedule_count: schedules.length,
      },
      userId,
      remarks:
        remarks ||
        `Created investment subscription #${subscriptionId} for ${customer.name} (Plan: ${plan.plan_name}, ₹${principalAmount}, ${total_installments} weeks upfront schedule)`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Investment subscription created successfully with full schedule upfront",
      data: {
        ...newSubscription,
        schedule_summary: {
          total_installments: schedules.length,
          first_installment_date: schedules[0].interest_due_date,
          final_installment_date: interestEndDate,
          weekly_interest_amount: finalInterestAmount,
          total_interest_payable: Number(
            (finalInterestAmount * schedules.length).toFixed(2)
          ),
        },
        schedules,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating investment subscription",
    });
  } finally {
    connection.release();
  }
};

/**
 * PREVIEW INVESTMENT SUBSCRIPTION & GENERATED SCHEDULES (Without DB Commit)
 * Allows frontend to display summary, installment dates, weekly interest, and maturity total before user confirms.
 */
export const previewInvestmentSubscription = async (req, res) => {
  try {
    const input = { ...req.query, ...req.body };
    let {
      plan_id,
      plan_amount_id,
      quantity = 1,
      investment_date,
      total_installments = 52,
      weekly_interest_amount,
    } = input;

    if (!plan_id || isNaN(plan_id)) {
      return res.status(400).json({
        success: false,
        message: "plan_id is required",
      });
    }

    if (!plan_amount_id || isNaN(plan_amount_id)) {
      return res.status(400).json({
        success: false,
        message: "plan_amount_id is required",
      });
    }

    plan_id = Number(plan_id);
    plan_amount_id = Number(plan_amount_id);
    quantity = Number(quantity || 1);
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a positive integer greater than or equal to 1",
      });
    }

    const [planRows] = await db.query(
      `SELECT * FROM investment_plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    const plan = planRows[0];

    const [amountRows] = await db.query(
      `SELECT * FROM investment_plan_amounts WHERE id = ? AND plan_id = ?`,
      [plan_amount_id, plan_id]
    );

    if (amountRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment plan amount tier not found",
      });
    }

    const planAmount = amountRows[0];

    // Date Calculations strictly derived from Plan ("Optional: Defaults to lock-in end")
    const {
      investmentDate: cleanInvestmentDate,
      lockInEndDate,
      interestStartDate: cleanInterestStartDate,
      payoutDay,
    } = calculateInterestStartDateFromPlan(
      investment_date,
      plan,
      interest_start_date
    );

    total_installments = Number(total_installments) || 52;
    let finalInterestAmount;
    if (weekly_interest_amount !== undefined && weekly_interest_amount !== null) {
      finalInterestAmount = Number(weekly_interest_amount);
    } else {
      finalInterestAmount = Number(planAmount.minimum_interest_amount || 0);
    }

    const principalPerUnit = Number(planAmount.principal_amount);
    const totalPrincipal = Number((principalPerUnit * quantity).toFixed(2));
    const weeklyInterestPerUnit = finalInterestAmount;
    const totalWeeklyInterest = Number((weeklyInterestPerUnit * quantity).toFixed(2));
    const totalInterestAmount = Number((totalWeeklyInterest * total_installments).toFixed(2));

    const { schedules, interestEndDate } = generateFullInterestSchedule({
      subscriptionId: 0,
      interestStartDate: cleanInterestStartDate,
      payoutDay: plan.payout_day,
      totalInstallments: total_installments,
      weeklyInterestAmount: totalWeeklyInterest,
    });

    return res.status(200).json({
      success: true,
      data: {
        plan_id: plan.id,
        plan_name: plan.plan_name,
        plan_code: plan.plan_code,
        lock_in_days: plan.lock_in_days,
        payout_day: plan.payout_day,
        quantity,
        principal_per_quantity: principalPerUnit,
        principal_amount_per_quantity: principalPerUnit,
        total_principal_amount: totalPrincipal,
        interest_per_quantity: weeklyInterestPerUnit,
        weekly_interest_amount_per_quantity: weeklyInterestPerUnit,
        total_weekly_interest_amount: totalWeeklyInterest,
        total_installments,
        total_interest_amount: totalInterestAmount,
        maturity_total_amount: Number((totalPrincipal + totalInterestAmount).toFixed(2)),
        investment_date: cleanInvestmentDate,
        lock_in_end_date: lockInEndDate,
        interest_start_date: cleanInterestStartDate,
        first_interest_due_date: schedules.length > 0 ? schedules[0].interest_due_date : null,
        final_interest_due_date: interestEndDate,
        schedules_count: schedules.length,
        schedules,
      },
    });
  } catch (error) {
    console.error("Preview investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while previewing investment subscription",
    });
  }
};

/**
 * GET ALL INVESTMENT SUBSCRIPTIONS
 * Query filters: customer_id, plan_id, status, subscription_no, search, from_date, to_date
 */
export const getAllInvestmentSubscriptions = async (req, res) => {
  try {
    const {
      customer_id,
      plan_id,
      status,
      subscription_no,
      principal_paid,
      search,
      from_date,
      to_date,
    } = req.query;

    let query = `
      SELECT 
        s.id,
        s.subscription_no,
        s.customer_id,
        s.plan_id,
        s.plan_amount_id,
        s.quantity,
        s.principal_per_quantity,
        s.principal_amount_per_quantity,
        s.total_principal_amount,
        s.principal_amount,
        s.interest_per_quantity,
        s.weekly_interest_amount_per_quantity,
        s.total_weekly_interest_amount,
        s.total_expected_interest,
        s.total_interest_amount,
        s.total_interest_paid,
        s.total_interest_pending,
        s.principal_received_amount,
        s.interest_received_amount,
        s.total_received_amount,
        s.investment_date,
        s.lock_in_end_date,
        s.interest_start_date,
        s.interest_end_date,
        s.first_interest_due_date,
        s.next_interest_due_date,
        s.total_installments,
        s.completed_installments,
        s.pending_installments,
        s.status,
        s.principal_paid,
        s.principal_paid_date,
        s.principal_paid_amount,
        s.principal_pending_amount,
        s.interest_paid,
        s.interest_paid_date,
        s.interest_paid_amount,
        s.final_settlement_amount,
        s.final_settlement_date,
        s.maturity_principal_amount,
        s.maturity_interest_amount,
        s.maturity_total_amount,
        s.maturity_date,
        s.preclosure_date,
        s.preclosure_principal_amount,
        s.preclosure_interest_amount,
        s.preclosure_total_amount,
        s.preclosure_reason,
        s.completed_date,
        s.cancelled_date,
        s.cancellation_reason,
        s.remarks,
        s.created_by,
        s.updated_by,
        s.created_at,
        s.updated_at,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        p.lock_in_days,
        p.interest_frequency,
        p.payout_day,
        pa.minimum_interest_amount,
        pa.maximum_interest_amount,
        (SELECT COUNT(*) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id) AS total_schedules_count,
        (SELECT COUNT(*) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id AND iis.status = 'PAID') AS paid_schedules_count,
        (SELECT COUNT(*) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id AND iis.status = 'PENDING') AS pending_schedules_count,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id AND iis.status = 'PAID') AS total_interest_paid_calc,
        (SELECT COALESCE(SUM(interest_amount), 0) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id) AS total_interest_payable_calc
      FROM investment_subscriptions s
      JOIN chit_customers c ON s.customer_id = c.id
      JOIN investment_plans p ON s.plan_id = p.id
      JOIN investment_plan_amounts pa ON s.plan_amount_id = pa.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      query += ` AND s.customer_id = ?`;
      params.push(Number(customer_id));
    }

    if (plan_id) {
      query += ` AND s.plan_id = ?`;
      params.push(Number(plan_id));
    }

    if (subscription_no) {
      query += ` AND s.subscription_no LIKE ?`;
      params.push(`%${subscription_no.trim()}%`);
    }

    if (status && VALID_SUBSCRIPTION_STATUSES.includes(status.toUpperCase())) {
      query += ` AND s.status = ?`;
      params.push(status.toUpperCase());
    }

    if (principal_paid !== undefined) {
      const isPaid =
        principal_paid === "true" ||
        principal_paid === "1" ||
        principal_paid === true;
      query += ` AND s.principal_paid = ?`;
      params.push(isPaid ? 1 : 0);
    }

    if (from_date) {
      query += ` AND s.investment_date >= ?`;
      params.push(formatDateOnly(from_date));
    }

    if (to_date) {
      query += ` AND s.investment_date <= ?`;
      params.push(formatDateOnly(to_date));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR p.plan_name LIKE ? OR p.plan_code LIKE ? OR s.subscription_no LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY s.id DESC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get all investment subscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment subscriptions",
    });
  }
};

/**
 * GET INVESTMENT SUBSCRIPTION BY ID
 * Includes customer, plan, and full interest schedules
 */
export const getInvestmentSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        s.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.aadhar AS customer_aadhar,
        c.pan_number AS customer_pan,
        p.plan_name,
        p.plan_code,
        p.investment_type,
        p.lock_in_days,
        p.interest_frequency,
        p.payout_day,
        p.interest_start_rule,
        p.final_payout_type,
        pa.minimum_interest_amount,
        pa.maximum_interest_amount
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       JOIN investment_plan_amounts pa ON s.plan_amount_id = pa.id
       WHERE s.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment subscription not found",
      });
    }

    const subscription = rows[0];

    // Fetch full interest schedule
    const [schedules] = await db.query(
      `SELECT 
        id,
        subscription_id,
        installment_no,
        interest_due_date,
        interest_amount,
        status,
        paid_date,
        paid_amount,
        payment_id,
        payment_mode,
        remarks,
        interest_updated_at,
        created_at,
        updated_at
       FROM investment_interest_schedules
       WHERE subscription_id = ?
       ORDER BY installment_no ASC`,
      [Number(id)]
    );

    subscription.schedules = schedules;

    // Calculate progress and financial summary
    const totalInstallments = schedules.length;
    const paidInstallments = schedules.filter((s) => s.status === "PAID").length;
    const totalPaidInterest = schedules
      .filter((s) => s.status === "PAID")
      .reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
    const totalPayableInterest = schedules.reduce(
      (sum, s) => sum + Number(s.interest_amount || 0),
      0
    );

    subscription.summary = {
      total_installments: totalInstallments,
      paid_installments: paidInstallments,
      pending_installments: totalInstallments - paidInstallments,
      total_interest_paid: Number(totalPaidInterest.toFixed(2)),
      total_interest_payable: Number(totalPayableInterest.toFixed(2)),
      progress_percentage:
        totalInstallments > 0
          ? Number(((paidInstallments / totalInstallments) * 100).toFixed(2))
          : 0,
    };

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Get investment subscription by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment subscription",
    });
  }
};

/**
 * PRECLOSURE PREVIEW (Calculates close amount without commit)
 */
export const getInvestmentSubscriptionPreclosurePreview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT s.*, c.name AS customer_name, p.plan_name 
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE s.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment subscription not found",
      });
    }

    const sub = rows[0];
    if (["COMPLETED", "PRECLOSED", "CANCELLED"].includes(sub.status)) {
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_TERMINATED",
        message: `Subscription ${sub.subscription_no || sub.id} is already ${sub.status}.`,
      });
    }

    const [schedules] = await db.query(
      `SELECT * FROM investment_interest_schedules 
       WHERE subscription_id = ? 
       ORDER BY installment_no ASC`,
      [Number(id)]
    );

    const paidSchedules = schedules.filter((s) => s.status === "PAID");
    const pendingSchedules = schedules.filter((s) => s.status === "PENDING");
    const totalPaidInterest = paidSchedules.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
    const principalAmount = Number(sub.total_principal_amount || sub.principal_amount || 0);

    const todayStr = formatDateOnly(new Date());

    return res.status(200).json({
      success: true,
      data: {
        subscription_id: sub.id,
        subscription_no: sub.subscription_no,
        customer_name: sub.customer_name,
        plan_name: sub.plan_name,
        preclosure_date: todayStr,
        total_principal_amount: principalAmount,
        total_interest_paid: Number(totalPaidInterest.toFixed(2)),
        total_close_payable: principalAmount,
        paid_installments_count: paidSchedules.length,
        cancelled_installments_count: pendingSchedules.length,
        status: sub.status,
      },
    });
  } catch (error) {
    console.error("Investment preclosure preview error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching preclosure preview",
    });
  }
};

/**
 * PRECLOSE DEDICATED ENDPOINT
 */
export const precloseInvestmentSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { reason, remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM investment_subscriptions WHERE id = ? FOR UPDATE`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment subscription not found",
      });
    }

    const sub = rows[0];
    if (["COMPLETED", "PRECLOSED", "CANCELLED"].includes(sub.status)) {
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_TERMINATED",
        message: `Subscription ${sub.subscription_no || sub.id} is already ${sub.status}.`,
      });
    }

    const todayStr = formatDateOnly(new Date());
    const principalAmount = Number(sub.total_principal_amount || sub.principal_amount || 0);

    const [schedules] = await connection.query(
      `SELECT * FROM investment_interest_schedules 
       WHERE subscription_id = ? 
       ORDER BY installment_no ASC`,
      [Number(id)]
    );

    const totalPaidInterest = schedules
      .filter((s) => s.status === "PAID")
      .reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);

    // Cancel remaining pending schedules
    const [cancelResult] = await connection.query(
      `UPDATE investment_interest_schedules 
       SET status = 'CANCELLED', updated_by = ?,
           remarks = COALESCE(CONCAT(remarks, ' | Cancelled due to preclosure'), 'Cancelled due to preclosure')
       WHERE subscription_id = ? AND status = 'PENDING'`,
      [userId, Number(id)]
    );

    // Update subscription record
    await connection.query(
      `UPDATE investment_subscriptions 
       SET status = 'PRECLOSED',
           preclosure_date = ?,
           preclosure_principal_amount = ?,
           preclosure_interest_amount = ?,
           preclosure_total_amount = ?,
           preclosure_reason = ?,
           completed_date = ?,
           principal_paid = TRUE,
           principal_paid_date = ?,
           principal_paid_amount = ?,
           principal_pending_amount = 0.00,
           pending_installments = 0,
           total_interest_pending = 0.00,
           next_interest_due_date = NULL,
           updated_by = ?
       WHERE id = ?`,
      [
        todayStr,
        principalAmount,
        totalPaidInterest,
        Number((principalAmount + totalPaidInterest).toFixed(2)),
        reason || remarks || "Customer requested preclosure",
        todayStr,
        todayStr,
        principalAmount,
        userId,
        Number(id),
      ]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "investment_subscriptions",
      recordId: Number(id),
      action: "PRECLOSE",
      oldData: sub,
      newData: updatedData,
      userId,
      remarks: `Preclosed investment subscription #${id} (${sub.subscription_no || id}). Cancelled ${cancelResult.affectedRows || 0} schedules.`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Investment subscription ${sub.subscription_no || sub.id} preclosed successfully`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Preclose investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while preclosing investment subscription",
    });
  } finally {
    connection.release();
  }
};

/**
 * UPDATE INVESTMENT SUBSCRIPTION STATUS (e.g. 'CANCELLED', 'PRECLOSED', 'COMPLETED')
 */
export const updateInvestmentSubscriptionStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, reason, remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required",
      });
    }

    if (!status || !VALID_SUBSCRIPTION_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Valid status is required. Allowed: ${VALID_SUBSCRIPTION_STATUSES.join(", ")}`,
      });
    }

    const newStatus = status.toUpperCase();

    const [rows] = await connection.query(
      `SELECT * FROM investment_subscriptions WHERE id = ? FOR UPDATE`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment subscription not found",
      });
    }

    const oldData = rows[0];
    const todayStr = formatDateOnly(new Date());

    if (["COMPLETED", "PRECLOSED", "CANCELLED"].includes(oldData.status)) {
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_TERMINATED",
        message: `Subscription ${oldData.subscription_no || oldData.id} is already ${oldData.status}.`,
      });
    }

    if (newStatus === "CANCELLED") {
      const [payments] = await connection.query(
        `SELECT COUNT(*) AS pay_count FROM investment_payments WHERE subscription_id = ?`,
        [Number(id)]
      );

      const hasPaid =
        Number(oldData.total_interest_paid || 0) > 0 ||
        Number(oldData.principal_paid_amount || 0) > 0 ||
        oldData.principal_paid;

      const [paidSchedules] = await connection.query(
        `SELECT COUNT(*) AS paid_count FROM investment_interest_schedules 
         WHERE subscription_id = ? AND (paid_amount > 0 OR status = 'PAID')`,
        [Number(id)]
      );

      if ((payments[0]?.pay_count || 0) > 0 || hasPaid || (paidSchedules[0]?.paid_count || 0) > 0) {
        return res.status(400).json({
          success: false,
          code: "CANNOT_CANCEL_PAID_SUBSCRIPTION",
          message: `Cannot cancel subscription because payment(s) have already been recorded. Use PRECLOSED instead.`,
        });
      }

      await connection.query(
        `UPDATE investment_interest_schedules 
         SET status = 'CANCELLED', updated_by = ?,
             remarks = COALESCE(CONCAT(remarks, ' | Cancelled with subscription'), 'Cancelled with subscription')
         WHERE subscription_id = ? AND status = 'PENDING'`,
        [userId, Number(id)]
      );

      await connection.query(
        `UPDATE investment_subscriptions 
         SET status = 'CANCELLED', 
             cancelled_date = ?, 
             cancellation_date = ?, 
             cancellation_reason = ?, 
             pending_installments = 0,
             total_interest_pending = 0.00,
             next_interest_due_date = NULL,
             updated_by = ? 
         WHERE id = ?`,
        [todayStr, todayStr, reason || remarks || "Subscription cancelled", userId, Number(id)]
      );
    } else if (newStatus === "PRECLOSED") {
      const principalAmount = Number(oldData.total_principal_amount || oldData.principal_amount || 0);
      const [schedules] = await connection.query(
        `SELECT * FROM investment_interest_schedules WHERE subscription_id = ?`,
        [Number(id)]
      );
      const totalPaidInterest = schedules
        .filter((s) => s.status === "PAID")
        .reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);

      await connection.query(
        `UPDATE investment_interest_schedules 
         SET status = 'CANCELLED', updated_by = ?,
             remarks = COALESCE(CONCAT(remarks, ' | Cancelled due to preclosure'), 'Cancelled due to preclosure')
         WHERE subscription_id = ? AND status = 'PENDING'`,
        [userId, Number(id)]
      );

      await connection.query(
        `UPDATE investment_subscriptions 
         SET status = 'PRECLOSED', 
             preclosure_date = ?, 
             preclosure_principal_amount = ?, 
             preclosure_interest_amount = ?, 
             preclosure_total_amount = ?, 
             preclosure_reason = ?, 
             completed_date = ?, 
             principal_paid = TRUE,
             principal_paid_date = ?,
             principal_paid_amount = ?,
             principal_pending_amount = 0.00,
             pending_installments = 0,
             total_interest_pending = 0.00,
             next_interest_due_date = NULL,
             updated_by = ? 
         WHERE id = ?`,
        [
          todayStr,
          principalAmount,
          totalPaidInterest,
          Number((principalAmount + totalPaidInterest).toFixed(2)),
          reason || remarks || "Customer requested preclosure",
          todayStr,
          todayStr,
          principalAmount,
          userId,
          Number(id),
        ]
      );
    } else {
      let completedDate = oldData.completed_date;
      if (newStatus === "COMPLETED") {
        completedDate = todayStr;
      }
      await connection.query(
        `UPDATE investment_subscriptions 
         SET status = ?, completed_date = ?, updated_by = ? 
         WHERE id = ?`,
        [newStatus, completedDate, userId, Number(id)]
      );
    }

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "investment_subscriptions",
      recordId: Number(id),
      action: "UPDATE_STATUS",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Updated subscription #${id} status to ${newStatus}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Subscription status updated to ${newStatus}`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update investment subscription status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating subscription status",
    });
  } finally {
    connection.release();
  }
};

// Backwards-compatible alias for updateInvestmentSubscriptionStatus
export const updateInvestmentSubscription = updateInvestmentSubscriptionStatus;

/**
 * DELETE INVESTMENT SUBSCRIPTION
 * Blocked if any interest payments or principal repayments have been completed.
 */
export const deleteInvestmentSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required",
      });
    }

    const [existingRows] = await connection.query(
      `SELECT * FROM investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment subscription not found",
      });
    }

    const oldData = existingRows[0];

    // 1. Check if principal was marked as paid
    if (oldData.principal_paid || Number(oldData.principal_paid_amount) > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_PAID_SUBSCRIPTION",
        message: `Cannot delete subscription #${id}: Principal repayment of ₹${oldData.principal_paid_amount} has already been recorded.`,
      });
    }

    // 2. Check if any interest installments have been paid
    const [paidSchedules] = await connection.query(
      `SELECT COUNT(*) AS paid_count 
       FROM investment_interest_schedules 
       WHERE subscription_id = ? AND (status = 'PAID' OR paid_amount > 0)`,
      [Number(id)]
    );

    const paidCount = paidSchedules[0]?.paid_count || 0;
    if (paidCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIPTION_WITH_PAYMENTS",
        message: `Cannot delete subscription #${id}: ${paidCount} interest payout(s) have already been processed. You can change its status to CANCELLED instead.`,
      });
    }

    // 3. Check if payments exist in investment_payments
    const [payments] = await connection.query(
      `SELECT COUNT(*) AS payment_count 
       FROM investment_payments 
       WHERE subscription_id = ?`,
      [Number(id)]
    );

    const paymentCount = payments[0]?.payment_count || 0;
    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_SUBSCRIPTION_WITH_PAYMENTS",
        message: `Cannot delete subscription #${id}: Associated payment records exist in investment_payments.`,
      });
    }

    // 4. Delete child schedules
    await connection.query(
      `DELETE FROM investment_interest_schedules WHERE subscription_id = ?`,
      [Number(id)]
    );

    // 5. Delete subscription
    await connection.query(
      `DELETE FROM investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    // 6. Audit Log
    await AuditLog({
      connection,
      table: "investment_subscriptions",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || `Deleted investment subscription #${id}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Investment subscription and associated schedules deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting investment subscription",
    });
  } finally {
    connection.release();
  }
};
