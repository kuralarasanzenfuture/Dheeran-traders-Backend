import db from "../../config/db.js";
import fs from "fs";
import path from "path";
import { AuditLog } from "../../services/audit.service.js";

/* 🟢 CREATE COMPANY BANK */
// export const createCompanyBank = async (req, res) => {
//   try {
//     /* 1️⃣ Extract fields from request body */
//     const {
//       bank_name,
//       account_name,
//       account_number,
//       ifsc_code,
//       branch,
//       status,
//     } = req.body;

//     /* 2️⃣ Required field validation */
//     if (!bank_name || !account_name || !account_number || !ifsc_code) {
//       return res.status(400).json({
//         message: "Required fields missing",
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({
//         message: "QR code image is required",
//       });
//     }

//     /* 3️⃣ CHECK: Account already exists or not */
//     const [existingAccount] = await db.query(
//       `SELECT id FROM company_bank_details
//        WHERE bank_name = ? AND account_number = ?`,
//       [bank_name, account_number]
//     );

//     /* 4️⃣ If account exists → stop */
//     if (existingAccount.length > 0) {
//       return res.status(409).json({
//         message: "This bank account already exists",
//       });
//     }

//     /* 5️⃣ Handle QR image upload */
//     const qr_code_image = req.file
//       ? `/uploads/bank-qr/${req.file.filename}`
//       : null;

//     /* 6️⃣ Insert new bank record */
//     const [result] = await db.query(
//       `INSERT INTO company_bank_details
//        (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [
//         bank_name,
//         account_name,
//         account_number,
//         ifsc_code,
//         branch || null,
//         qr_code_image,
//         status || "active",
//       ]
//     );

//     /* 7️⃣ Fetch newly inserted record */
//     const [rows] = await db.query(
//       "SELECT * FROM company_bank_details WHERE id = ?",
//       [result.insertId]
//     );

//     /* 8️⃣ Success response */
//     res.status(201).json({
//       message: "Company bank created successfully",
//       data: rows[0],
//     });
//   } catch (err) {
//     console.error("Create bank error:", err);
//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// };

/* 📄 GET ALL */
export const getCompanyBanks = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 🔍 GET BY ID */
export const getCompanyBankById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details WHERE id = ?",
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ✏️ UPDATE COMPANY BANK */
// export const updateCompanyBank = async (req, res) => {
//   try {
//     const [existing] = await db.query(
//       "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
//       [req.params.id]
//     );

//     if (!existing.length) {
//       return res.status(404).json({ message: "Bank not found" });
//     }

//     const fields = {
//       bank_name: req.body.bank_name,
//       account_name: req.body.account_name,
//       account_number: req.body.account_number,
//       ifsc_code: req.body.ifsc_code,
//       branch: req.body.branch,
//       status: req.body.status,
//     };

//     /* If new QR uploaded */
//     if (req.file) {
//       fields.qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

//       // delete old image
//       if (existing[0].qr_code_image) {
//         const oldPath = path.join(process.cwd(), existing[0].qr_code_image);
//         if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//       }
//     }

//     await db.query("UPDATE company_bank_details SET ? WHERE id = ?", [
//       fields,
//       req.params.id,
//     ]);

//     res.json({ message: "Company bank updated successfully" });
//   } catch (err) {
//     console.error("Update bank error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const deleteCompanyBank = async (req, res) => {
// try {
// const [rows] = await db.query(
// "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
// [req.params.id]
// );

// if (!rows.length) {
// return res.status(404).json({ message: "Bank not found" });
// }

// if (rows[0].qr_code_image) {
// const imgPath = path.resolve(
// process.cwd(),
// rows[0].qr_code_image.replace(/^\/+/, "")
// );

// try {
// await fs.unlink(imgPath);
// } catch (err) {
// console.warn("Image not found or already deleted:", err.message);
// }
// }

// await db.query("DELETE FROM company_bank_details WHERE id = ?", [
// req.params.id,
// ]);

// res.json({ message: "Company bank deleted successfully" });
// } catch (err) {
// console.error("Delete bank error:", err);
// res.status(500).json({ message: "Server error" });
// }
// };

// ------------------------------------ hard delete ---------------------------------------------

export const createCompanyBank = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user?.id || null;

    let {
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      branch,
      status = "active",
      is_primary = false,
      remarks,
    } = req.body;

    /* ================= NORMALIZE ================= */

    is_primary = is_primary === true || is_primary === "true";

    /* ================= VALIDATION ================= */

    if (!bank_name || !account_name || !account_number || !ifsc_code) {
      throw new Error("All required fields must be provided");
    }

    if (!req.file) {
      throw new Error("QR code image required");
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      throw new Error("Invalid IFSC code");
    }

    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status");
    }

    /* ================= DUPLICATE CHECK ================= */

    const [exists] = await connection.query(
      `SELECT id FROM company_bank_details 
       WHERE account_number = ? AND ifsc_code = ?`,
      [account_number, ifsc_code],
    );

    if (exists.length > 0) {
      throw new Error("Bank account already exists");
    }

    const qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

    /* ================= PRIMARY LOGIC ================= */

    const [[primaryExists]] = await connection.query(
      `SELECT COUNT(*) AS count FROM company_bank_details WHERE is_primary = TRUE`,
    );

    // 👉 If no primary exists → force this as primary
    if (primaryExists.count === 0) {
      is_primary = true;
    }

    // 👉 If setting new primary → remove old one
    if (is_primary) {
      await connection.query(
        `UPDATE company_bank_details SET is_primary = FALSE`,
      );
    }

    /* ================= INSERT ================= */

    const [result] = await connection.query(
      `INSERT INTO company_bank_details
       (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status, is_primary, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bank_name,
        account_name,
        account_number,
        ifsc_code,
        branch || null,
        qr_code_image,
        status,
        is_primary ? 1 : 0,
        userId,
      ],
    );

    const recordId = result.insertId;

    /* ================= AUDIT ================= */

    await AuditLog({
      connection,
      table: "company_bank_details",
      recordId,
      action: "INSERT",
      newData: {
        bank_name,
        account_name,
        account_number,
        ifsc_code,
        branch,
        status,
        is_primary,
        qr_code_image,
      },
      userId,
      remarks: remarks || "Bank created",
    });

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Bank created successfully",
      id: recordId,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Create bank error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const updateCompanyBank = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id || null;

    /* ================= LOCK ================= */

    const [[oldData]] = await connection.query(
      `SELECT * FROM company_bank_details WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!oldData) throw new Error("Bank not found");

    /* ================= INPUT ================= */

    let {
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      branch,
      status,
      is_primary,
    } = req.body;

    // ✅ normalize boolean
    if (is_primary !== undefined) {
      is_primary = is_primary === true || is_primary === "true";
    }

    /* ================= DUPLICATE CHECK ================= */

    if (account_number || ifsc_code) {
      const [exists] = await connection.query(
        `SELECT id FROM company_bank_details 
         WHERE account_number=? AND ifsc_code=? AND id != ?`,
        [
          account_number || oldData.account_number,
          ifsc_code || oldData.ifsc_code,
          id,
        ],
      );

      if (exists.length > 0) {
        throw new Error("Duplicate bank account");
      }
    }

    /* ================= PRIMARY LOGIC ================= */

    if (is_primary === true) {
      await connection.query(
        `UPDATE company_bank_details SET is_primary = FALSE`,
      );
    }

    // ❗ Prevent removing last primary
    if (is_primary === false && oldData.is_primary) {
      const [[count]] = await connection.query(
        `SELECT COUNT(*) AS count FROM company_bank_details WHERE is_primary = TRUE`,
      );

      if (count.count === 1) {
        throw new Error("At least one primary account required");
      }
    }

    /* ================= IMAGE ================= */

    let qr_code_image = oldData.qr_code_image;

    if (req.file) {
      qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

      if (oldData.qr_code_image) {
        const oldPath = path.join(process.cwd(), oldData.qr_code_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    /* ================= MERGE DATA ================= */

    const updatedData = {
      bank_name: bank_name ?? oldData.bank_name,
      account_name: account_name ?? oldData.account_name,
      account_number: account_number ?? oldData.account_number,
      ifsc_code: ifsc_code ?? oldData.ifsc_code,
      branch: branch ?? oldData.branch,
      status: status ?? oldData.status,
      is_primary:
        is_primary !== undefined ? (is_primary ? 1 : 0) : oldData.is_primary,
      qr_code_image,
      updated_by: userId,
    };

    /* ================= UPDATE ================= */

    await connection.query(`UPDATE company_bank_details SET ? WHERE id=?`, [
      updatedData,
      id,
    ]);

    /* ================= AUDIT ================= */

    await AuditLog({
      connection,
      table: "company_bank_details",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || "Bank updated",
    });

    await connection.commit();

    res.json({
      success: true,
      message: "Bank updated successfully",
    });
  } catch (err) {
    await connection.rollback();
    console.error("updateCompanyBank ERROR:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const deleteCompanyBank = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    const [[oldData]] = await connection.query(
      `SELECT * FROM company_bank_details WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!oldData) throw new Error("Bank not found");

    /* ================= PRIMARY CHECK ================= */

    if (oldData.is_primary) {
      throw new Error("Cannot delete primary account");
    }

    /* ================= MINIMUM ACCOUNT CHECK ================= */

    const [[count]] = await connection.query(
      `SELECT COUNT(*) AS count FROM company_bank_details`,
    );

    if (count.count === 1) {
      throw new Error("Cannot delete last bank account");
    }

    /* ================= DELETE IMAGE ================= */

    if (oldData.qr_code_image) {
      const imgPath = path.resolve(
        process.cwd(),
        oldData.qr_code_image.replace(/^\/+/, ""),
      );

      if (fs.existsSync(imgPath)) {
        await fs.promises.unlink(imgPath);
      }
    }

    /* ================= DELETE ================= */

    await connection.query(`DELETE FROM company_bank_details WHERE id=?`, [id]);

    /* ================= AUDIT ================= */

    await AuditLog({
      connection,
      table: "company_bank_details",
      recordId: id,
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || "Bank deleted",
    });

    await connection.commit();

    res.json({
      success: true,
      message: "Bank deleted successfully",
    });
  } catch (err) {
    await connection.rollback();
    console.error("Delete bank error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const setPrimaryBank = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;
    const { remarks } = req.body || {};

    /* ================= LOCK TARGET ================= */
    const [[bank]] = await connection.query(
      `SELECT * FROM company_bank_details WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!bank) {
      throw new Error("Bank not found");
    }

    if (bank.status !== "active") {
      throw new Error("Only active bank can be primary");
    }

    if (bank.is_primary) {
      return res.json({
        success: true,
        message: "Already primary",
      });
    }

    /* ================= RESET OLD PRIMARY ================= */
    const [oldPrimaryRows] = await connection.query(
      `SELECT * FROM company_bank_details WHERE is_primary = TRUE FOR UPDATE`
    );

    const oldPrimary = oldPrimaryRows[0] || null;

    await connection.query(
      `UPDATE company_bank_details SET is_primary = FALSE WHERE is_primary = TRUE`
    );

    /* ================= SET NEW PRIMARY ================= */
    await connection.query(
      `UPDATE company_bank_details SET is_primary = TRUE WHERE id=?`,
      [id]
    );

    /* ================= AUDIT ================= */

    // old primary audit
    if (oldPrimary) {
      await AuditLog({
        connection,
        table: "company_bank_details",
        recordId: oldPrimary.id,
        action: "UPDATE",
        oldData: { is_primary: true },
        newData: { is_primary: false },
        userId,
        remarks: "Primary removed",
      });
    }

    // new primary audit
    await AuditLog({
      connection,
      table: "company_bank_details",
      recordId: id,
      action: "UPDATE",
      oldData: { is_primary: false },
      newData: { is_primary: true },
      userId,
      remarks: remarks || "Set as primary bank",
    });

    await connection.commit();

    res.json({
      success: true,
      message: "Primary bank updated successfully",
    });

  } catch (err) {
    await connection.rollback();
    console.error("setPrimaryBank ERROR:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
