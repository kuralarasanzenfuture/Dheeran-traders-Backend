import db from "../config/db.js";

/**
 * CREATE CATEGORY
 */
export const createCategory = async (req, res, next) => {
  try {
    const { brand_id, name } = req.body;

    if (!brand_id || !name) {
      return res.status(400).json({
        message: "Brand and category name are required",
      });
    }

    // ✅ Check brand exists
    const [[brand]] = await db.query(
      "SELECT id FROM brands WHERE id = ?",
      [brand_id]
    );

    if (!brand) {
      return res.status(400).json({ message: "Invalid brand" });
    }

    // ✅ Prevent duplicate category under same brand
    const [exists] = await db.query(
      "SELECT id FROM categories WHERE brand_id = ? AND name = ?",
      [brand_id, name]
    );

    if (exists.length) {
      return res.status(400).json({
        message: "Category already exists for this brand",
      });
    }

    // ✅ Insert category
    const [result] = await db.query(
      "INSERT INTO categories (brand_id, name) VALUES (?, ?)",
      [brand_id, name]
    );

    // ✅ Fetch created category
    const [[category]] = await db.query(
      `
      SELECT c.id, c.name, c.brand_id, b.name AS brand_name
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
    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.name,
        c.brand_id,
        b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY c.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET CATEGORIES BY BRAND
 */
export const getCategoriesByBrand = async (req, res, next) => {
  try {
    const { brand_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, name
      FROM categories
      WHERE brand_id = ?
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
        c.id,
        c.name,
        c.brand_id,
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
    const { brand_id, name } = req.body;

    // ✅ Validate brand if provided
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
      SET 
        brand_id = COALESCE(?, brand_id),
        name = COALESCE(?, name)
      WHERE id = ?
      `,
      [brand_id, name, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Category not found" });
    }

    const [[category]] = await db.query(
      `
      SELECT 
        c.id,
        c.name,
        c.brand_id,
        b.name AS brand_name
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


/**
 * GET BRAND + CATEGORY DROPDOWN DATA
 */
export const getBrandCategoryDropdown = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id AS category_id,
        b.id AS brand_id,
        b.name AS brand_name,
        c.name AS category_name,
        CONCAT(b.name, ' - ', c.name) AS label
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY b.name ASC, c.name ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Brand-category dropdown error:", error);
    res.status(500).json({ message: "Failed to load dropdown data" });
  }
};
