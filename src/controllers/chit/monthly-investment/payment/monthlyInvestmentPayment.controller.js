import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import { formatDateOnly } from "../../../../utils/generateMonthlyInvestmentSchedule.js";

const VALID_PAYMENT_TYPES = [
  "INTEREST",
  "PRINCIPAL",
  "INTEREST_AND_PRINCIPAL",
  "PRECLOSURE",
];
const VALID_PAYMENT_MODES = ["CASH", "UPI", "BANK", "CHEQUE"];

/**
 * PROCESS MONTHLY INVESTMENT PAYMENT
 * Handles interest payout to customer, principal repayment, or combined settlement.
 * Strict validation: CANCELLED or PRECLOSED subscriptions CANNOT accept any payment.
 */
export const processMonthlyInvestmentPayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      subscription_id,
      payment_type,
      payment_mode,
      schedule_ids,
      schedule_id,
      interest_amount,
      principal_amount,
      total_amount,
      transaction_reference = null,
      payment_date,
      remarks = null,
    } = req.body;

    const paidBy = req.user?.id || null;

    // 1. Validate required fields
    if (!subscription_id || isNaN(subscription_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required",
      });
    }

    if (!payment_type || typeof payment_type !== "string") {
      return res.status(400).json({
        success: false,
        message: `payment_type is required. Allowed: ${VALID_PAYMENT_TYPES.join(", ")}`,
      });
    }

    payment_type = payment_type.toUpperCase().trim();
    if (!VALID_PAYMENT_TYPES.includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_type. Allowed: ${VALID_PAYMENT_TYPES.join(", ")}`,
      });
    }

    if (!payment_mode || typeof payment_mode !== "string") {
      return res.status(400).json({
        success: false,
        message: `payment_mode is required. Allowed: ${VALID_PAYMENT_MODES.join(", ")}`,
      });
    }

    payment_mode = payment_mode.toUpperCase().trim();
    if (!VALID_PAYMENT_MODES.includes(payment_mode)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_mode. Allowed: ${VALID_PAYMENT_MODES.join(", ")}`,
      });
    }

    // 2. Fetch Subscription with Lock
    const [subRows] = await connection.query(
      `SELECT mis.*, 
              c.name AS customer_name, c.phone AS customer_phone,
              mip.plan_name, mip.plan_code
       FROM monthly_investment_subscriptions mis
       JOIN chit_customers c ON mis.customer_id = c.id
       JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
       WHERE mis.id = ? FOR UPDATE`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Monthly investment subscription #${subscription_id} not found`,
      });
    }

    const subscription = subRows[0];

    // =========================================================================
    // STRICT STATUS VALIDATIONS: CANCELLED / PRECLOSED / COMPLETED CANNOT PAY
    // =========================================================================
    if (subscription.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        code: "CANNOT_PAY_CANCELLED_SUBSCRIPTION",
        message: `Cannot process payment. Subscription ${subscription.subscription_no} is CANCELLED and cannot accept any payments.`,
      });
    }

    if (subscription.status === "PRECLOSED") {
      return res.status(400).json({
        success: false,
        code: "CANNOT_PAY_PRECLOSED_SUBSCRIPTION",
        message: `Cannot process payment. Subscription ${subscription.subscription_no} is PRECLOSED and cannot accept any payments.`,
      });
    }

    if (subscription.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        code: "CANNOT_PAY_COMPLETED_SUBSCRIPTION",
        message: `Cannot process payment. Subscription ${subscription.subscription_no} is COMPLETED and cannot accept further payments.`,
      });
    }

    const customerId = subscription.customer_id;
    const cleanPaymentDate = payment_date ? new Date(payment_date) : new Date();

    if (isNaN(cleanPaymentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment_date format",
      });
    }

    const paymentDateStr = formatDateOnly(cleanPaymentDate);

    // 3. Process INTEREST component
    let calculatedInterestAmount = 0.0;
    const paidScheduleIds = [];
    const paidScheduleDetails = [];

    if (payment_type === "INTEREST" || payment_type === "INTEREST_AND_PRINCIPAL") {
      let targetIds = [];

      if (Array.isArray(schedule_ids) && schedule_ids.length > 0) {
        targetIds = schedule_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
      } else if (schedule_id && !isNaN(schedule_id)) {
        targetIds = [Number(schedule_id)];
      }

      let candidateSchedules = [];

      if (targetIds.length > 0) {
        // Fetch specified schedules
        const [rows] = await connection.query(
          `SELECT * FROM monthly_investment_interest_schedules 
           WHERE subscription_id = ? AND id IN (?) 
           ORDER BY interest_no ASC FOR UPDATE`,
          [subscription.id, targetIds]
        );
        candidateSchedules = rows;
      } else {
        // Auto-select earliest unpaid schedules
        const [rows] = await connection.query(
          `SELECT * FROM monthly_investment_interest_schedules 
           WHERE subscription_id = ? AND status IN ('PENDING', 'DUE', 'PARTIAL') 
           ORDER BY interest_no ASC FOR UPDATE`,
          [subscription.id]
        );
        candidateSchedules = rows;
      }

      if (candidateSchedules.length === 0) {
        return res.status(400).json({
          success: false,
          code: "NO_UNPAID_SCHEDULES",
          message: "No unpaid interest schedules found to process payment for",
        });
      }

      // Validate schedules status
      for (const sched of candidateSchedules) {
        if (sched.status === "CANCELLED") {
          return res.status(400).json({
            success: false,
            code: "SCHEDULE_CANCELLED",
            message: `Cannot process payment for schedule #${sched.interest_no} because it is CANCELLED.`,
          });
        }
        if (sched.status === "PAID") {
          return res.status(400).json({
            success: false,
            code: "SCHEDULE_ALREADY_PAID",
            message: `Schedule #${sched.interest_no} is already fully paid.`,
          });
        }
      }

      // Determine interest allocation
      let remainingInterestPool =
        interest_amount !== undefined && !isNaN(interest_amount) && Number(interest_amount) > 0
          ? Number(interest_amount)
          : candidateSchedules.reduce((sum, s) => sum + Number(s.pending_amount || s.interest_amount), 0);

      for (const sched of candidateSchedules) {
        if (remainingInterestPool <= 0) break;

        const schedPending = Number(sched.pending_amount || sched.interest_amount);
        const schedCurrentPaid = Number(sched.paid_amount || 0);
        const payForThis = Math.min(schedPending, remainingInterestPool);

        const newPaidAmount = Number((schedCurrentPaid + payForThis).toFixed(2));
        const newPendingAmount = Math.max(0, Number((Number(sched.interest_amount) - newPaidAmount).toFixed(2)));
        const newStatus = newPendingAmount === 0 ? "PAID" : "PARTIAL";

        calculatedInterestAmount += payForThis;
        remainingInterestPool = Number((remainingInterestPool - payForThis).toFixed(2));

        paidScheduleIds.push(sched.id);
        paidScheduleDetails.push({
          schedule_id: sched.id,
          interest_no: sched.interest_no,
          interest_due_date: sched.interest_due_date,
          paid_this_time: payForThis,
          new_paid_total: newPaidAmount,
          new_pending: newPendingAmount,
          status: newStatus,
        });

        await connection.query(
          `UPDATE monthly_investment_interest_schedules 
           SET paid_amount = ?, 
               pending_amount = ?, 
               status = ?, 
               paid_date = ?, 
               payment_mode = ?, 
               transaction_reference = ?, 
               remarks = ?, 
               updated_by = ? 
           WHERE id = ?`,
          [
            newPaidAmount,
            newPendingAmount,
            newStatus,
            paymentDateStr,
            payment_mode,
            transaction_reference,
            remarks || `Payment of ₹${payForThis}`,
            paidBy,
            sched.id,
          ]
        );
      }

      calculatedInterestAmount = Number(calculatedInterestAmount.toFixed(2));
    }

    // 4. Process PRINCIPAL component
    let calculatedPrincipalAmount = 0.0;

    if (payment_type === "PRINCIPAL" || payment_type === "INTEREST_AND_PRINCIPAL") {
      if (subscription.principal_paid) {
        return res.status(400).json({
          success: false,
          code: "PRINCIPAL_ALREADY_PAID",
          message: `Principal amount of ₹${subscription.total_principal_amount} has already been returned for subscription ${subscription.subscription_no}`,
        });
      }

      calculatedPrincipalAmount =
        principal_amount !== undefined && !isNaN(principal_amount) && Number(principal_amount) > 0
          ? Number(principal_amount)
          : Number(subscription.total_principal_amount);

      calculatedPrincipalAmount = Number(calculatedPrincipalAmount.toFixed(2));

      await connection.query(
        `UPDATE monthly_investment_subscriptions 
         SET principal_paid = TRUE, 
             principal_paid_date = ?, 
             principal_paid_amount = ?, 
             principal_pending_amount = 0.00, 
             updated_by = ? 
         WHERE id = ?`,
        [paymentDateStr, calculatedPrincipalAmount, paidBy, subscription.id]
      );
    }

    // 5. Calculate Final Payment Total
    const finalTotalAmount = Number((calculatedInterestAmount + calculatedPrincipalAmount).toFixed(2));

    if (finalTotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total payment amount must be greater than zero",
      });
    }

    // 6. Insert Record into monthly_investment_payments
    const [payResult] = await connection.query(
      `INSERT INTO monthly_investment_payments (
        subscription_id, customer_id, payment_type, interest_schedule_id,
        interest_amount, principal_amount, total_amount, payment_date,
        payment_mode, transaction_reference, remarks, paid_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscription.id,
        customerId,
        payment_type,
        paidScheduleIds.length === 1 ? paidScheduleIds[0] : null,
        calculatedInterestAmount,
        calculatedPrincipalAmount,
        finalTotalAmount,
        cleanPaymentDate,
        payment_mode,
        transaction_reference,
        remarks,
        paidBy,
      ]
    );

    const paymentId = payResult.insertId;

    // Link payment_id in schedules that were paid
    if (paidScheduleIds.length > 0) {
      await connection.query(
        `UPDATE monthly_investment_interest_schedules 
         SET payment_id = ? 
         WHERE id IN (?)`,
        [paymentId, paidScheduleIds]
      );
    }

    // 7. Recalculate Subscription Aggregate Interest Status
    const [schedSummary] = await connection.query(
      `SELECT 
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COALESCE(SUM(pending_amount), 0) AS total_pending,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS completed_months,
        COALESCE(SUM(CASE WHEN status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 ELSE 0 END), 0) AS pending_months,
        MIN(CASE WHEN status IN ('PENDING', 'DUE', 'PARTIAL') THEN interest_due_date ELSE NULL END) AS next_due_date
       FROM monthly_investment_interest_schedules 
       WHERE subscription_id = ?`,
      [subscription.id]
    );

    const summary = schedSummary[0];
    const totalPaid = Number(summary.total_paid || 0);
    const totalPending = Number(summary.total_pending || 0);
    const completedMonths = Number(summary.completed_months || 0);
    const pendingMonths = Number(summary.pending_months || 0);
    const nextDueDate = summary.next_due_date || null;

    // Check if subscription should transition to COMPLETED
    const isPrincipalPaid =
      subscription.principal_paid || payment_type === "PRINCIPAL" || payment_type === "INTEREST_AND_PRINCIPAL";
    const allInterestSettled = pendingMonths === 0;

    let newSubStatus = subscription.status;
    let completedDate = subscription.completed_date;

    if (isPrincipalPaid && allInterestSettled && subscription.status !== "COMPLETED") {
      newSubStatus = "COMPLETED";
      completedDate = paymentDateStr;
    }

    await connection.query(
      `UPDATE monthly_investment_subscriptions 
       SET total_interest_paid = ?, 
           total_interest_pending = ?, 
           completed_interest_months = ?, 
           pending_interest_months = ?, 
           next_interest_due_date = ?, 
           status = ?, 
           completed_date = ?, 
           updated_by = ? 
       WHERE id = ?`,
      [
        totalPaid,
        totalPending,
        completedMonths,
        pendingMonths,
        nextDueDate,
        newSubStatus,
        completedDate,
        paidBy,
        subscription.id,
      ]
    );

    // 8. Fetch Created Payment Record
    const [paymentRows] = await connection.query(
      `SELECT p.*, 
              c.name AS customer_name, c.phone AS customer_phone,
              s.subscription_no, mip.plan_name, mip.plan_code
       FROM monthly_investment_payments p
       JOIN chit_customers c ON p.customer_id = c.id
       JOIN monthly_investment_subscriptions s ON p.subscription_id = s.id
       JOIN monthly_investment_plans mip ON s.plan_id = mip.id
       WHERE p.id = ?`,
      [paymentId]
    );

    const createdPayment = paymentRows[0];

    // 9. Audit Log
    await AuditLog({
      connection,
      table: "monthly_investment_payments",
      recordId: paymentId,
      action: "INSERT",
      newData: createdPayment,
      userId: paidBy,
      remarks:
        remarks ||
        `Processed ${payment_type} payment #PAY-${paymentId} of ₹${finalTotalAmount} for subscription ${subscription.subscription_no}`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `Monthly investment payment of ₹${finalTotalAmount} recorded successfully`,
      data: {
        payment: createdPayment,
        paid_schedules: paidScheduleDetails,
        subscription_summary: {
          subscription_id: subscription.id,
          subscription_no: subscription.subscription_no,
          total_interest_paid: totalPaid,
          total_interest_pending: totalPending,
          completed_interest_months: completedMonths,
          pending_interest_months: pendingMonths,
          next_interest_due_date: nextDueDate,
          status: newSubStatus,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Process monthly investment payment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing monthly investment payment",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL MONTHLY INVESTMENT PAYMENTS
 * Supports filters: subscription_id, customer_id, payment_type, payment_mode, date range, pagination
 */
export const getAllMonthlyInvestmentPayments = async (req, res) => {
  try {
    const {
      subscription_id,
      customer_id,
      payment_type,
      payment_mode,
      from_date,
      to_date,
      page = 1,
      limit = 50,
    } = req.query;

    let query = `
      SELECT p.*, 
             c.name AS customer_name, c.phone AS customer_phone,
             s.subscription_no, mip.plan_name, mip.plan_code
      FROM monthly_investment_payments p
      JOIN chit_customers c ON p.customer_id = c.id
      JOIN monthly_investment_subscriptions s ON p.subscription_id = s.id
      JOIN monthly_investment_plans mip ON s.plan_id = mip.id
      WHERE 1=1
    `;
    const params = [];

    if (subscription_id && !isNaN(subscription_id)) {
      query += ` AND p.subscription_id = ?`;
      params.push(Number(subscription_id));
    }

    if (customer_id && !isNaN(customer_id)) {
      query += ` AND p.customer_id = ?`;
      params.push(Number(customer_id));
    }

    if (payment_type) {
      query += ` AND p.payment_type = ?`;
      params.push(payment_type.toUpperCase().trim());
    }

    if (payment_mode) {
      query += ` AND p.payment_mode = ?`;
      params.push(payment_mode.toUpperCase().trim());
    }

    if (from_date) {
      query += ` AND p.payment_date >= ?`;
      params.push(from_date);
    }

    if (to_date) {
      query += ` AND p.payment_date <= ?`;
      params.push(to_date);
    }

    // Count
    const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS count_tbl`;
    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0]?.total || 0;

    query += ` ORDER BY p.id DESC`;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

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
    console.error("Get all monthly investment payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching monthly investment payments",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT PAYMENT BY ID
 */
export const getMonthlyInvestmentPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT p.*, 
              c.name AS customer_name, c.phone AS customer_phone,
              s.subscription_no, s.status AS subscription_status,
              mip.plan_name, mip.plan_code
       FROM monthly_investment_payments p
       JOIN chit_customers c ON p.customer_id = c.id
       JOIN monthly_investment_subscriptions s ON p.subscription_id = s.id
       JOIN monthly_investment_plans mip ON s.plan_id = mip.id
       WHERE p.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get monthly investment payment by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payment",
    });
  }
};
