import db from "../config/db.js";

/**
 * CREATE CATEGORY
 */
export const createCategory = async (req, res, next) => {
  try {
    const { brand_id, name, status } = req.body;

    if (!brand_id || !name) {
      return res.status(400).json({
        message: "Brand and category name are required",
      });
    }

    // 🔍 Validate brand exists
    const [[brand]] = await db.query(
      "SELECT id FROM brands WHERE id = ?",
      [brand_id]
    );

    if (!brand) {
      return res.status(400).json({ message: "Invalid brand" });
    }

    // 🔍 Prevent duplicate category under same brand
    const [exists] = await db.query(
      "SELECT id FROM categories WHERE brand_id = ? AND name = ?",
      [brand_id, name]
    );

    if (exists.length) {
      return res.status(400).json({
        message: "Category already exists for this brand",
      });
    }

    const [result] = await db.query(
      `INSERT INTO categories (brand_id, name, status)
       VALUES (?, ?, ?)`,
      [brand_id, name, status || "active"]
    );

    const [[category]] = await db.query(
      `
      SELECT c.*, b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.id = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      message: "Category created successfully",
      category,
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
    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.status,
        c.created_at,
        b.id AS brand_id,
        b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY c.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET CATEGORIES BY BRAND (VERY IMPORTANT)
 */
export const getCategoriesByBrand = async (req, res, next) => {
  try {
    const { brand_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, name, status
      FROM categories
      WHERE brand_id = ? AND status = 'active'
      ORDER BY name ASC
      `,
      [brand_id]
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
    const [[category]] = await db.query(
      `
      SELECT 
        c.*,
        b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.id = ?
      `,
      [req.params.id]
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
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
    const { brand_id, name, status } = req.body;

    // Validate brand if provided
    if (brand_id) {
      const [[brand]] = await db.query(
        "SELECT id FROM brands WHERE id = ?",
        [brand_id]
      );
      if (!brand) {
        return res.status(400).json({ message: "Invalid brand" });
      }
    }

    const [result] = await db.query(
      `
      UPDATE categories
      SET brand_id = COALESCE(?, brand_id),
          name = COALESCE(?, name),
          status = COALESCE(?, status)
      WHERE id = ?
      `,
      [brand_id, name, status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Category not found" });
    }

    const [[category]] = await db.query(
      `
      SELECT c.*, b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.id = ?
      `,
      [id]
    );

    res.json({
      message: "Category updated successfully",
      category,
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
