import db from "../config/db.js";
import fs from "fs";
import path from "path";

/**
 * 🟢 CREATE COMPANY BANK
 */
export const createCompanyBank = async (req, res) => {
  try {
    const {
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      branch,
      status,
    } = req.body;

    if (!bank_name || !account_name || !account_number || !ifsc_code ) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    // QR image path
    const qr_code_image = req.file
      ? `/uploads/bank-qr/${req.file.filename}`
      : null;

    const [result] = await db.query(
      `
      INSERT INTO company_bank_details (
        bank_name,
        account_name,
        account_number,
        ifsc_code,
        branch,
        qr_code_image,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        bank_name,
        account_name,
        account_number,
        ifsc_code,
        branch || null,
        qr_code_image,
        status || "active",
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM company_bank_details WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Company bank created successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Create company bank error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 📄 GET ALL COMPANY BANKS
 */
export const getCompanyBanks = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Get company banks error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 🔍 GET COMPANY BANK BY ID
 */
export const getCompanyBankById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Company bank not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get company bank error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✏️ UPDATE COMPANY BANK (OPTIONAL QR)
 */
export const updateCompanyBank = async (req, res) => {
  try {
    // If new QR uploaded → update path
    if (req.file) {
      req.body.qr_code_image = `/uploads/bank-qr/${req.file.filename}`;
    }

    const [existing] = await db.query(
      "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Bank details not found",
      });
    }

    // Delete old QR if replaced
    if (req.file && existing[0].qr_code_image) {
      const oldPath = path.join(
        process.cwd(),
        existing[0].qr_code_image
      );
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const [result] = await db.query(
      "UPDATE company_bank_details SET ? WHERE id = ?",
      [req.body, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Bank details not found",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    res.json({
      message: "Company bank updated successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Update company bank error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ❌ DELETE COMPANY BANK
 */
export const deleteCompanyBank = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Company bank not found",
      });
    }

    // Delete QR image from disk
    if (rows[0].qr_code_image) {
      const imgPath = path.join(process.cwd(), rows[0].qr_code_image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await db.query(
      "DELETE FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    res.json({
      message: "Company bank deleted successfully",
    });
  } catch (error) {
    console.error("Delete company bank error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
