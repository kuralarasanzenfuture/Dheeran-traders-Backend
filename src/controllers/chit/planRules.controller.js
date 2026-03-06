import db from "../../config/db.js";

// CREATE PLAN RULE
export const createPlanRule = async (req, res) => {
  try {
    const { plan_id, collection_type, installment_amount, total_installments } = req.body;

    // VALIDATION
    if (!plan_id || !collection_type || !installment_amount || !total_installments) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const validTypes = ["DAILY", "WEEKLY", "MONTHLY"];

    if (!validTypes.includes(collection_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection type"
      });
    }

    if (installment_amount <= 0 || total_installments <= 0) {
      return res.status(400).json({
        success: false,
        message: "Installment amount and total installments must be greater than 0"
      });
    }

    // CHECK PLAN EXISTS
    const [plan] = await db.query("SELECT id FROM plans WHERE id = ?", [plan_id]);

    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    const [result] = await db.query(
      `INSERT INTO plan_rules 
       (plan_id, collection_type, installment_amount, total_installments)
       VALUES (?, ?, ?, ?)`,
      [plan_id, collection_type, installment_amount, total_installments]
    );

    const [created] = await db.query(
      "SELECT * FROM plan_rules WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Plan rule created successfully",
      data: created[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// UPDATE PLAN RULE
export const updatePlanRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { collection_type, installment_amount, total_installments } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM plan_rules WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan rule not found"
      });
    }

    await db.query(
      `UPDATE plan_rules 
       SET collection_type = ?, installment_amount = ?, total_installments = ?
       WHERE id = ?`,
      [collection_type, installment_amount, total_installments, id]
    );

    const [updated] = await db.query(
      "SELECT * FROM plan_rules WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Plan rule updated successfully",
      data: updated[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// DELETE PLAN RULE
export const deletePlanRule = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT * FROM plan_rules WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan rule not found"
      });
    }

    await db.query(
      "DELETE FROM plan_rules WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Plan rule deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// GET ALL RULES
export const getPlanRules = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT pr.*, p.plan_name
      FROM plan_rules pr
      LEFT JOIN plans p ON pr.plan_id = p.id
      ORDER BY pr.id DESC
    `);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// GET SINGLE RULE
export const getPlanRuleById = async (req, res) => {
  try {

    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT pr.*, p.plan_name
       FROM plan_rules pr
       LEFT JOIN plans p ON pr.plan_id = p.id
       WHERE pr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan rule not found"
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};