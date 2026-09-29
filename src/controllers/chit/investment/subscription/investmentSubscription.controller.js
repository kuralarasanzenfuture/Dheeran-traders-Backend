import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import {
  formatDateOnly,
  addDaysToDateStr,
  generateFullInterestSchedule,
} from "../../../../utils/generateInvestmentSchedule.js";

const VALID_SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "INTEREST_STARTED",
  "COMPLETED",
  "PRECLOSED",
  "CANCELLED",
];

/**
 * CREATE INVESTMENT SUBSCRIPTION + GENERATE FULL SCHEDULE UPFRONT
 * 
 * Step 1:
 * - Validates customer, active plan, and plan amount tier.
 * - Computes lock_in_end_date = investment_date + plan.lock_in_days.
 * - Sets interest_start_date (>= lock_in_end_date).
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

    // 5. Date Calculations & Validations
    // Default investment_date to today
    let cleanInvestmentDate;
    try {
      cleanInvestmentDate = formatDateOnly(investment_date || new Date());
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid investment_date format. Expected YYYY-MM-DD",
      });
    }

    // Calculate lock_in_end_date = investment_date + plan.lock_in_days
    const lockInEndDate = addDaysToDateStr(cleanInvestmentDate, plan.lock_in_days);

    // Validate or default interest_start_date
    let cleanInterestStartDate;
    if (interest_start_date) {
      try {
        cleanInterestStartDate = formatDateOnly(interest_start_date);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid interest_start_date format. Expected YYYY-MM-DD",
        });
      }

      if (cleanInterestStartDate < lockInEndDate) {
        return res.status(400).json({
          success: false,
          message: `interest_start_date (${cleanInterestStartDate}) must be greater than or equal to lock_in_end_date (${lockInEndDate})`,
        });
      }
    } else {
      // Default to lock_in_end_date as demonstrated in standard flow
      cleanInterestStartDate = lockInEndDate;
    }

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

      // Check min and max limits from amount tier
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
      // Default to the tier's minimum interest amount
      finalInterestAmount = Number(planAmount.minimum_interest_amount || 0);
    }

    // 8. Insert Subscription (temporary interest_end_date)
    const [subResult] = await connection.query(
      `INSERT INTO investment_subscriptions (
        customer_id,
        plan_id,
        plan_amount_id,
        principal_amount,
        investment_date,
        lock_in_end_date,
        interest_start_date,
        interest_end_date,
        status,
        principal_paid,
        principal_paid_amount,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', FALSE, 0.00, ?)`,
      [
        customer_id,
        plan_id,
        plan_amount_id,
        principalAmount,
        cleanInvestmentDate,
        lockInEndDate,
        cleanInterestStartDate,
        null, // will be updated once schedule is generated
        userId,
      ]
    );

    const subscriptionId = subResult.insertId;

    // 9. Generate FULL 52-week interest schedule upfront
    const { schedules, valuesForInsert, interestEndDate } =
      generateFullInterestSchedule({
        subscriptionId,
        interestStartDate: cleanInterestStartDate,
        totalInstallments: total_installments,
        weeklyInterestAmount: finalInterestAmount,
        createdBy: userId,
      });

    // 10. Bulk insert into investment_interest_schedules
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
      [valuesForInsert]
    );

    // 11. Update subscription with final interest_end_date
    await connection.query(
      `UPDATE investment_subscriptions SET interest_end_date = ? WHERE id = ?`,
      [interestEndDate, subscriptionId]
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
 * GET ALL INVESTMENT SUBSCRIPTIONS
 * Query filters: customer_id, plan_id, status, search, from_date, to_date
 */
export const getAllInvestmentSubscriptions = async (req, res) => {
  try {
    const {
      customer_id,
      plan_id,
      status,
      principal_paid,
      search,
      from_date,
      to_date,
    } = req.query;

    let query = `
      SELECT 
        s.id,
        s.customer_id,
        s.plan_id,
        s.plan_amount_id,
        s.principal_amount,
        s.investment_date,
        s.lock_in_end_date,
        s.interest_start_date,
        s.interest_end_date,
        s.status,
        s.principal_paid,
        s.principal_paid_date,
        s.principal_paid_amount,
        s.completed_date,
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
        (SELECT COUNT(*) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id) AS total_schedules_count,
        (SELECT COUNT(*) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id AND iis.status = 'PAID') AS paid_schedules_count,
        (SELECT COUNT(*) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id AND iis.status = 'PENDING') AS pending_schedules_count,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id AND iis.status = 'PAID') AS total_interest_paid,
        (SELECT COALESCE(SUM(interest_amount), 0) FROM investment_interest_schedules iis WHERE iis.subscription_id = s.id) AS total_interest_payable
      FROM investment_subscriptions s
      JOIN chit_customers c ON s.customer_id = c.id
      JOIN investment_plans p ON s.plan_id = p.id
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
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR p.plan_name LIKE ? OR p.plan_code LIKE ?)`;
      params.push(term, term, term, term);
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
 * UPDATE INVESTMENT SUBSCRIPTION
 * Allows updating status (e.g. 'INTEREST_STARTED', 'COMPLETED', 'PRECLOSED', 'CANCELLED').
 * If cancelled or preclosed, cancels remaining unpaid schedules.
 */
export const updateInvestmentSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, remarks } = req.body || {};
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

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required to update subscription state",
      });
    }

    const targetStatus = String(status).toUpperCase();
    if (!VALID_SUBSCRIPTION_STATUSES.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${VALID_SUBSCRIPTION_STATUSES.join(", ")}`,
      });
    }

    let completedDate = oldData.completed_date;
    if (targetStatus === "COMPLETED" || targetStatus === "PRECLOSED") {
      completedDate = formatDateOnly(new Date());
    }

    // Update subscription
    await connection.query(
      `UPDATE investment_subscriptions 
       SET status = ?, completed_date = ?, updated_by = ? 
       WHERE id = ?`,
      [targetStatus, completedDate, userId, Number(id)]
    );

    // If PRECLOSED or CANCELLED, cancel all remaining PENDING schedules
    if (targetStatus === "PRECLOSED" || targetStatus === "CANCELLED") {
      await connection.query(
        `UPDATE investment_interest_schedules 
         SET status = 'CANCELLED', updated_by = ? 
         WHERE subscription_id = ? AND status = 'PENDING'`,
        [userId, Number(id)]
      );
    }

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_subscriptions WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // Audit Log
    await AuditLog({
      connection,
      table: "investment_subscriptions",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Updated subscription #${id} status to ${targetStatus}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Subscription status updated to ${targetStatus}`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update investment subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating investment subscription",
    });
  } finally {
    connection.release();
  }
};

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
