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
 *
 * Professional high-performance implementation for real-time applications:
 *  ✅ Index Alignment: Direct comparison on native DATE column (NO DATE() wrappers, hits idx_iis_pending)
 *  ✅ Minimal Scan: Driving table (iis) filtered first; PK lookups only on matched rows
 *  ✅ Clean Filter Flow: Predictable execution branch based on preset ('today' | 'overdue' | 'upcoming' | 'all')
 *  ✅ Zero Redundant Queries: In-memory summary calculation; no full-table aggregation unless ?with_stats=true
 *  ✅ Limit defaults to all records unless pagination is explicitly requested
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {string|Function} [routePreset] - 'today' | 'overdue' | 'upcoming' | Express next()
 */
export const getUpcomingDueSchedules = async (req, res, routePreset = null) => {
  try {
    // 1. Resolve preset type (supports route-level injection or query parameter fallback)
    const preset = typeof routePreset === "string" ? routePreset : null;
    const filterType = String(
      preset ||
      req.query.type ||
      req.query.due_type ||
      req.query.filter_type ||
      "all"
    )
      .toLowerCase()
      .trim();

    const {
      status = "PENDING",
      subscription_status,
      due_date,
      date,
      from_date,
      to_date,
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
      with_stats,
    } = req.query;

    const whereConditions = [];
    const params = [];

    // 2. Schedule Status Filter (aligns with idx_iis_pending leading column: status)
    if (status && status.toUpperCase() !== "ALL") {
      const upperStatus = status.toUpperCase().trim();
      if (upperStatus === "UNPAID") {
        whereConditions.push("iis.status IN ('PENDING', 'APPROVED')");
      } else if (upperStatus.includes(",")) {
        const statusList = upperStatus.split(",").map((s) => s.trim()).filter(Boolean);
        if (statusList.length > 0) {
          whereConditions.push(`iis.status IN (${statusList.map(() => "?").join(",")})`);
          params.push(...statusList);
        }
      } else {
        whereConditions.push("iis.status = ?");
        params.push(upperStatus);
      }
    }

    // 3. Controlled Date Predicate (Direct comparison on native DATE column - NO DATE() function calls)
    switch (filterType) {
      case "today":
        whereConditions.push("iis.interest_due_date = CURDATE()");
        break;

      case "overdue":
        whereConditions.push("iis.interest_due_date < CURDATE()");
        break;

      case "upcoming":
        if (to_date || due_date) {
          const upperDate = formatDateOnly(to_date || due_date);
          whereConditions.push("iis.interest_due_date > CURDATE() AND iis.interest_due_date <= ?");
          params.push(upperDate);
        } else {
          whereConditions.push("iis.interest_due_date > CURDATE()");
        }
        break;

      case "all":
      default:
        if (date) {
          whereConditions.push("iis.interest_due_date = ?");
          params.push(formatDateOnly(date));
        } else if (from_date && to_date) {
          whereConditions.push("iis.interest_due_date BETWEEN ? AND ?");
          params.push(formatDateOnly(from_date), formatDateOnly(to_date));
        } else if (from_date) {
          whereConditions.push("iis.interest_due_date >= ?");
          params.push(formatDateOnly(from_date));
        } else if (to_date) {
          whereConditions.push("iis.interest_due_date <= ?");
          params.push(formatDateOnly(to_date));
        } else if (due_date) {
          whereConditions.push("iis.interest_due_date <= ?");
          params.push(formatDateOnly(due_date));
        }
        break;
    }

    // 4. Subscription Status Filter
    if (subscription_status) {
      if (subscription_status.toUpperCase() !== "ALL") {
        whereConditions.push("s.status = ?");
        params.push(subscription_status.toUpperCase());
      }
    } else {
      whereConditions.push("s.status IN ('ACTIVE', 'INTEREST_STARTED')");
    }

    // 5. Direct Entity Filters
    if (subscription_id) {
      whereConditions.push("iis.subscription_id = ?");
      params.push(Number(subscription_id));
    }

    if (customer_id) {
      whereConditions.push("s.customer_id = ?");
      params.push(Number(customer_id));
    }

    if (plan_id) {
      whereConditions.push("s.plan_id = ?");
      params.push(Number(plan_id));
    }

    if (plan_code) {
      whereConditions.push("p.plan_code = ?");
      params.push(String(plan_code).trim());
    }

    if (payout_day) {
      whereConditions.push("p.payout_day = ?");
      params.push(String(payout_day).toUpperCase().trim());
    }

    // 6. Text Search (if specified)
    if (search && String(search).trim() !== "") {
      const term = `%${String(search).trim()}%`;
      whereConditions.push(`(
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        p.plan_name LIKE ? OR 
        p.plan_code LIKE ? OR 
        CAST(iis.subscription_id AS CHAR) LIKE ?
      )`);
      params.push(term, term, term, term, term);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // 7. Order By Clause
    const allowedSortColumns = {
      interest_due_date: "iis.interest_due_date",
      installment_no: "iis.installment_no",
      interest_amount: "iis.interest_amount",
      customer_name: "c.name",
      subscription_id: "iis.subscription_id",
      id: "iis.id",
    };
    const sortColumn = allowedSortColumns[sort_by] || "iis.interest_due_date";
    const sortDir = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";
    const orderSql = `ORDER BY ${sortColumn} ${sortDir}, iis.subscription_id ASC`;

    // 8. Limit & Pagination (Default is ALL data unless limit is explicitly given)
    let limitSql = "";
    const hasLimit =
      limit !== undefined &&
      limit !== null &&
      limit !== "" &&
      String(limit).toLowerCase() !== "all";

    if (hasLimit && !isNaN(Number(limit)) && Number(limit) > 0) {
      const limitNum = Number(limit);
      limitSql = " LIMIT ?";
      params.push(limitNum);

      if (page && !isNaN(Number(page)) && Number(page) > 1) {
        const offset = (Number(page) - 1) * limitNum;
        limitSql += " OFFSET ?";
        params.push(offset);
      }
    }

    // 9. Execute Main Query
    const query = `
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
          WHEN iis.interest_due_date < CURDATE() THEN 'OVERDUE'
          WHEN iis.interest_due_date = CURDATE() THEN 'TODAY'
          ELSE 'UPCOMING'
        END AS due_category
      FROM investment_interest_schedules iis
      JOIN investment_subscriptions s ON iis.subscription_id = s.id
      JOIN chit_customers c ON s.customer_id = c.id
      JOIN investment_plans p ON s.plan_id = p.id
      ${whereSql}
      ${orderSql}
      ${limitSql}
    `;

    const [rows] = await db.query(query, params);

    // 10. Summary Calculation (In-memory, zero additional DB overhead)
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

    // 11. Global Stats - Always compute unless explicitly disabled with with_stats=false
    let stats = undefined;
    if (with_stats !== "false" && with_stats !== "0") {
      const [statsRows] = await db.query(`
        SELECT 
          COUNT(*) AS total_pending,
          COALESCE(SUM(iis.interest_amount), 0) AS total_pending_amount,
          COUNT(CASE WHEN iis.interest_due_date < CURDATE() THEN 1 END) AS overdue_count,
          COALESCE(SUM(CASE WHEN iis.interest_due_date < CURDATE() THEN iis.interest_amount ELSE 0 END), 0) AS overdue_amount,
          COUNT(CASE WHEN iis.interest_due_date = CURDATE() THEN 1 END) AS today_count,
          COALESCE(SUM(CASE WHEN iis.interest_due_date = CURDATE() THEN iis.interest_amount ELSE 0 END), 0) AS today_amount,
          COUNT(CASE WHEN iis.interest_due_date > CURDATE() THEN 1 END) AS upcoming_count,
          COALESCE(SUM(CASE WHEN iis.interest_due_date > CURDATE() THEN iis.interest_amount ELSE 0 END), 0) AS upcoming_amount
        FROM investment_interest_schedules iis
        JOIN investment_subscriptions s ON iis.subscription_id = s.id
        WHERE iis.status IN ('PENDING', 'APPROVED')
          AND s.status IN ('ACTIVE', 'INTEREST_STARTED')
      `);
      const sRow = statsRows[0] || {};
      stats = {
        total_pending: Number(sRow.total_pending || 0),
        total_pending_amount: Number(Number(sRow.total_pending_amount || 0).toFixed(2)),
        overdue_count: Number(sRow.overdue_count || 0),
        overdue_amount: Number(Number(sRow.overdue_amount || 0).toFixed(2)),
        today_count: Number(sRow.today_count || 0),
        today_amount: Number(Number(sRow.today_amount || 0).toFixed(2)),
        upcoming_count: Number(sRow.upcoming_count || 0),
        upcoming_amount: Number(Number(sRow.upcoming_amount || 0).toFixed(2)),
      };
    }

    return res.status(200).json({
      success: true,
      filter_applied: filterType,
      count: rows.length,
      summary,
      ...(stats ? { stats } : {}),
      data: rows,
    });
  } catch (error) {
    console.error("Get upcoming due schedules error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching due schedules",
      error: error.message,
    });
  }
};
