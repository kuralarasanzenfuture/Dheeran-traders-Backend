import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import { formatDateOnly } from "../../../../utils/generateInvestmentSchedule.js";

const VALID_SCHEDULE_STATUSES = ["PENDING", "APPROVED", "PAID", "CANCELLED"];

/**
 * GET SCHEDULES BY SUBSCRIPTION ID
 * Filters: status, from_date, to_date
 */
export const getSchedulesBySubscriptionId = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const { status, from_date, to_date } = req.query;

    if (!subscription_id || isNaN(subscription_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required",
      });
    }

    // Verify subscription
    const [subRows] = await db.query(
      `SELECT s.id, s.customer_id, s.plan_id, s.principal_amount, s.status,
              c.name AS customer_name, c.phone AS customer_phone,
              p.plan_name, p.plan_code
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE s.id = ?`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Investment subscription #${subscription_id} not found`,
      });
    }

    let query = `
      SELECT 
        iis.id,
        iis.subscription_id,
        iis.installment_no,
        iis.interest_due_date,
        iis.interest_amount,
        iis.status,
        iis.paid_date,
        iis.paid_amount,
        iis.payment_id,
        iis.payment_mode,
        iis.remarks,
        iis.interest_updated_by,
        iis.interest_updated_at,
        iis.created_at,
        iis.updated_at
      FROM investment_interest_schedules iis
      WHERE iis.subscription_id = ?
    `;
    const params = [Number(subscription_id)];

    if (status && VALID_SCHEDULE_STATUSES.includes(status.toUpperCase())) {
      query += ` AND iis.status = ?`;
      params.push(status.toUpperCase());
    }

    if (from_date) {
      query += ` AND iis.interest_due_date >= ?`;
      params.push(formatDateOnly(from_date));
    }

    if (to_date) {
      query += ` AND iis.interest_due_date <= ?`;
      params.push(formatDateOnly(to_date));
    }

    query += ` ORDER BY iis.installment_no ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      subscription: subRows[0],
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get schedules by subscription id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching interest schedules",
    });
  }
};

/**
 * GET SINGLE SCHEDULE BY ID
 */
export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid schedule ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        iis.*,
        s.customer_id,
        s.plan_id,
        s.principal_amount,
        s.status AS subscription_status,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code
       FROM investment_interest_schedules iis
       JOIN investment_subscriptions s ON iis.subscription_id = s.id
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE iis.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Interest schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get schedule by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching schedule",
    });
  }
};

/**
 * UPDATE DYNAMIC INTEREST AMOUNT FOR A SCHEDULE
 * Allowed only for PENDING schedules within plan min/max interest range.
 */
export const updateScheduleInterestAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { interest_amount, remarks } = req.body;
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid schedule ID is required",
      });
    }

    if (interest_amount === undefined || isNaN(interest_amount)) {
      return res.status(400).json({
        success: false,
        message: "Valid interest_amount is required",
      });
    }

    const newAmount = Number(Number(interest_amount).toFixed(2));
    if (newAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "interest_amount cannot be negative",
      });
    }

    // Fetch existing schedule with row lock, subscription status, and plan tier limits
    const [rows] = await connection.query(
      `SELECT 
        iis.*,
        s.status AS subscription_status,
        pa.minimum_interest_amount,
        pa.maximum_interest_amount
       FROM investment_interest_schedules iis
       JOIN investment_subscriptions s ON iis.subscription_id = s.id
       JOIN investment_plan_amounts pa ON s.plan_amount_id = pa.id
       WHERE iis.id = ? FOR UPDATE`,
      [Number(id)]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Interest schedule not found",
      });
    }

    const oldData = rows[0];

    // 🔥 STRICT VALIDATION: ONLY EDIT BEFORE PAYMENT (ONCE PAY DONE, NOT ABLE TO EDIT)
    const isPaymentDone =
      oldData.status === "PAID" ||
      oldData.payment_id !== null ||
      oldData.paid_date !== null ||
      Number(oldData.paid_amount || 0) > 0;

    if (isPaymentDone) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: "PAYMENT_ALREADY_COMPLETED",
        message: `Cannot edit interest amount for installment #${oldData.installment_no}. Payment has already been completed on ${oldData.paid_date ? formatDateOnly(oldData.paid_date) : "record"} with amount ₹${oldData.paid_amount || oldData.interest_amount}. Interest amount can only be edited before payment is done.`,
      });
    }

    // Check if an associated payment record exists in investment_payments
    if (oldData.payment_id) {
      const [paymentRows] = await connection.query(
        `SELECT id, payment_date, total_amount, payment_mode FROM investment_payments WHERE id = ?`,
        [oldData.payment_id]
      );
      if (paymentRows.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          code: "PAYMENT_ALREADY_COMPLETED",
          message: `Cannot edit interest amount. Payment #${paymentRows[0].id} has already been recorded for this installment.`,
        });
      }
    }

    // Cannot modify if cancelled
    if (oldData.status === "CANCELLED") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: "SCHEDULE_CANCELLED",
        message: "Cannot modify interest amount for a CANCELLED installment",
      });
    }

    // Cannot modify if subscription is closed / cancelled / rejected
    if (["CANCELLED", "CLOSED", "REJECTED"].includes(oldData.subscription_status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_INACTIVE",
        message: `Cannot modify interest amount because subscription is ${oldData.subscription_status}`,
      });
    }

    // Validate min/max limits
    const minAllowed = Number(oldData.minimum_interest_amount);
    const maxAllowed = Number(oldData.maximum_interest_amount);

    if (newAmount < minAllowed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: "BELOW_MINIMUM_INTEREST",
        message: `interest_amount (₹${newAmount}) cannot be less than plan minimum allowed ₹${minAllowed}`,
      });
    }

    if (maxAllowed > 0 && newAmount > maxAllowed) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: "EXCEEDS_MAXIMUM_INTEREST",
        message: `interest_amount (₹${newAmount}) cannot exceed plan maximum allowed ₹${maxAllowed}`,
      });
    }

    // Update
    await connection.query(
      `UPDATE investment_interest_schedules 
       SET interest_amount = ?,
           interest_updated_by = ?,
           interest_updated_at = NOW(),
           updated_by = ?,
           remarks = ?
       WHERE id = ?`,
      [newAmount, userId, userId, remarks || oldData.remarks, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_interest_schedules WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // Audit Log
    await AuditLog({
      connection,
      table: "investment_interest_schedules",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Updated interest amount for installment #${oldData.installment_no} from ₹${oldData.interest_amount} to ₹${newAmount}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Schedule interest amount updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update schedule interest amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating interest amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * BULK APPROVE OR UPDATE STATUS OF SCHEDULES
 * E.g. Approve pending schedules for payout
 */
export const bulkUpdateScheduleStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { schedule_ids, status, remarks } = req.body;
    const userId = req.user?.id || null;

    if (!Array.isArray(schedule_ids) || schedule_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "schedule_ids must be a non-empty array of IDs",
      });
    }

    if (!status || !VALID_SCHEDULE_STATUSES.includes(String(status).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_SCHEDULE_STATUSES.join(", ")}`,
      });
    }

    const targetStatus = String(status).toUpperCase();

    // Check schedules
    const [existing] = await connection.query(
      `SELECT id, status, installment_no, subscription_id, paid_amount 
       FROM investment_interest_schedules 
       WHERE id IN (?)`,
      [schedule_ids]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching schedules found",
      });
    }

    // Prevent changing already PAID schedules
    const alreadyPaid = existing.filter((s) => s.status === "PAID");
    if (alreadyPaid.length > 0 && targetStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of already PAID installments (IDs: ${alreadyPaid.map((s) => s.id).join(", ")})`,
      });
    }

    const idsToUpdate = existing.map((s) => s.id);

    await connection.query(
      `UPDATE investment_interest_schedules 
       SET status = ?, updated_by = ?, remarks = COALESCE(?, remarks)
       WHERE id IN (?)`,
      [targetStatus, userId, remarks || null, idsToUpdate]
    );

    // Audit Log for the batch
    await AuditLog({
      connection,
      table: "investment_interest_schedules",
      recordId: idsToUpdate[0],
      action: "UPDATE",
      newData: { updated_ids: idsToUpdate, target_status: targetStatus },
      userId,
      remarks: remarks || `Bulk updated ${idsToUpdate.length} schedules to ${targetStatus}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${idsToUpdate.length} schedule(s) to ${targetStatus}`,
      updated_count: idsToUpdate.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Bulk update schedule status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while bulk updating schedules",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET UPCOMING / DUE / OVERDUE SCHEDULES ACROSS ALL SUBSCRIPTIONS
 * Supports:
 *  - type / due_type / filter_type: 'today' | 'overdue' | 'upcoming' | 'all'
 *  - status: 'PENDING' (default), 'APPROVED', 'PAID', 'UNPAID', 'ALL', or comma-separated
 *  - due_date, date, from_date, to_date
 *  - plan_id, plan_code, customer_id, subscription_id, payout_day
 *  - search (customer name, customer phone, plan name, plan code, subscription ID)
 *  - limit: default all data (no limit unless explicitly specified)
 *  - page: pagination offset if limit is provided
 *  - sort_by, sort_order
 */
export const getUpcomingDueSchedules = async (req, res, next, explicitType = null) => {
  // If called as (req, res, explicitType) without next
  if (typeof next === "string" && !explicitType) {
    explicitType = next;
  }

  try {
    const {
      type,
      due_type,
      filter_type,
      filter,
      is_today,
      is_overdue,
      is_upcoming,
      due_date,
      date,
      from_date,
      to_date,
      status = "PENDING",
      subscription_status,
      plan_id,
      plan_code,
      customer_id,
      subscription_id,
      payout_day,
      search,
      sort_by = "interest_due_date",
      sort_order = "ASC",
      limit,
      page,
    } = req.query;

    let query = `
      SELECT 
        iis.id,
        iis.subscription_id,
        iis.installment_no,
        DATE_FORMAT(iis.interest_due_date, '%Y-%m-%d') AS interest_due_date,
        iis.interest_amount,
        iis.status,
        iis.paid_date,
        iis.paid_amount,
        iis.payment_id,
        iis.payment_mode,
        iis.remarks,
        iis.interest_updated_by,
        iis.interest_updated_at,
        s.principal_amount,
        s.customer_id,
        s.plan_id,
        s.investment_date,
        s.status AS subscription_status,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        p.payout_day,
        DATEDIFF(CURDATE(), iis.interest_due_date) AS days_overdue,
        CASE 
          WHEN iis.status = 'PAID' THEN 'PAID'
          WHEN iis.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN DATE(iis.interest_due_date) < CURDATE() THEN 'OVERDUE'
          WHEN DATE(iis.interest_due_date) = CURDATE() THEN 'TODAY'
          ELSE 'UPCOMING'
        END AS due_category
      FROM investment_interest_schedules iis
      JOIN investment_subscriptions s ON iis.subscription_id = s.id
      JOIN chit_customers c ON s.customer_id = c.id
      JOIN investment_plans p ON s.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by subscription status (default ACTIVE and INTEREST_STARTED)
    if (subscription_status) {
      if (subscription_status.toUpperCase() !== "ALL") {
        query += ` AND s.status = ?`;
        params.push(subscription_status.toUpperCase());
      }
    } else {
      query += ` AND s.status IN ('ACTIVE', 'INTEREST_STARTED')`;
    }

    // Filter by schedule status
    if (status && status.toUpperCase() !== "ALL") {
      const upperStatus = status.toUpperCase().trim();
      if (upperStatus === "UNPAID") {
        query += ` AND iis.status IN ('PENDING', 'APPROVED')`;
      } else if (upperStatus.includes(",")) {
        const statusList = upperStatus.split(",").map((s) => s.trim()).filter(Boolean);
        if (statusList.length > 0) {
          query += ` AND iis.status IN (${statusList.map(() => "?").join(",")})`;
          params.push(...statusList);
        }
      } else {
        query += ` AND iis.status = ?`;
        params.push(upperStatus);
      }
    }

    // Detect route category safely
    let routeType = typeof explicitType === "string" ? explicitType : null;
    if (!routeType) {
      const currentPath = String(req.path || req.originalUrl || "").toLowerCase();
      if (currentPath.includes("/due/today")) routeType = "today";
      else if (currentPath.includes("/due/overdue")) routeType = "overdue";
      else if (currentPath.includes("/due/upcoming")) routeType = "upcoming";
    }
    const rawFilter = routeType || type || due_type || filter_type || filter || "";
    const activeFilter = String(rawFilter).toLowerCase().trim();
    const checkIsToday = is_today === "true" || is_today === "1" || activeFilter === "today";
    const checkIsOverdue = is_overdue === "true" || is_overdue === "1" || activeFilter === "overdue";
    const checkIsUpcoming = is_upcoming === "true" || is_upcoming === "1" || activeFilter === "upcoming";

    if (checkIsToday) {
      query += ` AND DATE(iis.interest_due_date) = CURDATE()`;
    } else if (checkIsOverdue) {
      query += ` AND DATE(iis.interest_due_date) < CURDATE()`;
    } else if (checkIsUpcoming) {
      query += ` AND DATE(iis.interest_due_date) > CURDATE()`;
    }

    // Exact date filter
    if (date) {
      query += ` AND DATE(iis.interest_due_date) = ?`;
      params.push(formatDateOnly(date));
    }

    // Date range filter
    if (from_date) {
      query += ` AND DATE(iis.interest_due_date) >= ?`;
      params.push(formatDateOnly(from_date));
    }

    if (to_date) {
      query += ` AND DATE(iis.interest_due_date) <= ?`;
      params.push(formatDateOnly(to_date));
    }

    // Due date filter (<= due_date) for upcoming, general due, or specific date cutoff
    if (due_date && !from_date && !to_date && !date && !checkIsToday) {
      const formattedDueDate = formatDateOnly(due_date);
      if (formattedDueDate) {
        query += ` AND DATE(iis.interest_due_date) <= ?`;
        params.push(formattedDueDate);
      }
    }

    // Plan filters
    if (plan_id) {
      query += ` AND s.plan_id = ?`;
      params.push(Number(plan_id));
    }

    if (plan_code) {
      query += ` AND p.plan_code = ?`;
      params.push(String(plan_code).trim());
    }

    // Customer / Subscription filters
    if (customer_id) {
      query += ` AND s.customer_id = ?`;
      params.push(Number(customer_id));
    }

    if (subscription_id) {
      query += ` AND iis.subscription_id = ?`;
      params.push(Number(subscription_id));
    }

    // Payout day (e.g., 'SUNDAY', 'MONDAY', etc.)
    if (payout_day) {
      query += ` AND UPPER(p.payout_day) = ?`;
      params.push(String(payout_day).toUpperCase().trim());
    }

    // Text search (customer name, customer phone, plan name, plan code, subscription id)
    if (search && String(search).trim() !== "") {
      const searchTerm = `%${String(search).trim()}%`;
      query += ` AND (
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        p.plan_name LIKE ? OR 
        p.plan_code LIKE ? OR 
        CAST(iis.subscription_id AS CHAR) LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Sorting
    const allowedSortColumns = {
      interest_due_date: "iis.interest_due_date",
      due_date: "iis.interest_due_date",
      installment_no: "iis.installment_no",
      interest_amount: "iis.interest_amount",
      customer_name: "c.name",
      subscription_id: "iis.subscription_id",
      id: "iis.id",
    };
    const orderColumn = allowedSortColumns[sort_by] || "iis.interest_due_date";
    const orderDirection = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    query += ` ORDER BY ${orderColumn} ${orderDirection}, iis.subscription_id ASC`;

    // Limit & Pagination (Default is ALL data unless limit is explicitly specified)
    const hasExplicitLimit =
      limit !== undefined &&
      limit !== null &&
      limit !== "" &&
      String(limit).toLowerCase() !== "all";

    if (hasExplicitLimit && !isNaN(Number(limit)) && Number(limit) > 0) {
      const limitNum = Number(limit);
      query += ` LIMIT ?`;
      params.push(limitNum);

      if (page && !isNaN(Number(page)) && Number(page) > 1) {
        const offset = (Number(page) - 1) * limitNum;
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }

    const [rows] = await db.query(query, params);

    // Calculate summary statistics
    const summary = {
      total_records: rows.length,
      total_interest_amount: Number(
        rows.reduce((sum, r) => sum + Number(r.interest_amount || 0), 0).toFixed(2)
      ),
      overdue_count: rows.filter((r) => r.due_category === "OVERDUE").length,
      overdue_amount: Number(
        rows
          .filter((r) => r.due_category === "OVERDUE")
          .reduce((sum, r) => sum + Number(r.interest_amount || 0), 0)
          .toFixed(2)
      ),
      today_count: rows.filter((r) => r.due_category === "TODAY").length,
      today_amount: Number(
        rows
          .filter((r) => r.due_category === "TODAY")
          .reduce((sum, r) => sum + Number(r.interest_amount || 0), 0)
          .toFixed(2)
      ),
      upcoming_count: rows.filter((r) => r.due_category === "UPCOMING").length,
      upcoming_amount: Number(
        rows
          .filter((r) => r.due_category === "UPCOMING")
          .reduce((sum, r) => sum + Number(r.interest_amount || 0), 0)
          .toFixed(2)
      ),
    };

    // Global stats across all pending schedules for badges / tabs
    const [overallStatsRows] = await db.query(`
      SELECT 
        COUNT(*) AS total_pending,
        COALESCE(SUM(iis.interest_amount), 0) AS total_pending_amount,
        COUNT(CASE WHEN DATE(iis.interest_due_date) < CURDATE() THEN 1 END) AS overdue_count,
        COALESCE(SUM(CASE WHEN DATE(iis.interest_due_date) < CURDATE() THEN iis.interest_amount ELSE 0 END), 0) AS overdue_amount,
        COUNT(CASE WHEN DATE(iis.interest_due_date) = CURDATE() THEN 1 END) AS today_count,
        COALESCE(SUM(CASE WHEN DATE(iis.interest_due_date) = CURDATE() THEN iis.interest_amount ELSE 0 END), 0) AS today_amount,
        COUNT(CASE WHEN DATE(iis.interest_due_date) > CURDATE() THEN 1 END) AS upcoming_count,
        COALESCE(SUM(CASE WHEN DATE(iis.interest_due_date) > CURDATE() THEN iis.interest_amount ELSE 0 END), 0) AS upcoming_amount
      FROM investment_interest_schedules iis
      JOIN investment_subscriptions s ON iis.subscription_id = s.id
      WHERE iis.status = 'PENDING'
        AND s.status IN ('ACTIVE', 'INTEREST_STARTED')
    `);

    const overallStats = overallStatsRows[0] || {};

    return res.status(200).json({
      success: true,
      count: rows.length,
      filter: {
        type: activeFilter || "all",
        status: status || "PENDING",
        due_date: due_date || null,
        from_date: from_date || null,
        to_date: to_date || null,
      },
      summary,
      stats: {
        total_pending: Number(overallStats.total_pending || 0),
        total_pending_amount: Number(Number(overallStats.total_pending_amount || 0).toFixed(2)),
        overdue_count: Number(overallStats.overdue_count || 0),
        overdue_amount: Number(Number(overallStats.overdue_amount || 0).toFixed(2)),
        today_count: Number(overallStats.today_count || 0),
        today_amount: Number(Number(overallStats.today_amount || 0).toFixed(2)),
        upcoming_count: Number(overallStats.upcoming_count || 0),
        upcoming_amount: Number(Number(overallStats.upcoming_amount || 0).toFixed(2)),
      },
      data: rows,
    });
  } catch (error) {
    console.error("Get upcoming due schedules error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching due schedules", error: error.message,
    });
  }
};

/**
 * GET TODAY'S DUE SCHEDULES
 */
export const getTodayDueSchedules = async (req, res, next) => {
  return getUpcomingDueSchedules(req, res, "today");
};

/**
 * GET OVERDUE SCHEDULES
 */
export const getOverdueSchedules = async (req, res, next) => {
  return getUpcomingDueSchedules(req, res, "overdue");
};

/**
 * GET UPCOMING SCHEDULES
 */
export const getUpcomingSchedules = async (req, res, next) => {
  return getUpcomingDueSchedules(req, res, "upcoming");
};
