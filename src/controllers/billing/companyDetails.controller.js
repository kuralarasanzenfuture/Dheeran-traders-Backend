import db from "../../config/db.js";

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

//     res.status(201).json({
//       message: "Company details created successfully",
//       id: result.insertId,
//     });
//   } catch (err) {
//     console.error("Create error:", err);
//     res.status(500).json({ message: "Failed to create company details" });
//   }
// };

export const saveCompanyDetails = async (req, res) => {
  try {
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
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const [result] = await db.query(
      `INSERT INTO company_details
      (company_name, company_quotes, company_address, district, state, pincode,
       phone, email, website, disclaimer, instruction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );

    // 🔥 Fetch the inserted row
    const [rows] = await db.query(
      "SELECT * FROM company_details WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Company details created successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ message: "Failed to create company details" });
  }
};
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
export const updateCompanyDetails = async (req, res) => {
  try {
    const { id } = req.params;

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
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const [exists] = await db.query(
      "SELECT id FROM company_details WHERE id=?",
      [id]
    );

    if (!exists.length) {
      return res.status(404).json({ message: "Company details not found" });
    }

    await db.query(
      `UPDATE company_details SET
        company_name=?,
        company_quotes=?,
        company_address=?,
        district=?,
        state=?,
        pincode=?,
        phone=?,
        email=?,
        website=?,
        disclaimer=?,
        instruction=?
       WHERE id=?`,
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
        id,
      ]
    );

    // 🔥 fetch updated row
    const [rows] = await db.query(
      "SELECT * FROM company_details WHERE id=?",
      [id]
    );

    res.json({
      message: "Company details updated successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update company details" });
  }
};

/* ================= DELETE ================= */
// export const deleteCompanyDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [exists] = await db.query(
//       "SELECT id FROM company_details WHERE id=?",
//       [id]
//     );

//     if (!exists.length) {
//       return res.status(404).json({ message: "Company details not found" });
//     }

//     await db.query("DELETE FROM company_details WHERE id=?", [id]);

//     res.json({ message: "Company details deleted successfully" });
//   } catch (err) {
//     console.error("Delete error:", err);
//     res.status(500).json({ message: "Failed to delete company details" });
//   }
// };

export const deleteCompanyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 get row before deleting
    const [rows] = await db.query(
      "SELECT * FROM company_details WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Company details not found" });
    }

    const deletedData = rows[0];

    // ❌ delete
    await db.query("DELETE FROM company_details WHERE id=?", [id]);

    // ✅ return deleted row
    res.json({
      message: "Company details deleted successfully",
      data: deletedData,
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete company details" });
  }
};