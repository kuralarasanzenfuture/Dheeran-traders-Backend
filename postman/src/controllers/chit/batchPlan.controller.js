import db from "../../config/db.js";

// ADD PLAN TO BATCH
export const addPlanToBatch = async (req, res) => {
  try {
    const { batch_id, plan_id } = req.body;

    if (!batch_id || !plan_id) {
      return res.status(400).json({ message: "batch_id and plan_id required" });
    }

    const [result] = await db.query(
      `INSERT INTO batch_plans (batch_id, plan_id) VALUES (?, ?)`,
      [batch_id, plan_id]
    );

    res.status(201).json({
      message: "Plan assigned to batch successfully",
      id: result.insertId
    });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid batch_id or plan_id" });
    }
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Plan already assigned to this batch" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL PLANS OF A BATCH
export const getPlansByBatch = async (req, res) => {
  try {
    const { batch_id } = req.params;

    const [rows] = await db.query(
      `SELECT bp.id, bp.batch_id, p.*
       FROM batch_plans bp
       JOIN plans p ON bp.plan_id = p.id
       WHERE bp.batch_id = ?`,
      [batch_id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE PLAN FROM BATCH
export const removePlanFromBatch = async (req, res) => {
  try {
    const { id } = req.params; // batch_plans id

    const [result] = await db.query(
      `DELETE FROM batch_plans WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    res.json({ message: "Plan removed from batch" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};