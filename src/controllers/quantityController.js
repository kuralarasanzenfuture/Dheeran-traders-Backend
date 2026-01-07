import db from "../config/db.js";

/**
 * CREATE QUANTITY
 */
export const createQuantity = async (req, res) => {
  try {
    const { name, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Quantity name is required" });
    }

    const [exists] = await db.query(
      "SELECT id FROM quantities WHERE name = ?",
      [name]
    );

    if (exists.length) {
      return res.status(409).json({ message: "Quantity already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO quantities (name, status) VALUES (?, ?)",
      [name, status || "active"]
    );

    const [rows] = await db.query(
      "SELECT * FROM quantities WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Quantity created successfully",
      quantity: rows[0],
    });
  } catch (error) {
    console.error("Create quantity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL QUANTITIES
 */
export const getAllQuantities = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM quantities ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Get quantities error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET SINGLE QUANTITY
 */
export const getQuantityById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM quantities WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Quantity not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get quantity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPDATE QUANTITY
 */
export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const [result] = await db.query(
      "UPDATE quantities SET name = ?, status = ? WHERE id = ?",
      [name, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Quantity not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM quantities WHERE id = ?",
      [id]
    );

    res.json({
      message: "Quantity updated successfully",
      quantity: rows[0],
    });
  } catch (error) {
    console.error("Update quantity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE QUANTITY
 */
export const deleteQuantity = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM quantities WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Quantity not found" });
    }

    res.json({ message: "Quantity deleted successfully" });
  } catch (error) {
    console.error("Delete quantity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
