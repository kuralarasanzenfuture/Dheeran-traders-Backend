import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import {
  formatDateOnly,
  generateMonthlyInterestSchedules,
  generateMonthlySubscriptionNo,
  calculateFirstScheduleDate,
} from "../../../../utils/generateMonthlyInvestmentSchedule.js";

const VALID_SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "MATURED",
  "COMPLETED",
  "PRECLOSED",
  "CANCELLED",
];

/**
 * CREATE MONTHLY INVESTMENT SUBSCRIPTION + ALL SCHEDULES UPFRONT
 *
 * Business Rules:
 * 1. User only provides: customer_id, plan_id, plan_amount_id (and optional quantity, subscription_start_date, remarks).
 * 2. subscription_end_date is strictly derived from plan.plan_end_date.
 * 3. Schedule dates respect plan.interest_payment_days.
 * 4. First schedule is the nearest allowed date >= subscription_start_date.
 * 5. Full future schedules generated immediately within a single transaction.
 */
export const createMonthlyInvestmentSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      customer_id,
      plan_id,
      plan_amount_id,
      quantity = 1,
      subscription_start_date,
      monthly_interest_amount_per_quantity,
      remarks,
    } = req.body;

    const userId = req.user?.id || null;

    // 1. Validate required fields
    if (!customer_id || isNaN(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "customer_id is required and must be a valid number",
      });
    }

    if (!plan_id || isNaN(plan_id)) {
      return res.status(400).json({
        success: false,
        message: "plan_id is required and must be a valid number",
      });
    }

    if (!plan_amount_id || isNaN(plan_amount_id)) {
      return res.status(400).json({
        success: false,
        message: "plan_amount_id is required and must be a valid number",
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
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Monthly investment plan with ID ${plan_id} not found`,
      });
    }

    const plan = planRows[0];
    if (plan.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: `Monthly investment plan "${plan.plan_name}" is currently ${plan.status}. Subscriptions can only be created under ACTIVE plans.`,
      });
    }

    // 4. Verify Plan Amount Tier
    const [amountRows] = await connection.query(
      `SELECT * FROM monthly_investment_plan_amounts WHERE id = ? AND plan_id = ?`,
      [plan_amount_id, plan_id]
    );

    if (amountRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Plan amount tier with ID ${plan_amount_id} not found for plan "${plan.plan_name}"`,
      });
    }

    const planAmount = amountRows[0];
    if (!planAmount.is_active) {
      return res.status(400).json({
        success: false,
        message: `The selected principal amount tier ₹${planAmount.principal_amount} is currently deactivated.`,
      });
    }

    // 5. Subscription Dates
    const cleanStartDate = formatDateOnly(
      subscription_start_date || new Date()
    );
    const cleanPlanStartDate = formatDateOnly(plan.plan_start_date);
    const cleanPlanEndDate = formatDateOnly(plan.plan_end_date);

    if (!cleanStartDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription_start_date format. Expected YYYY-MM-DD",
      });
    }

    // Validate joining date is within plan boundaries
    if (cleanStartDate < cleanPlanStartDate) {
      return res.status(400).json({
        success: false,
        message: `subscription_start_date (${cleanStartDate}) cannot be before the plan start date (${cleanPlanStartDate})`,
      });
    }

    if (cleanStartDate > cleanPlanEndDate) {
      return res.status(400).json({
        success: false,
        message: `subscription_start_date (${cleanStartDate}) cannot be after the plan end date (${cleanPlanEndDate})`,
      });
    }

    // RULE 1: Subscription end date is strictly derived from plan.plan_end_date
    const subscriptionEndDate = cleanPlanEndDate;

    // 6. Calculate Financial Amounts
    const principalAmountPerQuantity = Number(planAmount.principal_amount);
    const totalPrincipalAmount = Number(
      (principalAmountPerQuantity * quantity).toFixed(2)
    );

    // Determine monthly interest amount per quantity
    let monthlyInterestPerUnit;
    if (monthly_interest_amount_per_quantity !== undefined && monthly_interest_amount_per_quantity !== null) {
      const customRate = Number(monthly_interest_amount_per_quantity);
      if (isNaN(customRate) || customRate < 0) {
        return res.status(400).json({
          success: false,
          message: "monthly_interest_amount_per_quantity must be a valid non-negative number",
        });
      }

      const minInterest = Number(planAmount.minimum_monthly_interest || 0);
      const maxInterest = Number(planAmount.maximum_monthly_interest || minInterest);

      if (customRate < minInterest || customRate > maxInterest) {
        return res.status(400).json({
          success: false,
          message: `monthly_interest_amount_per_quantity (₹${customRate}) must be within the tier range ₹${minInterest} - ₹${maxInterest}`,
        });
      }
      monthlyInterestPerUnit = Number(customRate.toFixed(2));
    } else {
      // Default to tier minimum monthly interest
      monthlyInterestPerUnit = Number(
        Number(planAmount.minimum_monthly_interest || 0).toFixed(2)
      );
    }

    const totalMonthlyInterestAmount = Number(
      (monthlyInterestPerUnit * quantity).toFixed(2)
    );

    // 7. Generate Full Upfront Interest Schedules
    const allowedDays = plan.interest_payment_days || "1, 5, 10, 15, 20, 25, 30";
    const generatedSchedules = generateMonthlyInterestSchedules({
      subscriptionStartDate: cleanStartDate,
      planEndDate: subscriptionEndDate,
      allowedDays,
      totalMonthlyInterestAmount,
    });

    if (generatedSchedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot create subscription: no valid interest schedule dates exist between ${cleanStartDate} and ${subscriptionEndDate} under the plan's configured payment days (${allowedDays})`,
      });
    }

    const totalInterestMonths = generatedSchedules.length;
    const firstInterestDueDate = generatedSchedules[0].interest_due_date;
    const nextInterestDueDate = generatedSchedules[0].interest_due_date;
    const totalInterestAmount = Number(
      (totalMonthlyInterestAmount * totalInterestMonths).toFixed(2)
    );
    const maturityPrincipalAmount = totalPrincipalAmount;
    const maturityInterestAmount = totalInterestAmount;
    const maturityTotalAmount = Number(
      (totalPrincipalAmount + totalInterestAmount).toFixed(2)
    );

    // 8. Generate Unique Subscription Number
    const subscriptionNo = await generateMonthlySubscriptionNo(connection);

    // 9. Insert into monthly_investment_subscriptions
    const [subResult] = await connection.query(
      `INSERT INTO monthly_investment_subscriptions (
        subscription_no,
        customer_id,
        plan_id,
        plan_amount_id,
        quantity,
        principal_amount_per_quantity,
        total_principal_amount,
        monthly_interest_amount_per_quantity,
        total_monthly_interest_amount,
        subscription_start_date,
        subscription_end_date,
        first_interest_due_date,
        next_interest_due_date,
        total_interest_months,
        completed_interest_months,
        pending_interest_months,
        total_interest_amount,
        total_interest_paid,
        total_interest_pending,
        principal_paid,
        principal_paid_amount,
        principal_pending_amount,
        maturity_principal_amount,
        maturity_interest_amount,
        maturity_total_amount,
        maturity_date,
        status,
        created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        subscriptionNo,
        customer_id,
        plan_id,
        plan_amount_id,
        quantity,
        principalAmountPerQuantity,
        totalPrincipalAmount,
        monthlyInterestPerUnit,
        totalMonthlyInterestAmount,
        cleanStartDate,
        subscriptionEndDate,
        firstInterestDueDate,
        nextInterestDueDate,
        totalInterestMonths,
        0, // completed_interest_months
        totalInterestMonths, // pending_interest_months
        totalInterestAmount,
        0.0, // total_interest_paid
        totalInterestAmount, // total_interest_pending
        false, // principal_paid
        0.0, // principal_paid_amount
        totalPrincipalAmount, // principal_pending_amount
        maturityPrincipalAmount,
        maturityInterestAmount,
        maturityTotalAmount,
        subscriptionEndDate, // maturity_date
        "ACTIVE",
        userId,
      ]
    );

    const subscriptionId = subResult.insertId;

    // 10. Batch Insert all generated schedules into monthly_investment_interest_schedules
    const scheduleValues = generatedSchedules.map((s) => [
      subscriptionId,
      s.interest_no,
      s.period_start_date,
      s.period_end_date,
      s.interest_due_date,
      s.interest_amount,
      s.paid_amount,
      s.pending_amount,
      s.status,
      userId,
    ]);

    await connection.query(
      `INSERT INTO monthly_investment_interest_schedules (
        subscription_id,
        interest_no,
        period_start_date,
        period_end_date,
        interest_due_date,
        interest_amount,
        paid_amount,
        pending_amount,
        status,
        created_by
      ) VALUES ?`,
      [scheduleValues]
    );

    // 11. Fetch Created Subscription Record
    const [subRows] = await connection.query(
      `SELECT 
        mis.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        mip.plan_name,
        mip.plan_code,
        mip.interest_payment_days
       FROM monthly_investment_subscriptions mis
       JOIN chit_customers c ON mis.customer_id = c.id
       JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
       WHERE mis.id = ?`,
      [subscriptionId]
    );

    const createdSubscription = subRows[0];

    // 12. Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_subscriptions",
      recordId: subscriptionId,
      action: "INSERT",
      newData: createdSubscription,
      userId,
      remarks:
        remarks ||
        `Created monthly investment subscription ${subscriptionNo} for customer ${customer.name} (Plan: ${plan.plan_name}, Total Principal: ₹${totalPrincipalAmount}, Months: ${totalInterestMonths})`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Monthly investment subscription and interest schedules created successfully",
      data: createdSubscription,
      schedules_count: generatedSchedules.length,
      schedules: generatedSchedules,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create monthly investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating monthly investment subscription",
    });
  } finally {
    connection.release();
  }
};

/**
 * PREVIEW SUBSCRIPTION & GENERATED SCHEDULES (Without DB Commit)
 * Allows frontend to display summary, installment dates, and expected interest before customer confirms.
 */
export const previewMonthlyInvestmentSubscription = async (req, res) => {
  try {
    const input = { ...req.query, ...req.body };
    let {
      plan_id,
      plan_amount_id,
      quantity = 1,
      subscription_start_date,
      monthly_interest_amount_per_quantity,
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

    const [planRows] = await db.query(
      `SELECT * FROM monthly_investment_plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const plan = planRows[0];

    const [amountRows] = await db.query(
      `SELECT * FROM monthly_investment_plan_amounts WHERE id = ? AND plan_id = ?`,
      [plan_amount_id, plan_id]
    );

    if (amountRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan amount tier not found",
      });
    }

    const planAmount = amountRows[0];

    const cleanStartDate = formatDateOnly(
      subscription_start_date || new Date()
    );
    const subscriptionEndDate = formatDateOnly(plan.plan_end_date);

    const principalPerUnit = Number(planAmount.principal_amount);
    const totalPrincipal = Number((principalPerUnit * quantity).toFixed(2));

    const interestPerUnit = Number(
      monthly_interest_amount_per_quantity !== undefined
        ? monthly_interest_amount_per_quantity
        : planAmount.minimum_monthly_interest || 0
    );
    const totalMonthlyInterest = Number((interestPerUnit * quantity).toFixed(2));

    const schedules = generateMonthlyInterestSchedules({
      subscriptionStartDate: cleanStartDate,
      planEndDate: subscriptionEndDate,
      allowedDays: plan.interest_payment_days,
      totalMonthlyInterestAmount: totalMonthlyInterest,
    });

    const totalInterestAmount = Number(
      (totalMonthlyInterest * schedules.length).toFixed(2)
    );

    return res.status(200).json({
      success: true,
      data: {
        plan_id: plan.id,
        plan_name: plan.plan_name,
        plan_code: plan.plan_code,
        subscription_start_date: cleanStartDate,
        subscription_end_date: subscriptionEndDate,
        allowed_payment_days: plan.interest_payment_days,
        first_schedule_date: schedules.length > 0 ? schedules[0].interest_due_date : null,
        quantity,
        principal_amount_per_quantity: principalPerUnit,
        total_principal_amount: totalPrincipal,
        monthly_interest_amount_per_quantity: interestPerUnit,
        total_monthly_interest_amount: totalMonthlyInterest,
        total_interest_months: schedules.length,
        total_interest_amount: totalInterestAmount,
        maturity_total_amount: Number((totalPrincipal + totalInterestAmount).toFixed(2)),
        schedules_count: schedules.length,
        schedules,
      },
    });
  } catch (error) {
    console.error("Preview monthly investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while previewing subscription",
    });
  }
};

/**
 * GET ALL MONTHLY INVESTMENT SUBSCRIPTIONS
 * Supports filters: status, customer_id, plan_id, search, startDate, endDate
 */
export const getAllMonthlyInvestmentSubscriptions = async (req, res) => {
  try {
    const {
      status,
      customer_id,
      plan_id,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    let query = `
      SELECT 
        mis.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        mip.plan_name,
        mip.plan_code,
        mip.interest_payment_days,
        mipa.principal_amount AS tier_principal_amount
      FROM monthly_investment_subscriptions mis
      JOIN chit_customers c ON mis.customer_id = c.id
      JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
      JOIN monthly_investment_plan_amounts mipa ON mis.plan_amount_id = mipa.id
      WHERE 1=1
    `;
    const params = [];

    if (status && VALID_SUBSCRIPTION_STATUSES.includes(status.toUpperCase())) {
      query += ` AND mis.status = ?`;
      params.push(status.toUpperCase());
    }

    if (customer_id && !isNaN(customer_id)) {
      query += ` AND mis.customer_id = ?`;
      params.push(Number(customer_id));
    }

    if (plan_id && !isNaN(plan_id)) {
      query += ` AND mis.plan_id = ?`;
      params.push(Number(plan_id));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (mis.subscription_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR mip.plan_name LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (startDate) {
      query += ` AND mis.subscription_start_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND mis.subscription_end_date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY mis.id DESC`;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Count query
    const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS sub_count_tbl`;
    const [countRows] = await db.query(countQuery, params);
    const totalCount = countRows[0]?.total || 0;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get all monthly investment subscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment subscriptions",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT SUBSCRIPTION BY ID
 * Includes customer details, plan details, amount tier, and interest schedules.
 */
export const getMonthlyInvestmentSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid monthly investment subscription ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        mis.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        mip.plan_name,
        mip.plan_code,
        mip.interest_payment_days,
        mipa.principal_amount AS tier_principal_amount,
        mipa.minimum_monthly_interest,
        mipa.maximum_monthly_interest
      FROM monthly_investment_subscriptions mis
      JOIN chit_customers c ON mis.customer_id = c.id
      JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
      JOIN monthly_investment_plan_amounts mipa ON mis.plan_amount_id = mipa.id
      WHERE mis.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment subscription not found",
      });
    }

    const subscription = rows[0];

    // Fetch interest schedules for this subscription
    const [schedules] = await db.query(
      `SELECT * FROM monthly_investment_interest_schedules 
       WHERE subscription_id = ? 
       ORDER BY interest_no ASC`,
      [subscription.id]
    );

    subscription.schedules = schedules;

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Get monthly investment subscription by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment subscription",
    });
  }
};

/**
 * HELPER: CALCULATE PRECLOSURE AMOUNTS
 */
export const calculatePreclosureDetails = (subscription, schedules, preclosureDateStr, customInterest = undefined) => {
  const totalPrincipal = Number(subscription.total_principal_amount || 0);
  const principalPaid = Number(subscription.principal_paid_amount || 0);
  const preclosurePrincipal = Math.max(0, Number((totalPrincipal - principalPaid).toFixed(2)));

  // Due/unpaid schedules up to preclosure date
  const dueSchedules = schedules.filter(
    (s) => s.interest_due_date <= preclosureDateStr && ["DUE", "PARTIAL", "PENDING"].includes(s.status)
  );

  const dueUnpaidInterest = dueSchedules.reduce(
    (sum, s) => sum + Number(s.pending_amount || 0),
    0
  );

  const preclosureInterest =
    customInterest !== undefined && !isNaN(customInterest) && customInterest !== null
      ? Number(Number(customInterest).toFixed(2))
      : Number(dueUnpaidInterest.toFixed(2));

  const preclosureTotal = Number((preclosurePrincipal + preclosureInterest).toFixed(2));

  const futureSchedulesToCancel = schedules.filter(
    (s) => s.interest_due_date > preclosureDateStr && s.status !== "PAID"
  );

  return {
    total_principal_amount: totalPrincipal,
    principal_already_paid: principalPaid,
    preclosure_principal_amount: preclosurePrincipal,
    due_unpaid_interest_amount: Number(dueUnpaidInterest.toFixed(2)),
    preclosure_interest_amount: preclosureInterest,
    preclosure_total_amount: preclosureTotal,
    close_amount: preclosureTotal,
    due_schedules_count: dueSchedules.length,
    future_schedules_to_cancel_count: futureSchedulesToCancel.length,
    future_schedules_to_cancel: futureSchedulesToCancel.map((s) => ({
      id: s.id,
      interest_no: s.interest_no,
      interest_due_date: s.interest_due_date,
      interest_amount: Number(s.interest_amount),
      status: s.status,
    })),
  };
};

/**
 * PREVIEW PRECLOSURE CLOSE AMOUNT (Without DB Commit)
 * Allows frontend to display the exact close amount and breakdown before confirming.
 */
export const getMonthlyInvestmentSubscriptionPreclosurePreview = async (req, res) => {
  try {
    const { id } = req.params;
    const { preclosure_date, interest_amount } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT mis.*, c.name AS customer_name, c.phone AS customer_phone, mip.plan_name, mip.plan_code
       FROM monthly_investment_subscriptions mis
       JOIN chit_customers c ON mis.customer_id = c.id
       JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
       WHERE mis.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment subscription not found",
      });
    }

    const subscription = rows[0];

    if (["CANCELLED", "PRECLOSED", "COMPLETED"].includes(subscription.status)) {
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_TERMINATED",
        message: `Subscription ${subscription.subscription_no} is already ${subscription.status} and cannot be preclosed.`,
      });
    }

    const targetDateStr = preclosure_date ? formatDateOnly(new Date(preclosure_date)) : formatDateOnly(new Date());

    const [schedules] = await db.query(
      `SELECT * FROM monthly_investment_interest_schedules 
       WHERE subscription_id = ? 
       ORDER BY interest_no ASC`,
      [subscription.id]
    );

    const calculation = calculatePreclosureDetails(
      subscription,
      schedules,
      targetDateStr,
      interest_amount !== undefined ? Number(interest_amount) : undefined
    );

    return res.status(200).json({
      success: true,
      data: {
        subscription_id: subscription.id,
        subscription_no: subscription.subscription_no,
        customer_id: subscription.customer_id,
        customer_name: subscription.customer_name,
        customer_phone: subscription.customer_phone,
        plan_name: subscription.plan_name,
        plan_code: subscription.plan_code,
        status: subscription.status,
        preclosure_date: targetDateStr,
        ...calculation,
      },
    });
  } catch (error) {
    console.error("Get preclosure preview error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while calculating preclosure preview",
    });
  }
};

/**
 * UPDATE MONTHLY INVESTMENT SUBSCRIPTION STATUS
 * Transitions: ACTIVE -> MATURED, PRECLOSED, CANCELLED
 * Validates payments before cancellation and calculates preclosure close amount correctly.
 */
export const updateMonthlyInvestmentSubscriptionStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, reason, remarks, interest_amount, payment_mode, transaction_reference, record_payment = true } = req.body;
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
      `SELECT * FROM monthly_investment_subscriptions WHERE id = ? FOR UPDATE`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment subscription not found",
      });
    }

    const oldData = rows[0];
    const todayStr = formatDateOnly(new Date());

    // Check if subscription is already in a terminal state
    if (["COMPLETED", "PRECLOSED", "CANCELLED"].includes(oldData.status)) {
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_ALREADY_TERMINATED",
        message: `Subscription ${oldData.subscription_no} is already ${oldData.status} and its status cannot be modified.`,
      });
    }

    let preclosureDate = oldData.preclosure_date;
    let preclosureReason = oldData.preclosure_reason;
    let preclosurePrincipal = Number(oldData.preclosure_principal_amount || 0);
    let preclosureInterest = Number(oldData.preclosure_interest_amount || 0);
    let preclosureTotal = Number(oldData.preclosure_total_amount || 0);
    let cancelledDate = oldData.cancelled_date;
    let cancellationReason = oldData.cancellation_reason;
    let completedDate = oldData.completed_date;
    let cancelledSchedulesCount = 0;
    let preclosureSummary = null;

    if (newStatus === "CANCELLED") {
      // 1. Validate if ANY payment has already been made on this subscription
      const [payments] = await connection.query(
        `SELECT COUNT(*) AS pay_count FROM monthly_investment_payments WHERE subscription_id = ?`,
        [Number(id)]
      );

      const hasPaidAmounts =
        Number(oldData.total_interest_paid || 0) > 0 ||
        Number(oldData.principal_paid_amount || 0) > 0;

      const [paidSchedules] = await connection.query(
        `SELECT COUNT(*) AS paid_count FROM monthly_investment_interest_schedules 
         WHERE subscription_id = ? AND (paid_amount > 0 OR status IN ('PAID', 'PARTIAL'))`,
        [Number(id)]
      );

      if ((payments[0]?.pay_count || 0) > 0 || hasPaidAmounts || (paidSchedules[0]?.paid_count || 0) > 0) {
        return res.status(400).json({
          success: false,
          code: "CANNOT_CANCEL_PAID_SUBSCRIPTION",
          message: `Cannot cancel subscription ${oldData.subscription_no} because payment(s) have already been processed for it. Please use PRECLOSED instead.`,
        });
      }

      // No payment made -> safely cancel subscription and all unpaid schedules
      cancelledDate = todayStr;
      cancellationReason = reason || remarks || "Subscription cancelled";

      const [cancelSchedulesResult] = await connection.query(
        `UPDATE monthly_investment_interest_schedules 
         SET status = 'CANCELLED', 
             pending_amount = 0.00, 
             remarks = COALESCE(CONCAT(remarks, ' | Cancelled with subscription'), 'Cancelled with subscription'), 
             updated_by = ? 
         WHERE subscription_id = ? AND status IN ('PENDING', 'DUE')`,
        [userId, Number(id)]
      );

      cancelledSchedulesCount = cancelSchedulesResult.affectedRows || 0;

      await connection.query(
        `UPDATE monthly_investment_subscriptions 
         SET status = 'CANCELLED', 
             cancelled_date = ?, 
             cancellation_reason = ?, 
             pending_interest_months = 0,
             total_interest_pending = 0.00,
             next_interest_due_date = NULL,
             updated_by = ? 
         WHERE id = ?`,
        [cancelledDate, cancellationReason, userId, Number(id)]
      );
    } else if (newStatus === "PRECLOSED") {
      // 2. Preclosure with accurate close amount calculation
      preclosureDate = todayStr;
      preclosureReason = reason || remarks || "Customer requested preclosure";
      completedDate = todayStr;

      // Fetch all schedules for this subscription to calculate close amount
      const [schedules] = await connection.query(
        `SELECT * FROM monthly_investment_interest_schedules 
         WHERE subscription_id = ? 
         ORDER BY interest_no ASC`,
        [Number(id)]
      );

      const calc = calculatePreclosureDetails(
        oldData,
        schedules,
        todayStr,
        interest_amount !== undefined ? Number(interest_amount) : undefined
      );

      preclosurePrincipal = calc.preclosure_principal_amount;
      preclosureInterest = calc.preclosure_interest_amount;
      preclosureTotal = calc.preclosure_total_amount;

      // Cancel all future schedules (due date > todayStr or PENDING status)
      const [cancelFutureResult] = await connection.query(
        `UPDATE monthly_investment_interest_schedules 
         SET status = 'CANCELLED', 
             pending_amount = 0.00, 
             remarks = COALESCE(CONCAT(remarks, ' | Cancelled due to preclosure'), 'Cancelled due to preclosure'), 
             updated_by = ? 
         WHERE subscription_id = ? AND (interest_due_date > ? OR status = 'PENDING')`,
        [userId, Number(id), todayStr]
      );

      cancelledSchedulesCount = cancelFutureResult.affectedRows || 0;

      // Update subscription record
      await connection.query(
        `UPDATE monthly_investment_subscriptions 
         SET status = 'PRECLOSED', 
             preclosure_date = ?, 
             preclosure_principal_amount = ?, 
             preclosure_interest_amount = ?, 
             preclosure_total_amount = ?, 
             preclosure_reason = ?, 
             completed_date = ?, 
             principal_paid = TRUE,
             principal_paid_date = ?,
             principal_paid_amount = total_principal_amount,
             principal_pending_amount = 0.00,
             pending_interest_months = 0,
             total_interest_pending = 0.00,
             next_interest_due_date = NULL,
             updated_by = ? 
         WHERE id = ?`,
        [
          preclosureDate,
          preclosurePrincipal,
          preclosureInterest,
          preclosureTotal,
          preclosureReason,
          completedDate,
          todayStr,
          userId,
          Number(id),
        ]
      );

      // Record preclosure payment if requested
      if (record_payment !== false && preclosureTotal > 0) {
        await connection.query(
          `INSERT INTO monthly_investment_payments (
            subscription_id, customer_id, payment_type, 
            principal_amount, interest_amount, total_amount, 
            payment_mode, transaction_reference, remarks, paid_by
          ) VALUES (?, ?, 'PRECLOSURE', ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(id),
            oldData.customer_id,
            preclosurePrincipal,
            preclosureInterest,
            preclosureTotal,
            payment_mode || "CASH",
            transaction_reference || null,
            preclosureReason,
            userId,
          ]
        );
      }

      preclosureSummary = {
        subscription_id: Number(id),
        subscription_no: oldData.subscription_no,
        customer_id: oldData.customer_id,
        total_principal_amount: Number(oldData.total_principal_amount),
        principal_already_paid: Number(oldData.principal_paid_amount || 0),
        preclosure_principal_amount: preclosurePrincipal,
        preclosure_interest_amount: preclosureInterest,
        preclosure_total_amount: preclosureTotal,
        close_amount: preclosureTotal,
        preclosure_date: preclosureDate,
        preclosure_reason: preclosureReason,
        future_cancelled_schedules_count: cancelledSchedulesCount,
      };
    } else {
      // Other status transitions: MATURED, COMPLETED, ACTIVE
      if (newStatus === "COMPLETED" || newStatus === "MATURED") {
        completedDate = todayStr;
      }

      await connection.query(
        `UPDATE monthly_investment_subscriptions 
         SET status = ?, 
             completed_date = ?, 
             updated_by = ? 
         WHERE id = ?`,
        [newStatus, completedDate, userId, Number(id)]
      );
    }

    const [updatedRows] = await connection.query(
      `SELECT * FROM monthly_investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "monthly_investment_subscriptions",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Changed subscription ${oldData.subscription_no} status from ${oldData.status} to ${newStatus}${
          newStatus === "PRECLOSED" ? ` (Close Amount: ₹${preclosureTotal})` : ""
        }`,
    });

    await connection.commit();

    const responsePayload = {
      success: true,
      message:
        newStatus === "PRECLOSED"
          ? `Monthly investment subscription ${oldData.subscription_no} has been preclosed successfully. Close amount: ₹${preclosureTotal.toFixed(2)}`
          : newStatus === "CANCELLED"
          ? `Monthly investment subscription ${oldData.subscription_no} cancelled successfully. ${cancelledSchedulesCount} unpaid schedules marked CANCELLED.`
          : `Monthly investment subscription status updated to ${newStatus}`,
      data: updatedData,
      cancelled_schedules_count: cancelledSchedulesCount,
    };

    if (newStatus === "PRECLOSED") {
      responsePayload.close_amount = preclosureTotal;
      responsePayload.preclosure_summary = preclosureSummary;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    await connection.rollback();
    console.error("Update monthly investment subscription status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating subscription status",
    });
  } finally {
    connection.release();
  }
};

/**
 * PRECLOSE MONTHLY INVESTMENT SUBSCRIPTION (Dedicated Endpoint)
 * Route: POST /:id/preclose
 */
export const precloseMonthlyInvestmentSubscription = async (req, res) => {
  req.body = { ...req.body, status: "PRECLOSED" };
  return updateMonthlyInvestmentSubscriptionStatus(req, res);
};

/**
 * DELETE MONTHLY INVESTMENT SUBSCRIPTION
 * Only allowed if no payments have been made and no schedules have been paid.
 */
export const deleteMonthlyInvestmentSubscription = async (req, res) => {
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

    const [rows] = await connection.query(
      `SELECT * FROM monthly_investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment subscription not found",
      });
    }

    const oldData = rows[0];

    // Check if any payments are linked to this subscription
    const [payments] = await connection.query(
      `SELECT COUNT(*) AS pay_count FROM monthly_investment_payments WHERE subscription_id = ?`,
      [Number(id)]
    );

    if (payments[0]?.pay_count > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_PAID_SUBSCRIPTION",
        message: `Cannot delete subscription ${oldData.subscription_no} because ${payments[0].pay_count} payment record(s) exist. Cancel or preclose the subscription instead.`,
      });
    }

    // Check if any schedule has been paid
    const [paidSchedules] = await connection.query(
      `SELECT COUNT(*) AS paid_count FROM monthly_investment_interest_schedules WHERE subscription_id = ? AND paid_amount > 0`,
      [Number(id)]
    );

    if (paidSchedules[0]?.paid_count > 0) {
      return res.status(400).json({
        success: false,
        code: "CANNOT_DELETE_PAID_SCHEDULES",
        message: `Cannot delete subscription ${oldData.subscription_no} because interest schedules have already received payments.`,
      });
    }

    // Delete schedules (CASCADE will delete, but we do explicit delete for clean audit)
    await connection.query(
      `DELETE FROM monthly_investment_interest_schedules WHERE subscription_id = ?`,
      [Number(id)]
    );

    // Delete subscription
    await connection.query(
      `DELETE FROM monthly_investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    await AuditLog({
      connection,
      table: "monthly_investment_subscriptions",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || `Deleted monthly investment subscription ID ${id} (${oldData.subscription_no})`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Monthly investment subscription and schedules deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete monthly investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting subscription",
    });
  } finally {
    connection.release();
  }
};
