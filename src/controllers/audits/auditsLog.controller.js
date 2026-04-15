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