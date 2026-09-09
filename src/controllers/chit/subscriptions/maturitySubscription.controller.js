import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";

/**
 * ============================================================================
 * SETTLE / PAY MATURITY TO CUSTOMER
 * POST/PATCH/PUT /api/customer-subscriptions/:id/maturity-pay
 * ============================================================================
 */
export const payCustomerMaturity = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    let {
      maturity_paid_amount,
      maturity_paid_date,
      payment_mode = "CASH",
      remarks,
    } = req.body || {};

    /* =========================
       1️⃣ LOCK RECORD
    ========================= */
    const [[sub]] = await connection.query(
      `SELECT * FROM chit_customer_subscriptions WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (!sub) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    /* =========================
       2️⃣ CHECK IF ALREADY PAID
    ========================= */
    if (sub.is_maturity_paid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Maturity has already been settled and paid on ${sub.maturity_paid_date ? new Date(sub.maturity_paid_date).toISOString().split("T")[0] : "a previous date"} (Amount: ${sub.maturity_paid_amount})`,
        data: sub,
      });
    }

    /* =========================
       3️⃣ NORMALIZE & VALIDATE
    ========================= */
    let paidAmount;
    if (maturity_paid_amount !== undefined && maturity_paid_amount !== null && maturity_paid_amount !== "") {
      paidAmount = Number(maturity_paid_amount);
      if (isNaN(paidAmount) || paidAmount < 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid maturity_paid_amount. Must be a non-negative number.",
        });
      }
    } else {
      // Default to the investment amount
      paidAmount = Number(sub.investment_amount);
    }

    let paidDate;
    if (maturity_paid_date) {
      paidDate = new Date(maturity_paid_date);
      if (isNaN(paidDate.getTime())) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid maturity_paid_date format (YYYY-MM-DD)",
        });
      }
    } else {
      paidDate = new Date();
    }

    payment_mode = String(payment_mode || "CASH").toUpperCase().trim();

    /* =========================
       4️⃣ UPDATE MATURITY STATUS
    ========================= */
    await connection.query(
      `UPDATE chit_customer_subscriptions
       SET 
         is_maturity_paid = TRUE,
         maturity_paid_date = ?,
         maturity_paid_amount = ?,
         maturity_paid_by = ?,
         maturity_payment_mode = ?,
         maturity_remarks = ?,
         updated_by = ?
       WHERE id = ?`,
      [
        paidDate,
        paidAmount,
        userId,
        payment_mode,
        remarks || null,
        userId,
        id,
      ]
    );

    /* =========================
       5️⃣ AUDIT LOG
    ========================= */
    await AuditLog({
      connection,
      table: "chit_customer_subscriptions",
      recordId: id,
      action: "UPDATE",
      oldData: {
        is_maturity_paid: sub.is_maturity_paid,
        maturity_paid_date: sub.maturity_paid_date,
        maturity_paid_amount: sub.maturity_paid_amount,
        maturity_paid_by: sub.maturity_paid_by,
      },
      newData: {
        is_maturity_paid: true,
        maturity_paid_date: paidDate,
        maturity_paid_amount: paidAmount,
        maturity_paid_by: userId,
        maturity_payment_mode: payment_mode,
        maturity_remarks: remarks,
      },
      userId,
      remarks: remarks || `Maturity settled (Amount: ${paidAmount}, Mode: ${payment_mode})`,
    });

    /* =========================
       6️⃣ FETCH UPDATED DATA
    ========================= */
    const [[updatedData]] = await connection.query(
      `SELECT 
         s.*,
         c.name AS customer_name,
         c.phone AS customer_phone,
         b.batch_name,
         p.plan_name,
         u.username AS maturity_paid_by_name
       FROM chit_customer_subscriptions s
       LEFT JOIN chit_customers c ON c.id = s.customer_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN users_roles u ON u.id = s.maturity_paid_by
       WHERE s.id = ?`,
      [id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Maturity payment settled successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("payCustomerMaturity error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing maturity payment",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * REVERT MATURITY PAYMENT (Undo Settlement)
 * POST/PATCH /api/customer-subscriptions/:id/maturity-revert
 * ============================================================================
 */
export const revertCustomerMaturity = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body || {};

    if (!userId) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const [[sub]] = await connection.query(
      `SELECT * FROM chit_customer_subscriptions WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (!sub) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (!sub.is_maturity_paid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Maturity payment has not been marked as paid yet for this subscription",
      });
    }

    await connection.query(
      `UPDATE chit_customer_subscriptions
       SET 
         is_maturity_paid = FALSE,
         maturity_paid_date = NULL,
         maturity_paid_amount = 0.00,
         maturity_paid_by = NULL,
         maturity_payment_mode = NULL,
         maturity_remarks = NULL,
         updated_by = ?
       WHERE id = ?`,
      [userId, id]
    );

    await AuditLog({
      connection,
      table: "chit_customer_subscriptions",
      recordId: id,
      action: "UPDATE",
      oldData: {
        is_maturity_paid: sub.is_maturity_paid,
        maturity_paid_date: sub.maturity_paid_date,
        maturity_paid_amount: sub.maturity_paid_amount,
        maturity_paid_by: sub.maturity_paid_by,
      },
      newData: {
        is_maturity_paid: false,
        maturity_paid_date: null,
        maturity_paid_amount: 0.0,
        maturity_paid_by: null,
      },
      userId,
      remarks: remarks || "Maturity payment reverted back to pending",
    });

    const [[updatedData]] = await connection.query(
      `SELECT 
         s.*,
         c.name AS customer_name,
         c.phone AS customer_phone,
         b.batch_name,
         p.plan_name
       FROM chit_customer_subscriptions s
       LEFT JOIN chit_customers c ON c.id = s.customer_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE s.id = ?`,
      [id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Maturity payment reverted successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("revertCustomerMaturity error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error reverting maturity payment",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * GET MATURITY SUMMARY & LISTING
 * GET /api/customer-subscriptions/maturity-summary
 * ============================================================================
 */
export const getMaturitySummary = async (req, res) => {
  try {
    const { status = "ALL", batch_id, plan_id, search, from_date, to_date } = req.query;

    let query = `
      SELECT 
        s.id AS subscription_id,
        s.customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.place AS customer_place,

        s.batch_id,
        b.batch_name,
        b.start_date AS batch_start_date,
        b.end_date AS batch_end_date,

        s.plan_id,
        p.plan_name,
        p.collection_type,
        p.total_installments,

        s.installment_amount,
        s.investment_amount,
        s.start_date,
        s.duration,
        s.end_date,
        s.maturity_date,

        s.is_maturity_paid,
        s.maturity_paid_date,
        s.maturity_paid_amount,
        s.maturity_paid_by,
        s.maturity_payment_mode,
        s.maturity_remarks,

        u.username AS maturity_paid_by_name,

        COALESCE(pay.total_paid, 0) AS amount_paid,
        (s.investment_amount - COALESCE(pay.total_paid, 0)) AS pending_amount,

        DATEDIFF(s.maturity_date, CURRENT_DATE) AS days_to_maturity,
        CASE 
          WHEN s.is_maturity_paid = 1 THEN 'PAID'
          WHEN CURRENT_DATE >= s.maturity_date THEN 'MATURED_PENDING_PAYOUT'
          ELSE 'ACTIVE_NOT_MATURED'
        END AS maturity_status

      FROM chit_customer_subscriptions s
      LEFT JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN users_roles u ON u.id = s.maturity_paid_by
      LEFT JOIN (
        SELECT 
          subscription_id,
          SUM(total_amount) AS total_paid
        FROM chit_collections_payments
        WHERE payment_type = 'INSTALLMENT' AND subscription_id IS NOT NULL
        GROUP BY subscription_id
      ) pay ON pay.subscription_id = s.id
    `;

    const conditions = [];
    const params = [];

    if (status === "PAID") {
      conditions.push("s.is_maturity_paid = 1");
    } else if (status === "PENDING") {
      conditions.push("s.is_maturity_paid = 0");
    } else if (status === "OVERDUE" || status === "MATURED") {
      conditions.push("s.is_maturity_paid = 0 AND s.maturity_date <= CURRENT_DATE");
    }

    if (batch_id) {
      conditions.push("s.batch_id = ?");
      params.push(Number(batch_id));
    }

    if (plan_id) {
      conditions.push("s.plan_id = ?");
      params.push(Number(plan_id));
    }

    if (from_date) {
      conditions.push("s.maturity_date >= ?");
      params.push(from_date);
    }

    if (to_date) {
      conditions.push("s.maturity_date <= ?");
      params.push(to_date);
    }

    if (search) {
      conditions.push("(c.name LIKE ? OR c.phone LIKE ? OR b.batch_name LIKE ?)");
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY s.maturity_date ASC, s.id DESC`;

    const [rows] = await db.query(query, params);

    // Summary statistics
    let totalPaidMaturities = 0;
    let totalPaidMaturityAmount = 0;
    let totalPendingMaturities = 0;
    let totalPendingMaturityAmount = 0;

    for (const row of rows) {
      if (row.is_maturity_paid) {
        totalPaidMaturities++;
        totalPaidMaturityAmount += Number(row.maturity_paid_amount || row.investment_amount || 0);
      } else {
        totalPendingMaturities++;
        totalPendingMaturityAmount += Number(row.investment_amount || 0);
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        total_count: rows.length,
        total_paid_count: totalPaidMaturities,
        total_paid_amount: totalPaidMaturityAmount,
        total_pending_count: totalPendingMaturities,
        total_pending_amount: totalPendingMaturityAmount,
      },
      data: rows,
    });
  } catch (error) {
    console.error("getMaturitySummary error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error fetching maturity summary",
    });
  }
};
