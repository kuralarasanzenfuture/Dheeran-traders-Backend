import db from "../../config/db.js";

/**
 * CREATE BRAND
 */
export const createBrand = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    const [exists] = await db.query(
      "SELECT id FROM brands WHERE name = ?",
      [name]
    );

    if (exists.length) {
      return res.status(400).json({ message: "Brand already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO brands (name) VALUES (?)",
      [name]
    );

    const [rows] = await db.query(
      "SELECT * FROM brands WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Brand created successfully",
      brand: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET ALL BRANDS
 */
export const getBrands = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM brands ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET BRAND BY ID
 */
export const getBrandById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM brands WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE BRAND
 */
export const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    const [result] = await db.query(
      "UPDATE brands SET name = ? WHERE id = ?",
      [name, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM brands WHERE id = ?",
      [id]
    );

    res.json({
      message: "Brand updated successfully",
      brand: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE BRAND
 */
export const deleteBrand = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "DELETE FROM brands WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json({ message: "Brand deleted successfully" });
  } catch (err) {
    next(err);
  }
};
