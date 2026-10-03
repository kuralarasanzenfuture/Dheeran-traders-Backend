import db from "../../../../config/db.js";
import { formatDateOnly } from "../../../../utils/generateMonthlyInvestmentSchedule.js";

/**
 * GET SCHEDULES BY SUBSCRIPTION ID
 * Returns all generated monthly interest schedules for a specific subscription.
 */
export const getSchedulesBySubscriptionId = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const { status } = req.query;

    if (!subscription_id || isNaN(subscription_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required",
      });
    }

    // Verify subscription exists
    const [subRows] = await db.query(
      `SELECT mis.*, c.name AS customer_name, c.phone AS customer_phone, mip.plan_name, mip.plan_code 
       FROM monthly_investment_subscriptions mis
       JOIN chit_customers c ON mis.customer_id = c.id
       JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
       WHERE mis.id = ?`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Monthly investment subscription not found",
      });
    }

    let query = `
      SELECT 
        miis.*,
        DATE_FORMAT(miis.period_start_date, '%Y-%m-%d') AS period_start_date,
        DATE_FORMAT(miis.period_end_date, '%Y-%m-%d') AS period_end_date,
        DATE_FORMAT(miis.interest_due_date, '%Y-%m-%d') AS interest_due_date,
        DATEDIFF(CURDATE(), miis.interest_due_date) AS days_overdue,
        CASE 
          WHEN miis.status = 'PAID' THEN 'PAID'
          WHEN miis.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN miis.interest_due_date < CURDATE() THEN 'OVERDUE'
          WHEN miis.interest_due_date = CURDATE() THEN 'TODAY'
          ELSE 'UPCOMING'
        END AS due_category
      FROM monthly_investment_interest_schedules miis 
      WHERE miis.subscription_id = ?
    `;
    const params = [Number(subscription_id)];

    if (status) {
      query += ` AND miis.status = ?`;
      params.push(status.toUpperCase());
    }

    query += ` ORDER BY miis.interest_no ASC`;

    const [schedules] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      subscription: subRows[0],
      count: schedules.length,
      data: schedules,
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
 * GET UPCOMING / TODAY DUE / OVERDUE MONTHLY INVESTMENT SCHEDULES (Due Payments API)
 * Supports:
 *  - Route Presets: 'today' | 'overdue' | 'upcoming'
 *  - Date Presets: date_filter = 'today' | 'yesterday' | 'tomorrow' | 'overdue' | 'upcoming' | 'this_week' | 'this_month' | 'custom'
 *  - Date Range: from_date & to_date, date, due_date
 *  - Entity Filters: customer_id, area_id, plan_id, plan_amount_id, subscription_id, interest_no, payment_day
 *  - Text Search: customer_name, customer_phone, subscription_no, plan_name, area_name
 *  - KPI Summaries & Global Statistics
 */
export const getMonthlyInvestmentDueSchedules = async (req, res, routePreset = null) => {
  try {
    const preset = typeof routePreset === "string" ? routePreset.toLowerCase().trim() : null;
    const filterType = String(
      preset ||
      req.query.type ||
      req.query.due_type ||
      req.query.date_filter ||
      req.query.filter_type ||
      "all"
    )
      .toLowerCase()
      .trim();

    const {
      status = "UNPAID",
      subscription_status = "ACTIVE",
      date,
      from_date,
      to_date,
      due_date,
      customer_id,
      area_id,
      plan_id,
      plan_amount_id,
      subscription_id,
      subscription_no,
      interest_no,
      payment_day,
      search,
      sort_by = "interest_due_date",
      sort_order = "ASC",
      page,
      limit,
      with_stats,
    } = req.query;

    const whereConditions = [];
    const params = [];

    // 1. Status Filter (default UNPAID = PENDING, DUE, PARTIAL with pending_amount > 0)
    if (status && status.toUpperCase() !== "ALL") {
      const upperStatus = status.toUpperCase().trim();
      if (upperStatus === "UNPAID") {
        whereConditions.push("miis.status IN ('PENDING', 'DUE', 'PARTIAL') AND miis.pending_amount > 0");
      } else if (upperStatus.includes(",")) {
        const statusList = upperStatus.split(",").map((s) => s.trim()).filter(Boolean);
        if (statusList.length > 0) {
          whereConditions.push(`miis.status IN (${statusList.map(() => "?").join(",")})`);
          params.push(...statusList);
        }
      } else {
        whereConditions.push("miis.status = ?");
        params.push(upperStatus);
      }
    }

    // 2. Subscription Status Filter (default ACTIVE)
    if (subscription_status && subscription_status.toUpperCase() !== "ALL") {
      whereConditions.push("mis.status = ?");
      params.push(subscription_status.toUpperCase());
    } else {
      whereConditions.push("mis.status NOT IN ('CANCELLED', 'PRECLOSED')");
    }

    // 3. Date Predicate & Filter Presets
    switch (filterType) {
      case "today":
        whereConditions.push("miis.interest_due_date = CURDATE()");
        break;

      case "yesterday":
        whereConditions.push("miis.interest_due_date = SUBDATE(CURDATE(), 1)");
        break;

      case "tomorrow":
        whereConditions.push("miis.interest_due_date = ADDDATE(CURDATE(), 1)");
        break;

      case "overdue":
        whereConditions.push("miis.interest_due_date < CURDATE()");
        break;

      case "upcoming":
      case "upcoming_30":
      case "upcoming_60":
      case "upcoming_90":
      case "upcoming_all": {
        const horizon = req.query.days || req.query.horizon || req.query.range;
        if (to_date || due_date) {
          const upperDate = formatDateOnly(new Date(to_date || due_date));
          whereConditions.push("miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ?");
          params.push(upperDate);
        } else if (filterType === "upcoming_all" || horizon === "all" || horizon === "all_upcoming") {
          whereConditions.push("miis.interest_due_date > CURDATE()");
        } else {
          let daysNum = 30;
          if (filterType === "upcoming_60") daysNum = 60;
          else if (filterType === "upcoming_90") daysNum = 90;
          else if (horizon && !isNaN(horizon)) daysNum = parseInt(horizon, 10);
          whereConditions.push("miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), ?)");
          params.push(daysNum);
        }
        break;
      }

      case "this_week":
        whereConditions.push("YEARWEEK(miis.interest_due_date, 1) = YEARWEEK(CURDATE(), 1)");
        break;

      case "this_month":
        whereConditions.push("YEAR(miis.interest_due_date) = YEAR(CURDATE()) AND MONTH(miis.interest_due_date) = MONTH(CURDATE())");
        break;

      case "all":
      default:
        if (date) {
          if (String(date).toLowerCase() === "today") {
            whereConditions.push("miis.interest_due_date = CURDATE()");
          } else {
            whereConditions.push("miis.interest_due_date = ?");
            params.push(formatDateOnly(new Date(date)));
          }
        } else if (from_date && to_date) {
          whereConditions.push("miis.interest_due_date BETWEEN ? AND ?");
          params.push(formatDateOnly(new Date(from_date)), formatDateOnly(new Date(to_date)));
        } else if (from_date) {
          whereConditions.push("miis.interest_due_date >= ?");
          params.push(formatDateOnly(new Date(from_date)));
        } else if (to_date) {
          whereConditions.push("miis.interest_due_date <= ?");
          params.push(formatDateOnly(new Date(to_date)));
        } else if (due_date) {
          whereConditions.push("miis.interest_due_date <= ?");
          params.push(formatDateOnly(new Date(due_date)));
        }
        break;
    }

    // 4. Entity Filters
    if (customer_id && !isNaN(customer_id)) {
      whereConditions.push("mis.customer_id = ?");
      params.push(Number(customer_id));
    }

    if (area_id && !isNaN(area_id)) {
      whereConditions.push("c.area_id = ?");
      params.push(Number(area_id));
    }

    if (plan_id && !isNaN(plan_id)) {
      whereConditions.push("mis.plan_id = ?");
      params.push(Number(plan_id));
    }

    if (plan_amount_id && !isNaN(plan_amount_id)) {
      whereConditions.push("mis.plan_amount_id = ?");
      params.push(Number(plan_amount_id));
    }

    if (subscription_id && !isNaN(subscription_id)) {
      whereConditions.push("miis.subscription_id = ?");
      params.push(Number(subscription_id));
    }

    if (subscription_no) {
      whereConditions.push("mis.subscription_no = ?");
      params.push(String(subscription_no).trim());
    }

    if (interest_no && !isNaN(interest_no)) {
      whereConditions.push("miis.interest_no = ?");
      params.push(Number(interest_no));
    }

    if (payment_day && !isNaN(payment_day)) {
      whereConditions.push("DAY(miis.interest_due_date) = ?");
      params.push(Number(payment_day));
    }

    // 5. Multi-column Search
    if (search && String(search).trim() !== "") {
      const term = `%${String(search).trim()}%`;
      whereConditions.push(`(
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        mis.subscription_no LIKE ? OR 
        mip.plan_name LIKE ? OR 
        mip.plan_code LIKE ? OR 
        a.name LIKE ?
      )`);
      params.push(term, term, term, term, term, term);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // 6. Ordering
    const allowedSortColumns = {
      interest_due_date: "miis.interest_due_date",
      interest_no: "miis.interest_no",
      interest_amount: "miis.interest_amount",
      pending_amount: "miis.pending_amount",
      paid_amount: "miis.paid_amount",
      customer_name: "c.name",
      subscription_no: "mis.subscription_no",
      id: "miis.id",
    };
    const sortColumn = allowedSortColumns[sort_by] || "miis.interest_due_date";
    const sortDir = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";
    const orderSql = `ORDER BY ${sortColumn} ${sortDir}, miis.interest_no ASC`;

    // 7. Base Query Construction
    const baseFromSql = `
      FROM monthly_investment_interest_schedules miis
      JOIN monthly_investment_subscriptions mis ON miis.subscription_id = mis.id
      JOIN chit_customers c ON mis.customer_id = c.id
      LEFT JOIN areas a ON c.area_id = a.id
      JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
      JOIN monthly_investment_plan_amounts mipa ON mis.plan_amount_id = mipa.id
    `;

    // 8. Pagination
    let limitSql = "";
    let pageNum = 1;
    let limitNum = 50;
    const isAll = String(limit).toLowerCase() === "all" || limit === "0" || limit === 0;

    if (!isAll) {
      pageNum = Math.max(1, parseInt(page, 10) || 1);
      limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;
      limitSql = ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    // 9. Total Count Query
    const countQuery = `SELECT COUNT(*) AS total ${baseFromSql} ${whereSql}`;
    const [countRows] = await db.query(countQuery, params);
    const totalCount = countRows[0]?.total || 0;

    // 10. Main Select Query
    const selectQuery = `
      SELECT 
        miis.id,
        miis.subscription_id,
        miis.interest_no,
        DATE_FORMAT(miis.period_start_date, '%Y-%m-%d') AS period_start_date,
        DATE_FORMAT(miis.period_end_date, '%Y-%m-%d') AS period_end_date,
        DATE_FORMAT(miis.interest_due_date, '%Y-%m-%d') AS interest_due_date,
        miis.interest_amount,
        miis.paid_amount,
        miis.pending_amount,
        miis.status,
        miis.paid_date,
        miis.payment_id,
        miis.payment_mode,
        miis.transaction_reference,
        miis.remarks,
        mis.subscription_no,
        mis.customer_id,
        mis.plan_id,
        mis.plan_amount_id,
        mis.quantity,
        mis.principal_amount_per_quantity,
        mis.total_principal_amount,
        mis.monthly_interest_amount_per_quantity,
        mis.total_monthly_interest_amount,
        mis.status AS subscription_status,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.area_id,
        a.name AS area_name,
        mip.plan_name,
        mip.plan_code,
        mip.interest_payment_days,
        mipa.principal_amount AS tier_principal_amount,
        DATEDIFF(CURDATE(), miis.interest_due_date) AS days_overdue,
        CASE 
          WHEN miis.status = 'PAID' THEN 'PAID'
          WHEN miis.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN miis.interest_due_date < CURDATE() THEN 'OVERDUE'
          WHEN miis.interest_due_date = CURDATE() THEN 'TODAY'
          ELSE 'UPCOMING'
        END AS due_category
      ${baseFromSql}
      ${whereSql}
      ${orderSql}
      ${limitSql}
    `;

    const [rows] = await db.query(selectQuery, params);

    // 11. In-Memory Summary for the Current Filter Set
    const summary = {
      total_records: rows.length,
      total_interest_amount: Number(
        rows.reduce((sum, r) => sum + Number(r.interest_amount || 0), 0).toFixed(2)
      ),
      total_pending_amount: Number(
        rows.reduce((sum, r) => sum + Number(r.pending_amount || 0), 0).toFixed(2)
      ),
      total_paid_amount: Number(
        rows.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0).toFixed(2)
      ),
      overdue_count: rows.filter((r) => r.due_category === "OVERDUE").length,
      overdue_amount: Number(
        rows
          .filter((r) => r.due_category === "OVERDUE")
          .reduce((sum, r) => sum + Number(r.pending_amount || 0), 0)
          .toFixed(2)
      ),
      today_count: rows.filter((r) => r.due_category === "TODAY").length,
      today_amount: Number(
        rows
          .filter((r) => r.due_category === "TODAY")
          .reduce((sum, r) => sum + Number(r.pending_amount || 0), 0)
          .toFixed(2)
      ),
      upcoming_count: rows.filter((r) => r.due_category === "UPCOMING").length,
      upcoming_amount: Number(
        rows
          .filter((r) => r.due_category === "UPCOMING")
          .reduce((sum, r) => sum + Number(r.pending_amount || 0), 0)
          .toFixed(2)
      ),
      upcoming_30_days_count: rows.filter((r) => r.due_category === "UPCOMING").length,
      upcoming_30_days_amount: Number(
        rows
          .filter((r) => r.due_category === "UPCOMING")
          .reduce((sum, r) => sum + Number(r.pending_amount || 0), 0)
          .toFixed(2)
      ),
      total_pending_count: rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED").length,
    };

    // 12. Global Overall Stats across all Active Subscriptions (unless disabled with ?with_stats=false)
    let stats = undefined;
    if (with_stats !== "false" && with_stats !== "0") {
      const [statsRows] = await db.query(`
        SELECT 
          COUNT(*) AS total_pending_schedules,
          COALESCE(SUM(miis.pending_amount), 0) AS total_pending_amount,
          COUNT(CASE WHEN miis.interest_due_date < CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') AND miis.pending_amount > 0 THEN 1 END) AS overdue_count,
          COALESCE(SUM(CASE WHEN miis.interest_due_date < CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS overdue_amount,
          COUNT(CASE WHEN miis.interest_due_date = CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS today_count,
          COALESCE(SUM(CASE WHEN miis.interest_due_date = CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS today_amount,
          COUNT(CASE WHEN miis.interest_due_date > CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS upcoming_count,
          COALESCE(SUM(CASE WHEN miis.interest_due_date > CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS upcoming_amount
        FROM monthly_investment_interest_schedules miis
        JOIN monthly_investment_subscriptions mis ON miis.subscription_id = mis.id
        WHERE miis.status IN ('PENDING', 'DUE', 'PARTIAL')
          AND mis.status = 'ACTIVE'
      `);
      const sRow = statsRows[0] || {};
      stats = {
        total_pending: Number(sRow.total_pending_schedules || 0),
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
      total: totalCount,
      count: rows.length,
      page: isAll ? 1 : pageNum,
      limit: isAll ? totalCount : limitNum,
      summary,
      stats,
      data: rows,
    });
  } catch (error) {
    console.error("Get monthly investment due schedules error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching due schedules",
    });
  }
};

/**
 * GET MONTHLY INVESTMENT DUE SUMMARY / DASHBOARD METRICS
 * High-performance aggregated stats: Today due, Overdue, Upcoming, This Month, Paid Today
 */
export const getMonthlyInvestmentDueSummary = async (req, res) => {
  try {
    const todayStr = formatDateOnly(new Date());

    const [statsRows] = await db.query(`
      SELECT 
        -- OVERDUE
        COUNT(CASE WHEN miis.interest_due_date < CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') AND miis.pending_amount > 0 THEN 1 END) AS overdue_count,
        COALESCE(SUM(CASE WHEN miis.interest_due_date < CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS overdue_amount,

        -- TODAY DUE
        COUNT(CASE WHEN miis.interest_due_date = CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS today_count,
        COALESCE(SUM(CASE WHEN miis.interest_due_date = CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS today_amount,

        -- UPCOMING NEXT 7 DAYS
        COUNT(CASE WHEN miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), 7) AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS upcoming_7_days_count,
        COALESCE(SUM(CASE WHEN miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), 7) AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS upcoming_7_days_amount,

        -- UPCOMING NEXT 30 DAYS
        COUNT(CASE WHEN miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), 30) AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS upcoming_30_days_count,
        COALESCE(SUM(CASE WHEN miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), 30) AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS upcoming_30_days_amount,

        -- UPCOMING NEXT 60 DAYS
        COUNT(CASE WHEN miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), 60) AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS upcoming_60_days_count,
        COALESCE(SUM(CASE WHEN miis.interest_due_date > CURDATE() AND miis.interest_due_date <= ADDDATE(CURDATE(), 60) AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS upcoming_60_days_amount,

        -- ALL UPCOMING
        COUNT(CASE WHEN miis.interest_due_date > CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN 1 END) AS upcoming_all_count,
        COALESCE(SUM(CASE WHEN miis.interest_due_date > CURDATE() AND miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS upcoming_all_amount,

        -- THIS CURRENT MONTH ALL DUE
        COUNT(CASE WHEN YEAR(miis.interest_due_date) = YEAR(CURDATE()) AND MONTH(miis.interest_due_date) = MONTH(CURDATE()) THEN 1 END) AS this_month_total_schedules,
        COALESCE(SUM(CASE WHEN YEAR(miis.interest_due_date) = YEAR(CURDATE()) AND MONTH(miis.interest_due_date) = MONTH(CURDATE()) THEN miis.interest_amount ELSE 0 END), 0) AS this_month_total_interest,
        COALESCE(SUM(CASE WHEN YEAR(miis.interest_due_date) = YEAR(CURDATE()) AND MONTH(miis.interest_due_date) = MONTH(CURDATE()) THEN miis.paid_amount ELSE 0 END), 0) AS this_month_paid_amount,
        COALESCE(SUM(CASE WHEN YEAR(miis.interest_due_date) = YEAR(CURDATE()) AND MONTH(miis.interest_due_date) = MONTH(CURDATE()) THEN miis.pending_amount ELSE 0 END), 0) AS this_month_pending_amount,

        -- TOTAL ALL-TIME UNPAID
        COUNT(CASE WHEN miis.status IN ('PENDING', 'DUE', 'PARTIAL') AND miis.pending_amount > 0 THEN 1 END) AS total_unpaid_count,
        COALESCE(SUM(CASE WHEN miis.status IN ('PENDING', 'DUE', 'PARTIAL') THEN miis.pending_amount ELSE 0 END), 0) AS total_unpaid_amount,

        -- PAID TODAY
        COUNT(CASE WHEN miis.paid_date = CURDATE() THEN 1 END) AS paid_today_count,
        COALESCE(SUM(CASE WHEN miis.paid_date = CURDATE() THEN miis.paid_amount ELSE 0 END), 0) AS paid_today_amount
      FROM monthly_investment_interest_schedules miis
      JOIN monthly_investment_subscriptions mis ON miis.subscription_id = mis.id
      WHERE mis.status = 'ACTIVE'
    `);

    const r = statsRows[0] || {};

    return res.status(200).json({
      success: true,
      date: todayStr,
      data: {
        today: {
          count: Number(r.today_count || 0),
          amount: Number(Number(r.today_amount || 0).toFixed(2)),
        },
        overdue: {
          count: Number(r.overdue_count || 0),
          amount: Number(Number(r.overdue_amount || 0).toFixed(2)),
        },
        upcoming_7_days: {
          count: Number(r.upcoming_7_days_count || 0),
          amount: Number(Number(r.upcoming_7_days_amount || 0).toFixed(2)),
        },
        upcoming_30_days: {
          count: Number(r.upcoming_30_days_count || 0),
          amount: Number(Number(r.upcoming_30_days_amount || 0).toFixed(2)),
        },
        upcoming_60_days: {
          count: Number(r.upcoming_60_days_count || 0),
          amount: Number(Number(r.upcoming_60_days_amount || 0).toFixed(2)),
        },
        upcoming_all: {
          count: Number(r.upcoming_all_count || 0),
          amount: Number(Number(r.upcoming_all_amount || 0).toFixed(2)),
        },
        this_month: {
          total_schedules: Number(r.this_month_total_schedules || 0),
          total_interest: Number(Number(r.this_month_total_interest || 0).toFixed(2)),
          paid_amount: Number(Number(r.this_month_paid_amount || 0).toFixed(2)),
          pending_amount: Number(Number(r.this_month_pending_amount || 0).toFixed(2)),
        },
        all_unpaid: {
          count: Number(r.total_unpaid_count || 0),
          amount: Number(Number(r.total_unpaid_amount || 0).toFixed(2)),
        },
        paid_today: {
          count: Number(r.paid_today_count || 0),
          amount: Number(Number(r.paid_today_amount || 0).toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error("Get monthly investment due summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while generating due summary metrics",
    });
  }
};

/**
 * GET ALL MONTHLY INVESTMENT SCHEDULES (Across all subscriptions)
 * Useful for collection agents, dashboards, overdue tracking, and finance reports.
 */
export const getAllMonthlyInvestmentSchedules = async (req, res) => {
  return getMonthlyInvestmentDueSchedules(req, res, req.query.due_type || req.query.date_filter || "all");
};

/**
 * GET MONTHLY INVESTMENT SCHEDULE BY ID
 */
export const getMonthlyInvestmentScheduleById = async (req, res) => {
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
        miis.*,
        DATE_FORMAT(miis.period_start_date, '%Y-%m-%d') AS period_start_date,
        DATE_FORMAT(miis.period_end_date, '%Y-%m-%d') AS period_end_date,
        DATE_FORMAT(miis.interest_due_date, '%Y-%m-%d') AS interest_due_date,
        mis.subscription_no,
        mis.customer_id,
        mis.plan_id,
        mis.plan_amount_id,
        mis.quantity,
        mis.total_principal_amount,
        mis.total_monthly_interest_amount,
        mis.status AS subscription_status,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.area_id,
        a.name AS area_name,
        mip.plan_name,
        mip.plan_code,
        mip.interest_payment_days,
        mipa.principal_amount AS tier_principal_amount,
        DATEDIFF(CURDATE(), miis.interest_due_date) AS days_overdue,
        CASE 
          WHEN miis.status = 'PAID' THEN 'PAID'
          WHEN miis.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN miis.interest_due_date < CURDATE() THEN 'OVERDUE'
          WHEN miis.interest_due_date = CURDATE() THEN 'TODAY'
          ELSE 'UPCOMING'
        END AS due_category
      FROM monthly_investment_interest_schedules miis
      JOIN monthly_investment_subscriptions mis ON miis.subscription_id = mis.id
      JOIN chit_customers c ON mis.customer_id = c.id
      LEFT JOIN areas a ON c.area_id = a.id
      JOIN monthly_investment_plans mip ON mis.plan_id = mip.id
      JOIN monthly_investment_plan_amounts mipa ON mis.plan_amount_id = mipa.id
      WHERE miis.id = ?`,
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
    console.error("Get monthly investment schedule by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching interest schedule",
    });
  }
};

/**
 * DAILY SCHEDULE MAINTENANCE (Rule 15)
 * Cron/Manual Maintenance endpoint:
 * 1. Finds PENDING schedules where interest_due_date <= today and updates to DUE.
 * 2. Updates next_interest_due_date on subscriptions.
 * 3. Detects active subscriptions reaching maturity date and marks MATURED.
 */
export const runDailyMonthlyInvestmentMaintenance = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const todayStr = formatDateOnly(new Date());

    // 1. Mark PENDING schedules where due date <= today as DUE
    const [updateResult] = await connection.query(
      `UPDATE monthly_investment_interest_schedules 
       SET status = 'DUE' 
       WHERE status = 'PENDING' AND interest_due_date <= ?`,
      [todayStr]
    );

    const dueUpdatedCount = updateResult.affectedRows || 0;

    // 2. Update next_interest_due_date on active subscriptions to next pending/due date
    await connection.query(
      `UPDATE monthly_investment_subscriptions mis
       SET next_interest_due_date = (
         SELECT MIN(miis.interest_due_date)
         FROM monthly_investment_interest_schedules miis
         WHERE miis.subscription_id = mis.id 
           AND miis.status IN ('PENDING', 'DUE', 'PARTIAL')
       )
       WHERE mis.status = 'ACTIVE'`
    );

    // 3. Mark subscriptions as MATURED if plan end date has arrived and all schedules completed
    const [maturedResult] = await connection.query(
      `UPDATE monthly_investment_subscriptions 
       SET status = 'MATURED' 
       WHERE status = 'ACTIVE' 
         AND subscription_end_date <= ? 
         AND pending_interest_months = 0`,
      [todayStr]
    );

    const maturedCount = maturedResult.affectedRows || 0;

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Monthly investment daily maintenance completed successfully",
      data: {
        date: todayStr,
        schedules_marked_due: dueUpdatedCount,
        subscriptions_matured: maturedCount,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Daily monthly investment maintenance error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while running daily maintenance",
    });
  } finally {
    connection.release();
  }
};
