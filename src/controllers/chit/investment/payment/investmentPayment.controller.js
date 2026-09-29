import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import { formatDateOnly } from "../../../../utils/generateInvestmentSchedule.js";

const VALID_PAYMENT_TYPES = ["INTEREST", "PRINCIPAL", "INTEREST_AND_PRINCIPAL"];
const VALID_PAYMENT_MODES = ["CASH", "UPI", "BANK", "CHEQUE"];

/**
 * PROCESS INVESTMENT PAYMENT
 * 
 * Supports:
 *  - INTEREST: pays one or more weekly interest schedules
 *  - PRINCIPAL: records principal repayment to the customer
 *  - INTEREST_AND_PRINCIPAL: pays both in a single transaction
 * 
 * Automatically updates:
 *  - investment_interest_schedules (status='PAID', paid_date, paid_amount, payment_id, payment_mode)
 *  - investment_subscriptions (principal_paid, principal_paid_date, principal_paid_amount, status='COMPLETED' if fully paid)
 */
export const processInvestmentPayment = async (req, res) => {
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

    // 1. Validation: Required fields
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
      `SELECT s.*, 
              c.name AS customer_name, c.phone AS customer_phone,
              p.plan_name, p.plan_code
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE s.id = ? FOR UPDATE`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Investment subscription #${subscription_id} not found`,
      });
    }

    const subscription = subRows[0];

    // Check subscription status
    if (subscription.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot process payments for a CANCELLED subscription",
      });
    }

    if (subscription.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "This subscription is already marked as COMPLETED. No further payments can be processed.",
      });
    }

    const customerId = subscription.customer_id;
    const cleanPaymentDate = payment_date
      ? new Date(payment_date)
      : new Date();

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
          `SELECT * FROM investment_interest_schedules 
           WHERE subscription_id = ? AND id IN (?) 
           ORDER BY installment_no ASC FOR UPDATE`,
          [subscription.id, targetIds]
        );

        if (rows.length !== targetIds.length) {
          return res.status(400).json({
            success: false,
            message: "One or more schedule IDs do not belong to this subscription",
          });
        }

        // Verify none are already paid or cancelled
        for (const s of rows) {
          if (s.status === "PAID") {
            return res.status(400).json({
              success: false,
              code: "ALREADY_PAID",
              message: `Installment #${s.installment_no} (ID ${s.id}) has already been PAID`,
            });
          }
          if (s.status === "CANCELLED") {
            return res.status(400).json({
              success: false,
              code: "INSTALLMENT_CANCELLED",
              message: `Installment #${s.installment_no} (ID ${s.id}) is CANCELLED`,
            });
          }
        }

        // Verify sequential payment without skipping earlier pending installments
        const [earliestPendingRows] = await connection.query(
          `SELECT installment_no FROM investment_interest_schedules 
           WHERE subscription_id = ? AND status IN ('PENDING', 'APPROVED')
           ORDER BY installment_no ASC LIMIT 1`,
          [subscription.id]
        );

        if (
          earliestPendingRows.length > 0 &&
          rows[0].installment_no > earliestPendingRows[0].installment_no
        ) {
          return res.status(400).json({
            success: false,
            code: "OUT_OF_SEQUENCE_PAYMENT",
            message: `Cannot pay installment #${rows[0].installment_no}: Prior installment #${earliestPendingRows[0].installment_no} is still pending. Installments must be paid in sequential order without skipping.`,
          });
        }

        // Verify no gaps between requested installments
        for (let i = 1; i < rows.length; i++) {
          if (rows[i].installment_no !== rows[i - 1].installment_no + 1) {
            return res.status(400).json({
              success: false,
              code: "NON_CONSECUTIVE_SCHEDULES",
              message: `Selected installments must be in consecutive order. Gaps detected between #${rows[i - 1].installment_no} and #${rows[i].installment_no}.`,
            });
          }
        }

        // 🔥 STRICT DUE DATE VALIDATION: Check each schedule's interest_due_date
        for (const s of rows) {
          const dueDateStr = formatDateOnly(s.interest_due_date);
          if (paymentDateStr < dueDateStr) {
            return res.status(400).json({
              success: false,
              code: "PAYMENT_BEFORE_DUE_DATE_NOT_ALLOWED",
              message: `Cannot pay installment #${s.installment_no} before its due date. Installment #${s.installment_no} is scheduled for ${dueDateStr}, but payment date is ${paymentDateStr}. Payments are only allowed on or after the due date.`,
            });
          }
        }

        candidateSchedules = rows;
      } else {
        // Automatically pick the earliest unpaid installment
        const [nextPending] = await connection.query(
          `SELECT * FROM investment_interest_schedules 
           WHERE subscription_id = ? AND status IN ('PENDING', 'APPROVED')
           ORDER BY installment_no ASC LIMIT 1 FOR UPDATE`,
          [subscription.id]
        );

        if (nextPending.length === 0) {
          return res.status(400).json({
            success: false,
            code: "ALL_INSTALLMENTS_PAID",
            message: "All interest installments for this subscription have already been paid.",
          });
        }

        // 🔥 STRICT DUE DATE VALIDATION on next earliest pending installment
        const nextDueDateStr = formatDateOnly(nextPending[0].interest_due_date);
        if (paymentDateStr < nextDueDateStr) {
          return res.status(400).json({
            success: false,
            code: "NO_INSTALLMENTS_DUE",
            message: `No installments are currently due for payout as of ${paymentDateStr}. The next installment (#${nextPending[0].installment_no}) is due on ${nextDueDateStr}. Payments can only be processed on or after the scheduled due date.`,
          });
        }

        candidateSchedules = nextPending;
      }

      // Sum interest amounts
      for (const s of candidateSchedules) {
        const itemAmount = Number(s.interest_amount);
        calculatedInterestAmount += itemAmount;
        paidScheduleIds.push(s.id);
        paidScheduleDetails.push({
          id: s.id,
          installment_no: s.installment_no,
          interest_due_date: formatDateOnly(s.interest_due_date),
          interest_amount: itemAmount,
        });
      }

      // If user supplied explicit interest_amount, ensure it covers or matches
      if (interest_amount !== undefined && interest_amount !== null) {
        const supplied = Number(interest_amount);
        if (isNaN(supplied) || supplied < 0) {
          return res.status(400).json({
            success: false,
            message: "interest_amount must be a valid positive number >= 0",
          });
        }
        calculatedInterestAmount = Number(supplied.toFixed(2));
      } else {
        calculatedInterestAmount = Number(calculatedInterestAmount.toFixed(2));
      }
    }

    // 4. Process PRINCIPAL component
    let calculatedPrincipalAmount = 0.0;

    if (payment_type === "PRINCIPAL" || payment_type === "INTEREST_AND_PRINCIPAL") {
      // Check if principal is already paid
      if (subscription.principal_paid) {
        return res.status(400).json({
          success: false,
          code: "PRINCIPAL_ALREADY_PAID",
          message: `Principal amount ₹${subscription.principal_amount} has already been refunded/paid for subscription #${subscription.id} on ${subscription.principal_paid_date}`,
        });
      }

      // 🔥 STRICT LOCK-IN END DATE VALIDATION: Principal can only be paid on or after lock_in_end_date
      const lockInEndStr = formatDateOnly(subscription.lock_in_end_date);
      if (paymentDateStr < lockInEndStr) {
        return res.status(400).json({
          success: false,
          code: "LOCK_IN_PERIOD_NOT_COMPLETED",
          message: `Cannot payout principal before the lock-in period completes. Lock-in end date is ${lockInEndStr} (${subscription.lock_in_days} days lock-in). Payment date is ${paymentDateStr}.`,
        });
      }

      if (principal_amount !== undefined && principal_amount !== null) {
        calculatedPrincipalAmount = Number(principal_amount);
        if (isNaN(calculatedPrincipalAmount) || calculatedPrincipalAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "principal_amount must be a positive number greater than 0",
          });
        }
      } else {
        calculatedPrincipalAmount = Number(subscription.principal_amount);
      }

      calculatedPrincipalAmount = Number(calculatedPrincipalAmount.toFixed(2));
    }

    // 5. Total Amount Calculation & Verification
    const expectedTotal = Number(
      (calculatedInterestAmount + calculatedPrincipalAmount).toFixed(2)
    );

    let finalTotalAmount = expectedTotal;
    if (total_amount !== undefined && total_amount !== null) {
      const suppliedTotal = Number(Number(total_amount).toFixed(2));
      if (suppliedTotal <= 0) {
        return res.status(400).json({
          success: false,
          message: "total_amount must be greater than 0",
        });
      }
      finalTotalAmount = suppliedTotal;
    }

    if (finalTotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment total amount must be greater than 0",
      });
    }

    // 6. Insert record into investment_payments
    const [paymentResult] = await connection.query(
      `INSERT INTO investment_payments (
        subscription_id,
        customer_id,
        payment_type,
        payment_date,
        interest_amount,
        principal_amount,
        total_amount,
        payment_mode,
        transaction_reference,
        remarks,
        paid_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscription.id,
        customerId,
        payment_type,
        cleanPaymentDate,
        calculatedInterestAmount,
        calculatedPrincipalAmount,
        finalTotalAmount,
        payment_mode,
        transaction_reference || null,
        remarks || null,
        paidBy,
      ]
    );

    const paymentId = paymentResult.insertId;

    // 7. Update paid schedules in investment_interest_schedules
    if (paidScheduleIds.length > 0) {
      await connection.query(
        `UPDATE investment_interest_schedules 
         SET status = 'PAID',
             paid_date = ?,
             paid_amount = interest_amount,
             payment_id = ?,
             payment_mode = ?,
             updated_by = ?,
             remarks = COALESCE(?, remarks)
         WHERE id IN (?)`,
        [
          formatDateOnly(cleanPaymentDate),
          paymentId,
          payment_mode,
          paidBy,
          remarks || `Paid via Payment #${paymentId}`,
          paidScheduleIds,
        ]
      );
    }

    // 8. Update subscription state if principal was paid
    let subStatus = subscription.status;
    if (subStatus === "ACTIVE" && paidScheduleIds.length > 0) {
      subStatus = "INTEREST_STARTED";
    }

    let isPrincipalPaid = subscription.principal_paid;
    let principalPaidDate = subscription.principal_paid_date;
    let principalPaidAmount = Number(subscription.principal_paid_amount || 0);

    if (calculatedPrincipalAmount > 0) {
      isPrincipalPaid = true;
      principalPaidDate = formatDateOnly(cleanPaymentDate);
      principalPaidAmount = calculatedPrincipalAmount;
    }

    // 9. Completion Check: If principal is paid and all schedules are paid
    const [unpaidCountRows] = await connection.query(
      `SELECT COUNT(*) AS unpaid_count 
       FROM investment_interest_schedules 
       WHERE subscription_id = ? AND status = 'PENDING'`,
      [subscription.id]
    );

    const remainingUnpaidSchedules = unpaidCountRows[0]?.unpaid_count || 0;
    let completedDate = subscription.completed_date;

    if (isPrincipalPaid && remainingUnpaidSchedules === 0) {
      subStatus = "COMPLETED";
      completedDate = formatDateOnly(cleanPaymentDate);
    }

    await connection.query(
      `UPDATE investment_subscriptions 
       SET status = ?,
           principal_paid = ?,
           principal_paid_date = ?,
           principal_paid_amount = ?,
           completed_date = ?,
           updated_by = ?
       WHERE id = ?`,
      [
        subStatus,
        isPrincipalPaid,
        principalPaidDate,
        principalPaidAmount,
        completedDate,
        paidBy,
        subscription.id,
      ]
    );

    // 10. Fetch full created payment details
    const [createdPaymentRows] = await connection.query(
      `SELECT 
        ip.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        u.username AS paid_by_username
       FROM investment_payments ip
       JOIN chit_customers c ON ip.customer_id = c.id
       JOIN investment_subscriptions s ON ip.subscription_id = s.id
       JOIN investment_plans p ON s.plan_id = p.id
       LEFT JOIN users_roles u ON ip.paid_by = u.id
       WHERE ip.id = ?`,
      [paymentId]
    );

    const newPayment = createdPaymentRows[0];
    newPayment.paid_schedules = paidScheduleDetails;

    // 11. Audit Log
    await AuditLog({
      connection,
      table: "investment_payments",
      recordId: paymentId,
      action: "INSERT",
      newData: newPayment,
      userId: paidBy,
      remarks:
        remarks ||
        `Processed investment payment #${paymentId} (${payment_type}) for ₹${finalTotalAmount} to ${subscription.customer_name}`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Investment payment processed successfully",
      data: newPayment,
      subscription_status: {
        id: subscription.id,
        status: subStatus,
        principal_paid: isPrincipalPaid,
        principal_paid_amount: principalPaidAmount,
        remaining_unpaid_schedules: remainingUnpaidSchedules,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Process investment payment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing investment payment",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL INVESTMENT PAYMENTS
 * Filters: subscription_id, customer_id, payment_type, payment_mode, from_date, to_date, search
 */
export const getAllInvestmentPayments = async (req, res) => {
  try {
    const {
      subscription_id,
      customer_id,
      payment_type,
      payment_mode,
      from_date,
      to_date,
      search,
    } = req.query;

    let query = `
      SELECT 
        ip.id,
        ip.subscription_id,
        ip.customer_id,
        ip.payment_type,
        ip.payment_date,
        ip.interest_amount,
        ip.principal_amount,
        ip.total_amount,
        ip.payment_mode,
        ip.transaction_reference,
        ip.remarks,
        ip.paid_by,
        ip.created_at,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        u.username AS paid_by_username
      FROM investment_payments ip
      JOIN chit_customers c ON ip.customer_id = c.id
      JOIN investment_subscriptions s ON ip.subscription_id = s.id
      JOIN investment_plans p ON s.plan_id = p.id
      LEFT JOIN users_roles u ON ip.paid_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (subscription_id) {
      query += ` AND ip.subscription_id = ?`;
      params.push(Number(subscription_id));
    }

    if (customer_id) {
      query += ` AND ip.customer_id = ?`;
      params.push(Number(customer_id));
    }

    if (payment_type && VALID_PAYMENT_TYPES.includes(payment_type.toUpperCase())) {
      query += ` AND ip.payment_type = ?`;
      params.push(payment_type.toUpperCase());
    }

    if (payment_mode && VALID_PAYMENT_MODES.includes(payment_mode.toUpperCase())) {
      query += ` AND ip.payment_mode = ?`;
      params.push(payment_mode.toUpperCase());
    }

    if (from_date) {
      query += ` AND ip.payment_date >= ?`;
      params.push(formatDateOnly(from_date));
    }

    if (to_date) {
      query += ` AND ip.payment_date <= ?`;
      params.push(`${formatDateOnly(to_date)} 23:59:59`);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR p.plan_name LIKE ? OR ip.transaction_reference LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY ip.id DESC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get all investment payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment payments",
    });
  }
};

/**
 * GET INVESTMENT PAYMENT BY ID
 * Includes paid schedules
 */
export const getInvestmentPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        ip.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        u.username AS paid_by_username
       FROM investment_payments ip
       JOIN chit_customers c ON ip.customer_id = c.id
       JOIN investment_subscriptions s ON ip.subscription_id = s.id
       JOIN investment_plans p ON s.plan_id = p.id
       LEFT JOIN users_roles u ON ip.paid_by = u.id
       WHERE ip.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Investment payment not found",
      });
    }

    const payment = rows[0];

    // Fetch schedules paid in this payment
    const [schedules] = await db.query(
      `SELECT id, installment_no, interest_due_date, interest_amount, status, paid_date, paid_amount 
       FROM investment_interest_schedules 
       WHERE payment_id = ? 
       ORDER BY installment_no ASC`,
      [Number(id)]
    );

    payment.paid_schedules = schedules;

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get investment payment by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching investment payment",
    });
  }
};

/**
 * GET PAYMENT SUMMARY / STATEMENT FOR A SUBSCRIPTION
 */
export const getPaymentSummaryBySubscription = async (req, res) => {
  try {
    const { subscription_id } = req.params;

    if (!subscription_id || isNaN(subscription_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required",
      });
    }

    const [subRows] = await db.query(
      `SELECT s.*, 
              c.name AS customer_name, c.phone AS customer_phone,
              p.plan_name, p.plan_code, p.lock_in_days
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE s.id = ?`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const subscription = subRows[0];

    // Schedules aggregate
    const [schedRows] = await db.query(
      `SELECT 
        COUNT(*) AS total_installments,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) AS paid_installments,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_installments,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN paid_amount ELSE 0 END), 0) AS total_interest_paid,
        COALESCE(SUM(interest_amount), 0) AS total_interest_payable
       FROM investment_interest_schedules
       WHERE subscription_id = ?`,
      [Number(subscription_id)]
    );

    const stats = schedRows[0];

    // Payments list
    const [payments] = await db.query(
      `SELECT id, payment_type, payment_date, interest_amount, principal_amount, total_amount, payment_mode, transaction_reference 
       FROM investment_payments 
       WHERE subscription_id = ? 
       ORDER BY id DESC`,
      [Number(subscription_id)]
    );

    const totalInterestPayable = Number(stats.total_interest_payable);
    const totalInterestPaid = Number(stats.total_interest_paid);
    const pendingInterestPayable = Number(
      Math.max(0, totalInterestPayable - totalInterestPaid).toFixed(2)
    );

    return res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        customer_name: subscription.customer_name,
        customer_phone: subscription.customer_phone,
        plan_name: subscription.plan_name,
        status: subscription.status,
        principal_amount: subscription.principal_amount,
        principal_paid: subscription.principal_paid,
        principal_paid_date: subscription.principal_paid_date,
        principal_paid_amount: subscription.principal_paid_amount,
      },
      summary: {
        total_installments: stats.total_installments,
        paid_installments: stats.paid_installments,
        pending_installments: stats.pending_installments,
        total_interest_payable: totalInterestPayable,
        total_interest_paid: totalInterestPaid,
        pending_interest_payable: pendingInterestPayable,
        principal_refunded: subscription.principal_paid,
      },
      payments,
    });
  } catch (error) {
    console.error("Get payment summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payment summary",
    });
  }
};

/**
 * GET DUE INSTALLMENTS FOR PAYMENT
 * Returns only the installments that are on or before the given as_of_date (default: today).
 * Also checks whether principal is eligible for payout.
 */
export const getDueInstallmentsForPayment = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const { as_of_date } = req.query;

    if (!subscription_id || isNaN(subscription_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required",
      });
    }

    const targetDate = as_of_date ? formatDateOnly(as_of_date) : formatDateOnly(new Date());

    // Fetch subscription
    const [subRows] = await db.query(
      `SELECT s.*, 
              c.name AS customer_name, c.phone AS customer_phone,
              p.plan_name, p.plan_code, p.lock_in_days
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE s.id = ?`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const subscription = subRows[0];

    // Eligible due schedules (status PENDING/APPROVED, due_date <= targetDate)
    const [dueSchedules] = await db.query(
      `SELECT id, installment_no, interest_due_date, interest_amount, status 
       FROM investment_interest_schedules 
       WHERE subscription_id = ? 
         AND status IN ('PENDING', 'APPROVED')
         AND interest_due_date <= ?
       ORDER BY installment_no ASC`,
      [Number(subscription_id), targetDate]
    );

    // Next upcoming schedule that is not yet due
    const [upcomingSchedules] = await db.query(
      `SELECT id, installment_no, interest_due_date, interest_amount, status 
       FROM investment_interest_schedules 
       WHERE subscription_id = ? 
         AND status IN ('PENDING', 'APPROVED')
         AND interest_due_date > ?
       ORDER BY installment_no ASC LIMIT 1`,
      [Number(subscription_id), targetDate]
    );

    const totalDueInterest = dueSchedules.reduce(
      (sum, s) => sum + Number(s.interest_amount),
      0
    );

    const isPrincipalEligible =
      !subscription.principal_paid &&
      targetDate >= formatDateOnly(subscription.lock_in_end_date);

    return res.status(200).json({
      success: true,
      as_of_date: targetDate,
      subscription: {
        id: subscription.id,
        customer_name: subscription.customer_name,
        customer_phone: subscription.customer_phone,
        plan_name: subscription.plan_name,
        lock_in_end_date: formatDateOnly(subscription.lock_in_end_date),
        principal_amount: subscription.principal_amount,
        principal_paid: subscription.principal_paid,
      },
      due_interest_installments: {
        count: dueSchedules.length,
        total_due_amount: Number(totalDueInterest.toFixed(2)),
        schedules: dueSchedules,
      },
      principal_status: {
        is_eligible: isPrincipalEligible,
        principal_amount: subscription.principal_amount,
        already_paid: subscription.principal_paid,
        lock_in_end_date: formatDateOnly(subscription.lock_in_end_date),
      },
      next_upcoming_installment: upcomingSchedules[0] || null,
    });
  } catch (error) {
    console.error("Get due installments for payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching due installments",
    });
  }
};
