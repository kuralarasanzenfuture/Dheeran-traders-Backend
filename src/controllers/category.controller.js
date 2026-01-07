import db from "../config/db.js";

/**
 * CREATE CATEGORY
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE name = ?",
      [name]
    );

    if (exists.length) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO categories (name, status) VALUES (?, ?)",
      [name, status || "active"]
    );

    const [rows] = await db.query(
      "SELECT * FROM categories WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Category created successfully",
      category: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET ALL CATEGORIES
 */
export const getCategories = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM categories ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET CATEGORY BY ID
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM categories WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE CATEGORY
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE categories SET ? WHERE id = ?",
      [req.body, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Category not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );

    res.json({
      message: "Category updated successfully",
      category: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE CATEGORY
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "DELETE FROM categories WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
};
