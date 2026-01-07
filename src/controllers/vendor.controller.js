import db from "../config/db.js";

/**
 * CREATE VENDOR
 */
export const createVendor = async (req, res, next) => {
  try {
    const {
      vendor_name,
      brand_id,
      brand_name,
      brand_category,
      brand_quantity,
      phone,
      email,
      address,
      payment_mode,
      advance_pay,
      pending_pay,
      stock,
    } = req.body;

    if (
      !vendor_name ||
      !brand_id ||
      !brand_name ||
      !phone ||
      !payment_mode ||
      stock == null
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [result] = await db.query(
      `INSERT INTO vendors (
        vendor_name,
        brand_id,
        brand_name,
        brand_category,
        brand_quantity,
        phone,
        email,
        address,
        payment_mode,
        advance_pay,
        pending_pay,
        stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vendor_name,
        brand_id,
        brand_name,
        brand_category,
        brand_quantity,
        phone,
        email,
        address,
        payment_mode,
        advance_pay || 0,
        pending_pay || 0,
        stock,
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM vendors WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Vendor created successfully",
      vendor: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET ALL VENDORS
 */
export const getVendors = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM vendors ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET SINGLE VENDOR
 */
export const getVendorById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM vendors WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE VENDOR
 */
export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE vendors SET ? WHERE id = ?",
      [req.body, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM vendors WHERE id = ?",
      [id]
    );

    res.json({
      message: "Vendor updated successfully",
      vendor: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE VENDOR
 */
export const deleteVendor = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "DELETE FROM vendors WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json({ message: "Vendor deleted successfully" });
  } catch (err) {
    next(err);
  }
};
