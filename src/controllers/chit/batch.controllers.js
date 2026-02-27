import db from "../../config/db.js";

// CREATE BATCH
export const createBatch = async (req, res) => {
  try {
    const { batch_name, batch_duration, start_date, end_date, status } = req.body;

    if (!batch_name || !start_date || !end_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [result] = await db.query(
      `INSERT INTO batches 
       (batch_name, batch_duration, start_date, end_date, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [batch_name, batch_duration, start_date, end_date, status || "WAITING"]
    );

    res.status(201).json({
      message: "Batch created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL BATCHES
export const getBatches = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM batches ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE BATCH
export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query("SELECT * FROM batches WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE BATCH
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_name, batch_duration, start_date, end_date, status } = req.body;

    const [result] = await db.query(
      `UPDATE batches 
       SET batch_name=?, batch_duration=?, start_date=?, end_date=?, status=? 
       WHERE id=?`,
      [batch_name, batch_duration, start_date, end_date, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json({ message: "Batch updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE BATCH
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM batches WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json({ message: "Batch deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};