import db from "../../config/db.js";

/**
 * CREATE VENDOR
 */
// export const createVendor = async (req, res) => {
//   try {
//     const {
//       first_name,
//       last_name,
//       phone,
//       email,
//       address,
//       bank_name,
//       bank_account_number,
//       bank_ifsc_code,
//       bank_branch_name,
//     } = req.body;

//     /* ===========================
//        REQUIRED VALIDATION
//     ============================ */
//     if (!first_name || !phone) {
//       return res.status(400).json({
//         message: "First name, last name and phone are required",
//       });
//     }

//     // Phone validation
//     if (!/^[0-9]{10,15}$/.test(phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     // Email validation (optional)
//     if (email && !/^\S+@\S+\.\S+$/.test(email)) {
//       return res.status(400).json({ message: "Invalid email address" });
//     }

//     // IFSC validation (optional)
//     if (bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) {
//       return res.status(400).json({ message: "Invalid IFSC code" });
//     }

//     // Account number validation (optional)
//     if (bank_account_number && !/^[0-9]{6,30}$/.test(bank_account_number)) {
//       return res.status(400).json({
//         message: "Invalid bank account number",
//       });
//     }

//     /* ===========================
//        DUPLICATE CHECK
//     ============================ */
//     const [exists] = await db.query(
//       `
//       SELECT id FROM vendors
//       WHERE phone = ? OR email = ?
//       `,
//       [phone, email || null],
//     );

//     if (exists.length) {
//       return res.status(409).json({
//         message: "Vendor with same phone or email already exists",
//       });
//     }

//     /* ===========================
//        INSERT VENDOR
//     ============================ */
//     const [result] = await db.query(
//       `
//       INSERT INTO vendors
//       (
//         first_name,
//         last_name,
//         phone,
//         email,
//         address,
//         bank_name,
//         bank_account_number,
//         bank_ifsc_code,
//         bank_branch_name
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         first_name,
//         last_name,
//         phone,
//         email || null,
//         address || null,
//         bank_name || null,
//         bank_account_number || null,
//         bank_ifsc_code || null,
//         bank_branch_name || null,
//       ],
//     );

//     const [[vendor]] = await db.query("SELECT * FROM vendors WHERE id = ?", [
//       result.insertId,
//     ]);

//     res.status(201).json({
//       message: "Vendor created successfully",
//       vendor,
//     });
//   } catch (error) {
//     console.error("Create vendor error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

/**
 * GET ALL VENDORS
 */
export const getVendors = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM vendors ORDER BY created_at DESC",
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
    const [[vendor]] = await db.query("SELECT * FROM vendors WHERE id = ?", [
      req.params.id,
    ]);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(vendor);
  } catch (error) {
    console.error("Get vendor error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// export const updateVendor = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (isNaN(id)) {
//       return res.status(400).json({ message: "Invalid vendor id" });
//     }

//     const {
//       first_name,
//       last_name,
//       phone,
//       email,
//       address,
//       bank_name,
//       bank_account_number,
//       bank_ifsc_code,
//     } = req.body;

//     // ❌ No fields provided
//     if (
//       !first_name &&
//       !last_name &&
//       !phone &&
//       !email &&
//       !address &&
//       !bank_name &&
//       !bank_account_number &&
//       !bank_ifsc_code
//     ) {
//       return res.status(400).json({ message: "No fields to update" });
//     }

//     // 🔍 Check vendor exists
//     const [[existingVendor]] = await db.query(
//       "SELECT * FROM vendors WHERE id = ?",
//       [id]
//     );

//     if (!existingVendor) {
//       return res.status(404).json({ message: "Vendor not found" });
//     }

//     // 📞 Phone validation
//     if (phone && !/^[0-9]{10,15}$/.test(phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     // 📧 Email validation
//     if (email && !/^\S+@\S+\.\S+$/.test(email)) {
//       return res.status(400).json({ message: "Invalid email address" });
//     }

//     // 🏦 IFSC validation
//     if (bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) {
//       return res.status(400).json({ message: "Invalid IFSC code" });
//     }

//     // 💳 Account validation
//     if (bank_account_number && !/^[0-9]{6,30}$/.test(bank_account_number)) {
//       return res.status(400).json({
//         message: "Invalid bank account number",
//       });
//     }

//     // 🚫 Duplicate phone
//     if (phone) {
//       const [phoneExists] = await db.query(
//         "SELECT id FROM vendors WHERE phone = ? AND id != ?",
//         [phone, id]
//       );
//       if (phoneExists.length) {
//         return res.status(409).json({ message: "Phone already in use" });
//       }
//     }

//     // 🚫 Duplicate email
//     if (email) {
//       const [emailExists] = await db.query(
//         "SELECT id FROM vendors WHERE email = ? AND id != ?",
//         [email, id]
//       );
//       if (emailExists.length) {
//         return res.status(409).json({ message: "Email already in use" });
//       }
//     }

//     // Final safe values (prevent blanks)
//     const updatedData = {
//       first_name: first_name?.trim() || existingVendor.first_name,
//       last_name: last_name?.trim() || existingVendor.last_name,
//       phone: phone || existingVendor.phone,
//       email: email || existingVendor.email,
//       address: address?.trim() || existingVendor.address,
//       bank_name: bank_name?.trim() || existingVendor.bank_name,
//       bank_account_number:
//         bank_account_number || existingVendor.bank_account_number,
//       bank_ifsc_code:
//         bank_ifsc_code || existingVendor.bank_ifsc_code,
//     };

//     // 📝 Update
//     await db.query(
//       `
//       UPDATE vendors
//       SET
//         first_name = ?,
//         last_name = ?,
//         phone = ?,
//         email = ?,
//         address = ?,
//         bank_name = ?,
//         bank_account_number = ?,
//         bank_ifsc_code = ?
//       WHERE id = ?
//       `,
//       [
//         updatedData.first_name,
//         updatedData.last_name,
//         updatedData.phone,
//         updatedData.email,
//         updatedData.address,
//         updatedData.bank_name,
//         updatedData.bank_account_number,
//         updatedData.bank_ifsc_code,
//         id,
//       ]
//     );

//     const [[updatedVendor]] = await db.query(
//       "SELECT * FROM vendors WHERE id = ?",
//       [id]
//     );

//     return res.json({
//       message: "Vendor updated successfully",
//       vendor: updatedVendor,
//     });
//   } catch (error) {
//     console.error("Update vendor error:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };


/**
 * DELETE VENDOR
 */
// export const deleteVendor = async (req, res) => {
//   try {
//     const [result] = await db.query("DELETE FROM vendors WHERE id = ?", [
//       req.params.id,
//     ]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Vendor not found" });
//     }

//     res.json({ message: "Vendor deleted successfully" });
//   } catch (error) {
//     console.error("Delete vendor error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// --------------------------------------hard delete-------------------------------------------------------

export const createVendor = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      first_name,
      last_name,
      phone,
      email,
      address,
      bank_name,
      bank_account_number,
      bank_ifsc_code,
      bank_branch_name,
      remarks
    } = req.body;

    const userId = req.user?.id;

    if (!first_name || !phone) {
      throw new Error("First name and phone are required");
    }

    first_name = first_name.trim();
    last_name = last_name?.trim();

    if (!/^[0-9]{10,15}$/.test(phone)) {
      throw new Error("Invalid phone number");
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Invalid email");
    }

    // 🔍 Duplicate check
    const [exists] = await connection.query(
      "SELECT id FROM vendors WHERE phone = ? OR email = ?",
      [phone, email]
    );

    if (exists.length) {
      throw new Error("Vendor already exists");
    }

    const [result] = await connection.query(
      `INSERT INTO vendors (
        first_name, last_name, phone, email, address,
        bank_name, bank_account_number, bank_ifsc_code, bank_branch_name,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name || null,
        phone,
        email || null,
        address || null,
        bank_name || null,
        bank_account_number || null,
        bank_ifsc_code || null,
        bank_branch_name || null,
        userId
      ]
    );

    const vendorId = result.insertId;

    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, new_data, changed_by, remarks)
       VALUES (?, ?, 'INSERT', ?, ?, ?)`,
      [
        "vendors",
        vendorId,
        JSON.stringify({ first_name, phone, email }),
        userId,
        remarks || "Vendor created"
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Vendor created",
      id: vendorId
    });

  } catch (err) {
    await connection.rollback();
    console.error("CREATE VENDOR ERROR:", err);
    next(err);
  } finally {
    connection.release();
  }
};


export const updateVendor = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body;

    const [[oldData]] = await connection.query(
      "SELECT * FROM vendors WHERE id = ?",
      [id]
    );

    if (!oldData) throw new Error("Vendor not found");

    let data = { ...req.body };

    if (data.phone && !/^[0-9]{10,15}$/.test(data.phone)) {
      throw new Error("Invalid phone");
    }

    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
      throw new Error("Invalid email");
    }

    // Duplicate checks
    if (data.phone) {
      const [exists] = await connection.query(
        "SELECT id FROM vendors WHERE phone = ? AND id != ?",
        [data.phone, id]
      );
      if (exists.length) throw new Error("Phone already exists");
    }

    if (data.email) {
      const [exists] = await connection.query(
        "SELECT id FROM vendors WHERE email = ? AND id != ?",
        [data.email, id]
      );
      if (exists.length) throw new Error("Email already exists");
    }

    await connection.query(
      "UPDATE vendors SET ?, updated_by = ? WHERE id = ?",
      [data, userId, id]
    );

    const [[newData]] = await connection.query(
      "SELECT * FROM vendors WHERE id = ?",
      [id]
    );

    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
       VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
      [
        "vendors",
        id,
        JSON.stringify(oldData),
        JSON.stringify(newData),
        userId,
        remarks || "Vendor updated"
      ]
    );

    await connection.commit();

    res.json({ message: "Vendor updated", vendor: newData });

  } catch (err) {
    await connection.rollback();
    console.error("UPDATE VENDOR ERROR:", err);
    next(err);
  } finally {
    connection.release();
  }
};

export const deleteVendor = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    const [[oldData]] = await connection.query(
      "SELECT * FROM vendors WHERE id = ?",
      [id]
    );

    if (!oldData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // ✅ CHECK vendor_stocks (REAL DEPENDENCY)
    const [[stockUsage]] = await connection.query(
      "SELECT COUNT(*) as count FROM vendor_stocks WHERE vendor_id = ?",
      [id]
    );

    if (stockUsage.count > 0) {
      return res.status(400).json({
        message: "Cannot delete vendor with stock entries"
      });
    }

    // OPTIONAL future table
    const [[purchaseUsage]] = await connection.query(
      "SELECT COUNT(*) as count FROM vendorPurchases WHERE vendor_id = ?",
      [id]
    ).catch(() => [[{ count: 0 }]]);

    if (purchaseUsage.count > 0) {
      return res.status(400).json({
        message: "Cannot delete vendor with purchase records"
      });
    }

    // ✅ AUDIT
    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, old_data, changed_by, remarks)
       VALUES (?, ?, 'DELETE', ?, ?, ?)`,
      [
        "vendors",
        id,
        JSON.stringify(oldData),
        userId,
        remarks || "Vendor deleted"
      ]
    );

    await connection.query(
      "DELETE FROM vendors WHERE id = ?",
      [id]
    );

    await connection.commit();

    res.json({ message: "Vendor permanently deleted" });

  } catch (err) {
    await connection.rollback();
    console.error("DELETE VENDOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

