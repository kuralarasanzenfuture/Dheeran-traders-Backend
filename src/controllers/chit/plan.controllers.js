import db from "../../config/db.js";

/* CREATE PLAN */
export const createPlan = async (req, res) => {
  try {
    const { plan_name, plan_duration } = req.body;

    if (!plan_name || !plan_duration) {
      return res.status(400).json({ message: "All fields required" });
    }

    const [result] = await db.query(
      "INSERT INTO plans (plan_name, plan_duration) VALUES (?, ?)",
      [plan_name, plan_duration]
    );

    res.status(201).json({
      message: "Plan created successfully",
      id: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/* GET ALL PLANS */
export const getAllPlans = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM plans ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* GET PLAN BY ID */
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query("SELECT * FROM plans WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* UPDATE PLAN */
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, plan_duration } = req.body;

    const [result] = await db.query(
      "UPDATE plans SET plan_name=?, plan_duration=? WHERE id=?",
      [plan_name, plan_duration, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({ message: "Plan updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* DELETE PLAN */
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM plans WHERE id=?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};