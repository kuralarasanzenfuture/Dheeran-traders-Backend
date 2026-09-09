import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";

/**
 * ============================================================================
 * HELPER: PROFESSIONAL VALIDATION FOR MATURITY PAYMENT DATE
 * ============================================================================
 * 1. Strict format check (YYYY-MM-DD or ISO timestamp)
 * 2. Real calendar verification (prevents month/day rollover like 2026-02-31)
 * 3. Future date restriction (payment cannot be in the future)
 * 4. Subscription start date check (cannot be earlier than start_date)
 * 5. Premature settlement check (if earlier than maturity_date, requires remarks)
 */
const validateMaturityPaidDate = (inputDate, startDate, maturityDate, remarks) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentDay = String(now.getDate()).padStart(2, "0");
  const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

  let targetDateStr;

  if (!inputDate) {
    targetDateStr = todayStr;
  } else if (inputDate instanceof Date) {
    if (isNaN(inputDate.getTime())) {
      return { valid: false, message: "Invalid date object provided for maturity_paid_date." };
    }
    const y = inputDate.getFullYear();
    const m = String(inputDate.getMonth() + 1).padStart(2, "0");
    const d = String(inputDate.getDate()).padStart(2, "0");
    targetDateStr = `${y}-${m}-${d}`;
  } else if (typeof inputDate === "string") {
    const trimmed = inputDate.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return {
        valid: false,
        message: "Invalid maturity_paid_date format. Please use YYYY-MM-DD format (e.g. 2026-09-09).",
      };
    }
    targetDateStr = `${match[1]}-${match[2]}-${match[3]}`;
  } else {
    return {
      valid: false,
      message: "maturity_paid_date must be a valid date string in YYYY-MM-DD format.",
    };
  }

  // Strict calendar verification (prevents 2026-02-31, 2026-04-31, invalid months)
  const [year, month, day] = targetDateStr.split("-").map(Number);
  if (year < 2000 || year > 2100) {
    return { valid: false, message: `Invalid year in maturity_paid_date (${year}). Must be between 2000 and 2100.` };
  }
  if (month < 1 || month > 12) {
    return { valid: false, message: `Invalid month in maturity_paid_date (${month}). Must be between 01 and 12.` };
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      valid: false,
      message: `Invalid calendar date for maturity_paid_date: Day ${day} does not exist in month ${month} of year ${year} (maximum days in month: ${daysInMonth}).`,
    };
  }

  // Check 1: Future date check
  if (targetDateStr > todayStr) {
    return {
      valid: false,
      message: `Maturity payment date (${targetDateStr}) cannot be in the future. Current date is ${todayStr}.`,
    };
  }

  // Check 2: Cannot be earlier than subscription start date
  if (startDate) {
    const sDate = new Date(startDate);
    if (!isNaN(sDate.getTime())) {
      const sy = sDate.getFullYear();
      const sm = String(sDate.getMonth() + 1).padStart(2, "0");
      const sd = String(sDate.getDate()).padStart(2, "0");
      const subStartStr = `${sy}-${sm}-${sd}`;

      if (targetDateStr < subStartStr) {
        return {
          valid: false,
          message: `Maturity payment date (${targetDateStr}) cannot be earlier than subscription start date (${subStartStr}).`,
        };
      }
    }
  }

  // Check 3: Check against scheduled maturity date (premature payout audit)
  if (maturityDate) {
    const mDate = new Date(maturityDate);
    if (!isNaN(mDate.getTime())) {
      const my = mDate.getFullYear();
      const mm = String(mDate.getMonth() + 1).padStart(2, "0");
      const md = String(mDate.getDate()).padStart(2, "0");
      const subMaturityStr = `${my}-${mm}-${md}`;

      if (targetDateStr < subMaturityStr) {
        if (!remarks || !remarks.trim()) {
          return {
            valid: false,
            message: `Premature settlement detected: The payment date (${targetDateStr}) is before scheduled maturity date (${subMaturityStr}). Please provide remarks explaining the reason for early/premature payout.`,
          };
        }
      }
    }
  }

  return { valid: true, formattedDate: targetDateStr };
};

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
      // Default to total investment amount (or investment_amount fallback)
      paidAmount = Number(sub.total_investment_amount || sub.investment_amount);
    }

    // Professional Payment Date Validation
    const dateValidation = validateMaturityPaidDate(
      maturity_paid_date,
      sub.start_date,
      sub.maturity_date,
      remarks
    );

    if (!dateValidation.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: dateValidation.message,
      });
    }

    const paidDate = dateValidation.formattedDate;

    // Payment mode validation
    const validModes = ["CASH", "UPI", "BANK", "CHEQUE", "NEFT", "RTGS"];
    payment_mode = String(payment_mode || "CASH").toUpperCase().trim();
    if (!validModes.includes(payment_mode)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid payment_mode (${payment_mode}). Allowed modes: ${validModes.join(", ")}`,
      });
    }

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
    const {
      // A. Status filter
      status = "ALL",

      // B. Batch & Plan
      batch_id,
      plan_id,

      // C. Search
      search,

      // D. Maturity date filters
      from_date,
      to_date,
      due_today,
      overdue_days,

      // E. Payment filters
      payment_mode,
      paid_from_date,
      paid_to_date,

      // F. Amount filters
      min_amount,
      max_amount,

      // G. Reference filters
      reference_mode,
      agent_staff_id,

      // H. Pagination & Sorting
      page = 1,
      limit = 20,
      sort_by = "maturity_date",
      sort_order = "ASC",
    } = req.query;

    const conditions = [];
    const params = [];

    // ==========================================
    // A. MATURITY STATUS
    // ==========================================
    const normalizedStatus = String(status || "ALL").toUpperCase().trim();
    if (normalizedStatus === "PAID") {
      conditions.push("s.is_maturity_paid = 1");
    } else if (normalizedStatus === "PENDING") {
      conditions.push("s.is_maturity_paid = 0");
    } else if (normalizedStatus === "ACTIVE") {
      conditions.push("s.is_maturity_paid = 0 AND s.maturity_date > CURRENT_DATE");
    } else if (normalizedStatus === "DUE_TODAY") {
      conditions.push("s.is_maturity_paid = 0 AND s.maturity_date = CURRENT_DATE");
    } else if (normalizedStatus === "OVERDUE") {
      conditions.push("s.is_maturity_paid = 0 AND s.maturity_date < CURRENT_DATE");
    } else if (normalizedStatus === "MATURED_PENDING_PAYOUT" || normalizedStatus === "MATURED") {
      conditions.push("s.is_maturity_paid = 0 AND s.maturity_date <= CURRENT_DATE");
    }

    // ==========================================
    // B. BATCH AND PLAN
    // ==========================================
    if (batch_id) {
      conditions.push("s.batch_id = ?");
      params.push(Number(batch_id));
    }

    if (plan_id) {
      conditions.push("s.plan_id = ?");
      params.push(Number(plan_id));
    }

    // ==========================================
    // C. CUSTOMER & GENERAL SEARCH
    // ==========================================
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        c.place LIKE ? OR 
        b.batch_name LIKE ? OR 
        p.plan_name LIKE ? OR 
        s.nominee_name LIKE ? OR 
        s.nominee_phone LIKE ? OR 
        CAST(s.id AS CHAR) LIKE ? OR 
        CAST(s.customer_id AS CHAR) LIKE ?
      )`);
      params.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    // ==========================================
    // D. MATURITY DATE FILTERS
    // ==========================================
    if (from_date) {
      conditions.push("s.maturity_date >= ?");
      params.push(from_date);
    }

    if (to_date) {
      conditions.push("s.maturity_date <= ?");
      params.push(to_date);
    }

    if (due_today === true || due_today === "true" || due_today === "1") {
      conditions.push("s.is_maturity_paid = 0 AND s.maturity_date = CURRENT_DATE");
    }

    if (overdue_days !== undefined && overdue_days !== null && overdue_days !== "") {
      const days = Number(overdue_days);
      if (!isNaN(days) && days >= 0) {
        conditions.push("s.is_maturity_paid = 0 AND s.maturity_date <= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)");
        params.push(days);
      }
    }

    // ==========================================
    // E. PAYMENT FILTERS
    // ==========================================
    if (payment_mode && payment_mode.toUpperCase() !== "ALL") {
      conditions.push("s.maturity_payment_mode = ?");
      params.push(payment_mode.toUpperCase().trim());
    }

    if (paid_from_date) {
      conditions.push("s.maturity_paid_date >= ?");
      params.push(paid_from_date);
    }

    if (paid_to_date) {
      conditions.push("s.maturity_paid_date <= ?");
      params.push(paid_to_date);
    }

    // ==========================================
    // F. AMOUNT FILTERS
    // ==========================================
    if (min_amount !== undefined && min_amount !== null && min_amount !== "") {
      const min = Number(min_amount);
      if (!isNaN(min)) {
        conditions.push("COALESCE(s.total_investment_amount, s.investment_amount) >= ?");
        params.push(min);
      }
    }

    if (max_amount !== undefined && max_amount !== null && max_amount !== "") {
      const max = Number(max_amount);
      if (!isNaN(max)) {
        conditions.push("COALESCE(s.total_investment_amount, s.investment_amount) <= ?");
        params.push(max);
      }
    }

    // ==========================================
    // G. REFERENCE FILTERS
    // ==========================================
    if (reference_mode && reference_mode.toUpperCase() !== "ALL") {
      conditions.push("s.reference_mode = ?");
      params.push(reference_mode.toUpperCase().trim());
    }

    if (agent_staff_id) {
      conditions.push("s.agent_staff_id = ?");
      params.push(Number(agent_staff_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ==========================================
    // STATS AGGREGATION QUERY (Full matching dataset)
    // ==========================================
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_count,
        SUM(CASE WHEN s.is_maturity_paid = 1 THEN 1 ELSE 0 END) AS total_paid_count,
        COALESCE(SUM(CASE WHEN s.is_maturity_paid = 1 THEN s.maturity_paid_amount ELSE 0 END), 0) AS total_paid_amount,
        SUM(CASE WHEN s.is_maturity_paid = 0 THEN 1 ELSE 0 END) AS total_pending_count,
        COALESCE(SUM(CASE WHEN s.is_maturity_paid = 0 THEN COALESCE(s.total_investment_amount, s.investment_amount) ELSE 0 END), 0) AS total_pending_amount,
        SUM(CASE WHEN s.is_maturity_paid = 0 AND s.maturity_date = CURRENT_DATE THEN 1 ELSE 0 END) AS total_due_today_count,
        SUM(CASE WHEN s.is_maturity_paid = 0 AND s.maturity_date < CURRENT_DATE THEN 1 ELSE 0 END) AS total_overdue_count,
        SUM(CASE WHEN s.is_maturity_paid = 0 AND s.maturity_date > CURRENT_DATE THEN 1 ELSE 0 END) AS total_active_count
      FROM chit_customer_subscriptions s
      LEFT JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN plans p ON p.id = s.plan_id
      ${whereClause}
    `;

    const [[statsRow]] = await db.query(statsQuery, params);

    const totalRecords = Number(statsRow?.total_count || 0);

    // ==========================================
    // H. PAGINATION & SORTING
    // ==========================================
    const sortColumnMap = {
      maturity_date: "s.maturity_date",
      id: "s.id",
      subscription_id: "s.id",
      customer_name: "c.name",
      batch_name: "b.batch_name",
      plan_name: "p.plan_name",
      start_date: "s.start_date",
      end_date: "s.end_date",
      total_investment_amount: "COALESCE(s.total_investment_amount, s.investment_amount)",
      investment_amount: "s.investment_amount",
      maturity_paid_date: "s.maturity_paid_date",
      maturity_paid_amount: "s.maturity_paid_amount",
      days_to_maturity: "DATEDIFF(s.maturity_date, CURRENT_DATE)",
    };

    const sortColumn = sortColumnMap[sort_by] || "s.maturity_date";
    const sortDirection = String(sort_order || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";

    const isAll = String(limit).toLowerCase() === "all" || Number(limit) <= 0;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = isAll ? null : Math.max(1, Number(limit) || 20);
    const offset = limitNum ? (pageNum - 1) * limitNum : 0;

    let dataQuery = `
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

        s.chit_quantity,
        s.installment_amount,
        s.total_installment_amount,
        s.investment_amount,
        s.total_investment_amount,
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

        s.reference_mode,
        s.agent_staff_id,
        a.name AS agent_staff_name,
        a.phone AS agent_staff_phone,

        u.username AS maturity_paid_by_name,

        COALESCE(pay.total_paid, 0) AS amount_paid,
        (COALESCE(s.total_investment_amount, s.investment_amount) - COALESCE(pay.total_paid, 0)) AS pending_amount,

        DATEDIFF(s.maturity_date, CURRENT_DATE) AS days_to_maturity,
        CASE 
          WHEN s.is_maturity_paid = 1 THEN 'PAID'
          WHEN s.maturity_date = CURRENT_DATE THEN 'DUE_TODAY'
          WHEN CURRENT_DATE > s.maturity_date THEN 'OVERDUE'
          ELSE 'ACTIVE'
        END AS maturity_status

      FROM chit_customer_subscriptions s
      LEFT JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN chit_agent_and_staff a ON a.id = s.agent_staff_id
      LEFT JOIN users_roles u ON u.id = s.maturity_paid_by
      LEFT JOIN (
        SELECT 
          subscription_id,
          SUM(total_amount) AS total_paid
        FROM chit_collections_payments
        WHERE payment_type = 'INSTALLMENT' AND subscription_id IS NOT NULL
        GROUP BY subscription_id
      ) pay ON pay.subscription_id = s.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}, s.id DESC
    `;

    const dataParams = [...params];
    if (limitNum !== null) {
      dataQuery += ` LIMIT ? OFFSET ?`;
      dataParams.push(limitNum, offset);
    }

    const [rows] = await db.query(dataQuery, dataParams);

    return res.status(200).json({
      success: true,
      stats: {
        total_count: totalRecords,
        total_paid_count: Number(statsRow?.total_paid_count || 0),
        total_paid_amount: Number(statsRow?.total_paid_amount || 0),
        total_pending_count: Number(statsRow?.total_pending_count || 0),
        total_pending_amount: Number(statsRow?.total_pending_amount || 0),
        total_due_today_count: Number(statsRow?.total_due_today_count || 0),
        total_overdue_count: Number(statsRow?.total_overdue_count || 0),
        total_active_count: Number(statsRow?.total_active_count || 0),
      },
      pagination: {
        total_records: totalRecords,
        current_page: isAll ? 1 : pageNum,
        total_pages: limitNum ? Math.ceil(totalRecords / limitNum) : 1,
        limit: limitNum || totalRecords,
        has_next: limitNum ? pageNum * limitNum < totalRecords : false,
        has_prev: pageNum > 1,
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
