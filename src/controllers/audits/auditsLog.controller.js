import db from "../../config/db.js";

export const getAuditByRecord = async (req, res) => {
  try {
    const { table, id } = req.params;

    const [rows] = await db.query(
      `SELECT *
       FROM audit_logs
       WHERE table_name=? AND record_id=?
       ORDER BY changed_at DESC`,
      [table, id]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAuditByTable = async (req, res) => {
  try {
    const { table } = req.params;

    const [rows] = await db.query(
      `SELECT *
       FROM audit_logs
       WHERE table_name=?
       ORDER BY changed_at DESC
       LIMIT 100`,
      [table]
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAuditByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT *
       FROM audit_logs
       WHERE changed_by=?
       ORDER BY changed_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const replayAudit = async (req, res) => {
  try {
    const { table, id } = req.params;

    const {
      datetime,
      mode = "current", // current | before_delete | snapshot
    } = req.query;

    let params = [table, id];
    let condition = "";

    if (datetime) {
      condition = "AND changed_at <= ?";
      params.push(datetime);
    }

    const [logs] = await db.query(
      `SELECT *
       FROM audit_logs
       WHERE table_name = ?
       AND record_id = ?
       ${condition}
       ORDER BY changed_at ASC`,
      params
    );

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No audit logs found",
      });
    }

    let state = null;
    let lastActiveState = null;
    let deleted = false;

    for (const log of logs) {
      const newData = log.new_data || null;

      /* =========================
         INSERT
      ========================= */
      if (log.action === "INSERT") {
        state = { ...newData };
        lastActiveState = { ...state };
      }

      /* =========================
         UPDATE
      ========================= */
      else if (log.action === "UPDATE") {
        state = {
          ...(state || {}),
          ...(newData || {}),
        };
        lastActiveState = { ...state };
      }

      /* =========================
         DELETE
      ========================= */
      else if (log.action === "DELETE") {
        deleted = true;

        if (mode === "before_delete") {
          break; // stop before delete
        }

        state = null;
      }
    }

    /* =========================
       RESPONSE MODE
    ========================= */

    let responseData = null;

    if (mode === "current") {
      responseData = state;
    }

    else if (mode === "before_delete") {
      responseData = lastActiveState;
    }

    else if (mode === "snapshot") {
      responseData = {
        current_state: state,
        last_active_state: lastActiveState,
        deleted,
      };
    }

    res.json({
      success: true,
      mode,
      replayed_at: datetime || "latest",
      total_events: logs.length,
      data: responseData,
    });

  } catch (err) {
    console.error("Replay Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAllAudits = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 50,
      table,
      action,
      user,
      from_date,
      to_date,
      search
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const offset = (page - 1) * limit;

    let where = [];
    let params = [];

    /* ================= FILTERS ================= */

    if (table) {
      where.push("table_name = ?");
      params.push(table);
    }

    if (action) {
      where.push("action = ?");
      params.push(action);
    }

    if (user) {
      where.push("changed_by = ?");
      params.push(user);
    }

    if (from_date) {
      where.push("changed_at >= ?");
      params.push(from_date);
    }

    if (to_date) {
      where.push("changed_at <= ?");
      params.push(to_date);
    }

    /* 🔍 search inside JSON (basic) */
    if (search) {
      where.push(
        `(JSON_EXTRACT(old_data, '$') LIKE ? OR JSON_EXTRACT(new_data, '$') LIKE ?)`
      );
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    /* ================= DATA QUERY ================= */

    const [rows] = await db.query(
      `
      SELECT *
      FROM audit_logs
      ${whereClause}
      ORDER BY changed_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    /* ================= COUNT ================= */

    const [[count]] = await db.query(
      `
      SELECT COUNT(*) as total
      FROM audit_logs
      ${whereClause}
      `,
      params
    );

    res.json({
      success: true,
      page,
      limit,
      total: count.total,
      total_pages: Math.ceil(count.total / limit),
      data: rows
    });

  } catch (err) {
    console.error("Get audits error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};