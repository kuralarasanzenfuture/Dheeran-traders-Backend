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

// export const getAllAudits = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 50,
//       table,
//       action,
//       user,
//       from_date,
//       to_date,
//       search
//     } = req.query;

//     page = Number(page);
//     limit = Number(limit);

//     const offset = (page - 1) * limit;

//     let where = [];
//     let params = [];

//     /* ================= FILTERS ================= */

//     if (table) {
//       where.push("table_name = ?");
//       params.push(table);
//     }

//     if (action) {
//       where.push("action = ?");
//       params.push(action);
//     }

//     if (user) {
//       where.push("changed_by = ?");
//       params.push(user);
//     }

//     if (from_date) {
//       where.push("changed_at >= ?");
//       params.push(from_date);
//     }

//     if (to_date) {
//       where.push("changed_at <= ?");
//       params.push(to_date);
//     }

//     /* 🔍 search inside JSON (basic) */
//     if (search) {
//       where.push(
//         `(JSON_EXTRACT(old_data, '$') LIKE ? OR JSON_EXTRACT(new_data, '$') LIKE ?)`
//       );
//       params.push(`%${search}%`, `%${search}%`);
//     }

//     const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

//     /* ================= DATA QUERY ================= */

//     const [rows] = await db.query(
//       `
//       SELECT *
//       FROM audit_logs
//       ${whereClause}
//       ORDER BY changed_at DESC
//       LIMIT ? OFFSET ?
//       `,
//       [...params, limit, offset]
//     );

//     /* ================= COUNT ================= */

//     const [[count]] = await db.query(
//       `
//       SELECT COUNT(*) as total
//       FROM audit_logs
//       ${whereClause}
//       `,
//       params
//     );

//     res.json({
//       success: true,
//       page,
//       limit,
//       total: count.total,
//       total_pages: Math.ceil(count.total / limit),
//       data: rows
//     });

//   } catch (err) {
//     console.error("Get audits error:", err);
//     res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

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

    /* =========================
       1️⃣ NORMALIZE PAGINATION
    ========================= */
    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page <= 0) page = 1;
    if (isNaN(limit) || limit <= 0 || limit > 200) limit = 50;

    const offset = (page - 1) * limit;

    /* =========================
       2️⃣ BUILD FILTERS
    ========================= */
    let where = [];
    let params = [];

    if (table) {
      where.push("a.table_name = ?");
      params.push(table.trim());
    }

    if (action) {
      where.push("a.action = ?");
      params.push(action.trim().toUpperCase());
    }

    if (user) {
      where.push("a.changed_by = ?");
      params.push(Number(user));
    }

    if (from_date) {
      where.push("DATE(a.changed_at) >= ?");
      params.push(from_date);
    }

    if (to_date) {
      where.push("DATE(a.changed_at) <= ?");
      params.push(to_date);
    }

    /* 🔍 SEARCH inside remarks + json */
    if (search) {
      where.push(`
        (
          a.remarks LIKE ?
          OR CAST(a.old_data AS CHAR) LIKE ?
          OR CAST(a.new_data AS CHAR) LIKE ?
          OR u.name LIKE ?
        )
      `);

      const like = `%${search}%`;

      params.push(like, like, like, like);
    }

    const whereClause =
      where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    /* =========================
       3️⃣ MAIN QUERY
    ========================= */
    const [rows] = await db.query(
      `
      SELECT
        a.id,
        a.table_name,
        a.record_id,
        a.action,
        a.old_data,
        a.new_data,
        a.remarks,
        a.changed_at,
        a.changed_by,

        u.id AS user_id,
        u.username AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.role_id,
        r.role_name

      FROM audit_logs a
      LEFT JOIN users_roles u ON u.id = a.changed_by
      LEFT JOIN role_based r ON r.id = u.role_id

      ${whereClause}

      ORDER BY a.changed_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    /* =========================
       4️⃣ TOTAL COUNT
    ========================= */
    const [[countResult]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM audit_logs a
      LEFT JOIN users_roles u
        ON u.id = a.changed_by
      ${whereClause}
      `,
      params
    );

    /* =========================
       5️⃣ SAFE JSON PARSE
    ========================= */
    const parsedRows = rows.map((row) => ({
      ...row,
      old_data:
        typeof row.old_data === "string"
          ? JSON.parse(row.old_data)
          : row.old_data,
      new_data:
        typeof row.new_data === "string"
          ? JSON.parse(row.new_data)
          : row.new_data
    }));

    /* =========================
       6️⃣ RESPONSE
    ========================= */
    res.json({
      success: true,
      filters: {
        page,
        limit,
        table: table || null,
        action: action || null,
        user: user || null,
        from_date: from_date || null,
        to_date: to_date || null,
        search: search || null
      },
      pagination: {
        page,
        limit,
        total: countResult.total,
        total_pages: Math.ceil(countResult.total / limit),
        has_next: page * limit < countResult.total,
        has_prev: page > 1
      },
      data: parsedRows
    });
  } catch (err) {
    console.error("getAllAudits error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
