import db from "../config/db.js";
import fs from "fs";
import path from "path";

/* 🟢 CREATE COMPANY BANK */
export const createCompanyBank = async (req, res) => {
  try {
    /* 1️⃣ Extract fields from request body */
    const {
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      branch,
      status,
    } = req.body;

    /* 2️⃣ Required field validation */
    if (!bank_name || !account_name || !account_number || !ifsc_code) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "QR code image is required",
      });
    }

    /* 3️⃣ CHECK: Account already exists or not */
    const [existingAccount] = await db.query(
      `SELECT id FROM company_bank_details 
       WHERE bank_name = ? AND account_number = ?`,
      [bank_name, account_number]
    );

    /* 4️⃣ If account exists → stop */
    if (existingAccount.length > 0) {
      return res.status(409).json({
        message: "This bank account already exists",
      });
    }

    /* 5️⃣ Handle QR image upload */
    const qr_code_image = req.file
      ? `/uploads/bank-qr/${req.file.filename}`
      : null;

    /* 6️⃣ Insert new bank record */
    const [result] = await db.query(
      `INSERT INTO company_bank_details
       (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

    /* 7️⃣ Fetch newly inserted record */
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details WHERE id = ?",
      [result.insertId]
    );

    /* 8️⃣ Success response */
    res.status(201).json({
      message: "Company bank created successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error("Create bank error:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
};


/* 📄 GET ALL */
export const getCompanyBanks = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details ORDER BY created_at DESC"
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
      [req.params.id]
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
export const updateCompanyBank = async (req, res) => {
  try {
    const [existing] = await db.query(
      "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    if (!existing.length) {
      return res.status(404).json({ message: "Bank not found" });
    }

    const fields = {
      bank_name: req.body.bank_name,
      account_name: req.body.account_name,
      account_number: req.body.account_number,
      ifsc_code: req.body.ifsc_code,
      branch: req.body.branch,
      status: req.body.status,
    };

    /* If new QR uploaded */
    if (req.file) {
      fields.qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

      // delete old image
      if (existing[0].qr_code_image) {
        const oldPath = path.join(process.cwd(), existing[0].qr_code_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await db.query("UPDATE company_bank_details SET ? WHERE id = ?", [
      fields,
      req.params.id,
    ]);

    res.json({ message: "Company bank updated successfully" });
  } catch (err) {
    console.error("Update bank error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ❌ DELETE */
// export const deleteCompanyBank = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
//       [req.params.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Bank not found" });
//     }

//     if (rows[0].qr_code_image) {
//       const imgPath = path.join(process.cwd(), rows[0].qr_code_image);
//       if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
//     }

//     await db.query("DELETE FROM company_bank_details WHERE id = ?", [
//       req.params.id,
//     ]);

//     res.json({ message: "Company bank deleted successfully" });
//   } catch (err) {
//     console.error("Delete bank error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const deleteCompanyBank = async (req, res) => {
try {
const [rows] = await db.query(
"SELECT qr_code_image FROM company_bank_details WHERE id = ?",
[req.params.id]
);


if (!rows.length) {
return res.status(404).json({ message: "Bank not found" });
}

if (rows[0].qr_code_image) {
const imgPath = path.resolve(
process.cwd(),
rows[0].qr_code_image.replace(/^\/+/, "")
);


try {
await fs.unlink(imgPath);
} catch (err) {
console.warn("Image not found or already deleted:", err.message);
}
}


await db.query("DELETE FROM company_bank_details WHERE id = ?", [
req.params.id,
]);


res.json({ message: "Company bank deleted successfully" });
} catch (err) {
console.error("Delete bank error:", err);
res.status(500).json({ message: "Server error" });
}
};


  // import db from "../config/db.js";
  // import fs from "fs";
  // import path from "path";

  // /* 🟢 CREATE COMPANY BANK */
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
  //     const qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

  //     /* 5️⃣ Handle QR image upload */
    
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


  // /* 📄 GET ALL */
  // export const getCompanyBanks = async (req, res) => {
  //   try {
  //     const [rows] = await db.query(
  //       "SELECT * FROM company_bank_details ORDER BY created_at DESC"
  //     );
  //     res.json(rows);
  //   } catch (err) {
  //     console.error(err);
  //     res.status(500).json({ message: "Server error" });
  //   }
  // };

  // /* 🔍 GET BY ID */
  // export const getCompanyBankById = async (req, res) => {
  //   try {
  //     const [rows] = await db.query(
  //       "SELECT * FROM company_bank_details WHERE id = ?",
  //       [req.params.id]
  //     );

  //     if (!rows.length) {
  //       return res.status(404).json({ message: "Bank not found" });
  //     }

  //     res.json(rows[0]);
  //   } catch (err) {
  //     console.error(err);
  //     res.status(500).json({ message: "Server error" });
  //   }
  // };

  // /* ✏️ UPDATE COMPANY BANK */
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
  //        const qr_code_image = req.file
  //   ? `/uploads/bank-qr/${req.file.filename}`
  //   : existing[0].qr_code_image;

  //     /* If new QR uploaded */
  //     if (req.file) {
  //       fields.qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

  //       // delete old image
  //       if (existing[0].qr_code_image) {
  //         const oldPath = path.join(process.cwd(), existing[0].qr_code_image);
  //         if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  //       }
  //     }

  //     await db.query(
  //   `UPDATE company_bank_details
  //    SET bank_name = ?,
  //        account_name = ?,
  //        account_number = ?,
  //        ifsc_code = ?,
  //        branch = ?,
  //        status = ?,
  //        qr_code_image = ?
  //    WHERE id = ?`,
  //   [
  //     req.body.bank_name,
  //     req.body.account_name,
  //     req.body.account_number,
  //     req.body.ifsc_code,
  //     req.body.branch || null,
  //     req.body.status || "active",
  //     req.file
  //       ? `/uploads/bank-qr/${req.file.filename}`
  //       : existing[0].qr_code_image,
  //     req.params.id,
  //   ]
  // );


  //     res.json({ message: "Company bank updated successfully" });
  //   } catch (err) {
  //     console.error("Update bank error:", err);
  //     res.status(500).json({ message: "Server error" });
  //   }
  // };

  // /* ❌ DELETE */
  // export const deleteCompanyBank = async (req, res) => {
  //   try {
  //     const [rows] = await db.query(
  //       "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
  //       [req.params.id]
  //     );

  //     if (!rows.length) {
  //       return res.status(404).json({ message: "Bank not found" });
  //     }

  //     if (rows[0].qr_code_image) {
  //       const imgPath = path.join(process.cwd(), rows[0].qr_code_image);
  //       if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  //     }

  //     await db.query("DELETE FROM company_bank_details WHERE id = ?", [
  //       req.params.id,
  //     ]);

  //     res.json({ message: "Company bank deleted successfully" });
  //   } catch (err) {
  //     console.error("Delete bank error:", err);
  //     res.status(500).json({ message: "Server error" });
  //   }
  // };
