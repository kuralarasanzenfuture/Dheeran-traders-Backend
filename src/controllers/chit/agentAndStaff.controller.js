import db from "../../config/db.js";

// CREATE
export const createAgentStaff = async (req, res) => {
  try {
    // const { name, phone, reference_mode, status } = req.body;
    let { name, phone, reference_mode, status } = req.body;

    if (!name || !phone || !reference_mode) {
      return res.status(400).json({
        message: "Name, Phone and Reference Mode are required",
      });
    }

    reference_mode = reference_mode.toUpperCase();

    const [existing] = await db.query(
      "SELECT id FROM chit_agent_and_staff WHERE phone = ?",
      [phone],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Phone number already exists",
      });
    }

    const [result] = await db.query(
      `INSERT INTO chit_agent_and_staff 
        (name, phone, reference_mode, status) 
       VALUES (?, ?, ? , ?)`,
      [name, phone, reference_mode, status || "active"],
    );

    // fetch created record
    const [newData] = await db.query(
      `SELECT 
        id,
        name,
        phone,
        reference_mode,
        status,
        created_at,
        updated_at
       FROM chit_agent_and_staff
       WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json({
      message: "Agent/Staff created successfully",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// GET ALL
export const getAgentStaff = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * 
      FROM chit_agent_and_staff
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET BY ID
export const getAgentStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * 
       FROM chit_agent_and_staff 
       WHERE id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Record not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE
export const updateAgentStaff = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, phone, reference_mode, status } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "ID is required",
      });
    }

    if (!name || !phone || !reference_mode) {
      return res.status(400).json({
        message: "Name, Phone and Reference Mode are required",
      });
    }

    // normalize
    reference_mode = reference_mode.toUpperCase();

    const allowedModes = ["AGENT", "STAFF"];
    if (!allowedModes.includes(reference_mode)) {
      return res.status(400).json({
        message: "Reference mode must be AGENT or STAFF",
      });
    }

    const allowedStatus = ["active", "inactive"];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Status must be active or inactive",
      });
    }

    // check if record exists
    const [existing] = await db.query(
      "SELECT id FROM chit_agent_and_staff WHERE id = ?",
      [id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Agent/Staff id not found",
      });
    }

    // check duplicate phone (except current record)
    const [phoneExists] = await db.query(
      "SELECT id FROM chit_agent_and_staff WHERE phone = ? AND id != ?",
      [phone, id],
    );

    if (phoneExists.length > 0) {
      return res.status(400).json({
        message: "Phone number already used by another record",
      });
    }

    const [result] = await db.query(
      `UPDATE chit_agent_and_staff
       SET name = ?, phone = ?, reference_mode = ?, status = ?
       WHERE id = ?`,
      [name, phone, reference_mode, status || "active", id],
    );

    const [updatedData] = await db.query(
      `SELECT 
        id,
        name,
        phone,
        reference_mode,
        status,
        created_at,
        updated_at
       FROM chit_agent_and_staff
       WHERE id = ?`,
      [id],
    );

    res.json({
      message: "Agent/Staff updated successfully",
      data: updatedData[0],
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// DELETE
export const deleteAgentStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // id validation
    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "Valid ID is required",
      });
    }

    // check record exists
    const [existing] = await db.query(
      `SELECT 
        id,
        name,
        phone,
        reference_mode,
        status,
        created_at,
        updated_at
       FROM chit_agent_and_staff
       WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Agent/Staff id not found",
      });
    }

    // store data before delete
    const deletedData = existing[0];

    // delete
    await db.query(
      `DELETE FROM chit_agent_and_staff 
       WHERE id = ?`,
      [id]
    );

    res.json({
      message: "Deleted successfully",
      data: deletedData,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};