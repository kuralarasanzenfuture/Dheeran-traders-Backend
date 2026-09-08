import db from "../../config/db.js";
import {AuditLog} from "../../services/audit.service.js";

/* ================= CREATE ================= */

// export const saveCompanyDetails = async (req, res) => {
//   try {
//     const {
//       company_name,
//       company_quotes,
//       company_address,
//       district,
//       state,
//       pincode,
//       phone,
//       email,
//       website,
//       disclaimer,
//       instruction,
//     } = req.body;

//     if (!company_name) {
//       return res.status(400).json({ message: "Company name is required" });
//     }

//     const [result] = await db.query(
//       `INSERT INTO company_details
//       (company_name, company_quotes, company_address, district, state, pincode,
//        phone, email, website, disclaimer, instruction)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         company_name,
//         company_quotes || null,
//         company_address || null,
//         district || null,
//         state || null,
//         pincode || null,
//         phone || null,
//         email || null,
//         website || null,
//         disclaimer || null,
//         instruction || null,
//       ]
//     );

//     // 🔥 Fetch the inserted row
//     const [rows] = await db.query(
//       "SELECT * FROM company_details WHERE id = ?",
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Company details created successfully",
//       data: rows[0],
//     });
//   } catch (err) {
//     console.error("Create error:", err);
//     res.status(500).json({ message: "Failed to create company details" });
//   }
// };

/* ================= READ ================= */
export const getCompanyDetails = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_details ORDER BY id DESC LIMIT 1"
    );

    if (!rows.length) {
      return res.status(404).json({ message: "No company details found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Read error:", err);
    res.status(500).json({ message: "Failed to fetch company details" });
  }
};

/* ================= UPDATE ================= */
// export const updateCompanyDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const {
//       company_name,
//       company_quotes,
//       company_address,
//       district,
//       state,
//       pincode,
//       phone,
//       email,
//       website,
//       disclaimer,
//       instruction,
//     } = req.body;

//     if (!company_name) {
//       return res.status(400).json({ message: "Company name is required" });
//     }

//     const [exists] = await db.query(
//       "SELECT id FROM company_details WHERE id=?",
//       [id]
//     );

//     if (!exists.length) {
//       return res.status(404).json({ message: "Company details not found" });
//     }

//     await db.query(
//       `UPDATE company_details SET
//         company_name=?,
//         company_quotes=?,
//         company_address=?,
//         district=?,
//         state=?,
//         pincode=?,
//         phone=?,
//         email=?,
//         website=?,
//         disclaimer=?,
//         instruction=?
//        WHERE id=?`,
//       [
//         company_name,
//         company_quotes || null,
//         company_address || null,
//         district || null,
//         state || null,
//         pincode || null,
//         phone || null,
//         email || null,
//         website || null,
//         disclaimer || null,
//         instruction || null,
//         id,
//       ]
//     );

//     // 🔥 fetch updated row
//     const [rows] = await db.query(
//       "SELECT * FROM company_details WHERE id=?",
//       [id]
//     );

//     res.json({
//       message: "Company details updated successfully",
//       data: rows[0],
//     });
//   } catch (err) {
//     console.error("Update error:", err);
//     res.status(500).json({ message: "Failed to update company details" });
//   }
// };

/* ================= DELETE ================= */
// export const deleteCompanyDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 🔍 get row before deleting
//     const [rows] = await db.query(
//       "SELECT * FROM company_details WHERE id=?",
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Company details not found" });
//     }

//     const deletedData = rows[0];

//     // ❌ delete
//     await db.query("DELETE FROM company_details WHERE id=?", [id]);

//     // ✅ return deleted row
//     res.json({
//       message: "Company details deleted successfully",
//       data: deletedData,
//     });
//   } catch (err) {
//     console.error("Delete error:", err);
//     res.status(500).json({ message: "Failed to delete company details" });
//   }
// };


// ----------------------------- hard delete--------------------------------------------------------

export const saveCompanyDetails = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user?.id;

    const {
      company_name,
      company_quotes,
      company_address,
      district,
      state,
      pincode,
      phone,
      email,
      website,
      disclaimer,
      instruction,
      remarks
    } = req.body;

    if (!company_name) {
      throw new Error("Company name is required");
    }

    /* 🔥 STEP 1: deactivate ALL */
    await connection.query(
      `UPDATE company_details SET is_active = FALSE`
    );

    /* 🔥 STEP 2: insert NEW active */
    const [result] = await connection.query(
      `INSERT INTO company_details
      (
        company_name, company_quotes, company_address,
        district, state, pincode,
        phone, email, website,
        disclaimer, instruction,
        is_active, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        company_name,
        company_quotes || null,
        company_address || null,
        district || null,
        state || null,
        pincode || null,
        phone || null,
        email || null,
        website || null,
        disclaimer || null,
        instruction || null,
        userId
      ]
    );

    const id = result.insertId;

    const [[data]] = await connection.query(
      `SELECT * FROM company_details WHERE id=?`,
      [id]
    );

    /* 🔥 AUDIT */
    await AuditLog({
      connection,
      table: "company_details",
      recordId: id,
      action: "INSERT",
      newData: data,
      userId,
      remarks: remarks || "Company created (set active)"
    });

    await connection.commit();

    res.status(201).json({
      success: true,
      data
    });

  } catch (err) {
    console.error("saveCompanyDetails ERROR:", err);
    await connection.rollback();

    res.status(400).json({
      success: false,
      message: err.message
    });
  } finally {
    connection.release();
  }
};

// export const getCompanyDetails = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `
//       SELECT * 
//       FROM company_details
//       ORDER BY is_active DESC, id DESC
//       LIMIT 1
//       `
//     );

//     // console.log("DB RESULT:", rows); // 🔥 DEBUG

//     if (!rows.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No company found"
//       });
//     }

//     res.json({
//       success: true,
//       rows[0]
//     });

//   } catch (err) {
//     console.error("getCompanyDetails ERROR:", err);

//     res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

export const updateCompanyDetails = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;
    const { remarks } = req.body;

    const [[oldData]] = await connection.query(
      `SELECT * FROM company_details WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!oldData) throw new Error("Company not found");

    const updatedData = {
      company_name: req.body.company_name ?? oldData.company_name,
      company_quotes: req.body.company_quotes ?? oldData.company_quotes,
      company_address: req.body.company_address ?? oldData.company_address,
      district: req.body.district ?? oldData.district,
      state: req.body.state ?? oldData.state,
      pincode: req.body.pincode ?? oldData.pincode,
      phone: req.body.phone ?? oldData.phone,
      email: req.body.email ?? oldData.email,
      website: req.body.website ?? oldData.website,
      disclaimer: req.body.disclaimer ?? oldData.disclaimer,
      instruction: req.body.instruction ?? oldData.instruction,
      updated_by: userId
    };

    await connection.query(
      `UPDATE company_details SET ? WHERE id=?`,
      [updatedData, id]
    );

    await AuditLog({
      connection,
      table: "company_details",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || "Company updated"
    });

    await connection.commit();

    res.json({
      success: true,
      message: "Company updated"
    });

  } catch (err) {
    console.error("Update company details error:", err);
    await connection.rollback();
    res.status(400).json({
      success: false,
      message: err.message
    });
  } finally {
    connection.release();
  }
};

export const deleteCompanyDetails = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    const [[oldData]] = await connection.query(
      `SELECT * FROM company_details WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!oldData) throw new Error("Company not found");

    /* ❌ prevent deleting active */
    if (oldData.is_active) {
      throw new Error("Cannot delete active company");
    }

    await connection.query(
      `DELETE FROM company_details WHERE id=?`,
      [id]
    );

    await AuditLog({
      connection,
      table: "company_details",
      recordId: id,
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || "Company deleted"
    });

    await connection.commit();

    res.json({
      success: true,
      message: "Deleted successfully"
    });

  } catch (err) {
    console.error("Delete company details error:", err);
    await connection.rollback();
    res.status(400).json({
      success: false,
      message: err.message
    });
  } finally {
    connection.release();
  }
};
