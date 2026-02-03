import db from "../config/db.js";

/**
 * CREATE VENDOR
 */
export const createVendor = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      address,
      bank_name,
      bank_account_number,
      bank_ifsc_code,
      bank_branch_name,
    } = req.body;

    /* ===========================
       REQUIRED VALIDATION
    ============================ */
    if (!first_name || !phone) {
      return res.status(400).json({
        message: "First name, last name and phone are required",
      });
    }

    // Phone validation
    if (!/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Email validation (optional)
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // IFSC validation (optional)
    if (bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) {
      return res.status(400).json({ message: "Invalid IFSC code" });
    }

    // Account number validation (optional)
    if (
      bank_account_number &&
      !/^[0-9]{6,30}$/.test(bank_account_number)
    ) {
      return res.status(400).json({
        message: "Invalid bank account number",
      });
    }

    /* ===========================
       DUPLICATE CHECK
    ============================ */
    const [exists] = await db.query(
      `
      SELECT id FROM vendors
      WHERE phone = ? OR email = ?
      `,
      [phone, email || null]
    );

    if (exists.length) {
      return res.status(409).json({
        message: "Vendor with same phone or email already exists",
      });
    }

    /* ===========================
       INSERT VENDOR
    ============================ */
    const [result] = await db.query(
      `
      INSERT INTO vendors
      (
        first_name,
        last_name,
        phone,
        email,
        address,
        bank_name,
        bank_account_number,
        bank_ifsc_code,
        bank_branch_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        first_name,
        last_name,
        phone,
        email || null,
        address || null,
        bank_name || null,
        bank_account_number || null,
        bank_ifsc_code || null,
        bank_branch_name || null,
      ]
    );

    const [[vendor]] = await db.query(
      "SELECT * FROM vendors WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error("Create vendor error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL VENDORS
 */
export const getVendors = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM vendors ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET VENDOR BY ID
 */
export const getVendorById = async (req, res) => {
  try {
    const [[vendor]] = await db.query(
      "SELECT * FROM vendors WHERE id = ?",
      [req.params.id]
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(vendor);
  } catch (error) {
    console.error("Get vendor error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPDATE VENDOR
 */
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      phone,
      email,
      bank_account_number,
      bank_ifsc_code,
    } = req.body;

    // Phone validation
    if (phone && !/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Email validation
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // IFSC validation
    if (bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) {
      return res.status(400).json({ message: "Invalid IFSC code" });
    }

    // Account validation
    if (
      bank_account_number &&
      !/^[0-9]{6,30}$/.test(bank_account_number)
    ) {
      return res.status(400).json({
        message: "Invalid bank account number",
      });
    }

    // Duplicate check
    if (phone || email) {
      const [exists] = await db.query(
        `
        SELECT id FROM vendors
        WHERE (phone = ? OR email = ?) AND id != ?
        `,
        [phone || null, email || null, id]
      );

      if (exists.length) {
        return res.status(409).json({
          message: "Phone or email already in use",
        });
      }
    }

    const [result] = await db.query(
      "UPDATE vendors SET ? WHERE id = ?",
      [req.body, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const [[vendor]] = await db.query(
      "SELECT * FROM vendors WHERE id = ?",
      [id]
    );

    res.json({
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    console.error("Update vendor error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE VENDOR
 */
export const deleteVendor = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM vendors WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
