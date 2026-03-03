import db from "../../config/db.js";

/* CREATE PLAN */
// export const createPlan = async (req, res) => {
//   try {
//     const { plan_name, plan_duration } = req.body;

//     if (!plan_name || !plan_duration) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     const [result] = await db.query(
//       "INSERT INTO plans (plan_name, plan_duration) VALUES (?, ?)",
//       [plan_name, plan_duration]
//     );

//     res.status(201).json({
//       message: "Plan created successfully",
//       id: result.insertId
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const createPlan = async (req, res) => {
  try {
    let { plan_name, plan_duration } = req.body;

    if (!plan_name || !plan_duration) {
      return res.status(400).json({ message: "All fields required" });
    }

    // convert to uppercase
    plan_name = plan_name.trim().toUpperCase();

    // check duplicate
    const [exists] = await db.query(
      "SELECT id FROM plans WHERE plan_name = ? AND plan_duration = ?",
      [plan_name , plan_duration]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "Plan already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO plans (plan_name, plan_duration) VALUES (?, ?)",
      [plan_name, plan_duration]
    );

    res.status(201).json({
      message: "Plan created successfully",
      id: result.insertId,
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
// export const updatePlan = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { plan_name, plan_duration } = req.body;

//     const [result] = await db.query(
//       "UPDATE plans SET plan_name=?, plan_duration=? WHERE id=?",
//       [plan_name, plan_duration, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Plan not found" });
//     }

//     res.json({ message: "Plan updated successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    let { plan_name, plan_duration } = req.body;

    if (!plan_name || !plan_duration) {
      return res.status(400).json({ message: "All fields required" });
    }

    // convert to uppercase
    plan_name = plan_name.trim().toUpperCase();

    // check duplicate except current record
    const [exists] = await db.query(
      "SELECT id FROM plans WHERE plan_name = ? AND plan_duration = ? AND id != ?",
      [plan_name, plan_duration, id]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "Plan already exists" });
    }

    const [result] = await db.query(
      "UPDATE plans SET plan_name = ?, plan_duration = ? WHERE id = ?",
      [plan_name, plan_duration, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({ message: "Plan updated successfully" });
  } catch (err) {
    console.error(err);
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