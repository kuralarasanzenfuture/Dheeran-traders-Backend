import db from "../../config/db.js";


// CREATE SUBSCRIPTION
export const createCustomerSubscription = async (req, res) => {
  try {

    const {
      customer_id,
      batch_id,
      plan_id,
      collection_type,
      no_of_slots,
      investment_amount,
      start_date,
      end_date,
      maturity_date,
      reference_mode,
      agent_staff_id,
      reference_name,
      reference_phone
    } = req.body;

    // REQUIRED FIELD VALIDATION
    if (
      !customer_id ||
      !batch_id ||
      !plan_id ||
      !collection_type ||
      !no_of_slots ||
      !investment_amount ||
      !start_date ||
      !end_date ||
      !maturity_date ||
      !reference_mode
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // COLLECTION TYPE VALIDATION
    const upperCollection = collection_type.toUpperCase();

    const validTypes = ["DAILY", "WEEKLY", "MONTHLY"];

    if (!validTypes.includes(upperCollection)) {
      return res.status(400).json({
        success: false,
        message: "Collection type must be DAILY, WEEKLY or MONTHLY"
      });
    }

    // DATE VALIDATION
    const start = new Date(start_date);
    const end = new Date(end_date);
    const maturity = new Date(maturity_date);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date"
      });
    }

    if (maturity < end) {
      return res.status(400).json({
        success: false,
        message: "Maturity date must be greater than or equal to end date"
      });
    }

    // REFERENCE MODE VALIDATION
    const validRefModes = ["AGENT", "STAFF", "OFFICE"];

    if (!validRefModes.includes(reference_mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reference mode"
      });
    }

    // AGENT / STAFF VALIDATION
    if (reference_mode === "AGENT" || reference_mode === "STAFF") {

      if (!reference_name || !reference_phone) {
        return res.status(400).json({
          success: false,
          message: "Agent/Staff name and phone are required"
        });
      }

      if (!/^[0-9]{10}$/.test(reference_phone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be 10 digits"
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO chit_customer_subscriptions
      (customer_id,batch_id,plan_id,collection_type,no_of_slots,
       investment_amount,start_date,end_date,maturity_date,
       reference_mode,agent_staff_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        batch_id,
        plan_id,
        upperCollection,
        no_of_slots,
        investment_amount,
        start_date,
        end_date,
        maturity_date,
        reference_mode,
        agent_staff_id || null
      ]
    );

    const [created] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Customer subscription created successfully",
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



// UPDATE
export const updateCustomerSubscription = async (req, res) => {
  try {

    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    const {
      collection_type,
      no_of_slots,
      investment_amount,
      start_date,
      end_date,
      maturity_date
    } = req.body;

    const upperCollection = collection_type.toUpperCase();

    await db.query(
      `UPDATE chit_customer_subscriptions
       SET collection_type=?,
       no_of_slots=?,
       investment_amount=?,
       start_date=?,
       end_date=?,
       maturity_date=?
       WHERE id=?`,
      [
        upperCollection,
        no_of_slots,
        investment_amount,
        start_date,
        end_date,
        maturity_date,
        id
      ]
    );

    const [updated] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: updated[0]
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};



// DELETE
export const deleteCustomerSubscription = async (req, res) => {
  try {

    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    await db.query(
      "DELETE FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};



// GET ALL
export const getCustomerSubscriptions = async (req, res) => {
  try {

    const [rows] = await db.query(
      "SELECT * FROM chit_customer_subscriptions ORDER BY id DESC"
    );

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



// GET BY ID
export const getCustomerSubscriptionById = async (req, res) => {
  try {

    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
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