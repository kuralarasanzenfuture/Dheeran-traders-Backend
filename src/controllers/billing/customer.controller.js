import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

/**
 * CREATE CUSTOMER
 */
// export const createCustomer = async (req, res) => {
//   try {
//     const { first_name, last_name, phone, email, address } = req.body;

//     // ✅ Required fields validation
//     if (!first_name || !phone) {
//       return res.status(400).json({
//         message: "First name and phone are required",
//       });
//     }

//     // ✅ Duplicate phone / email check
//     const [exists] = await db.query(
//       `
//       SELECT id FROM customers
//       WHERE phone = ? OR email = ?
//       `,
//       [phone, email || null],
//     );

//     if (exists.length) {
//       return res.status(409).json({
//         message: "Customer with same phone or email already exists",
//       });
//     }

//     // ✅ Insert customer
//     const [result] = await db.query(
//       `
//       INSERT INTO customers
//       (first_name, last_name, phone, email, address)
//       VALUES (?, ?, ?, ?, ?)
//       `,
//       [first_name, last_name, phone, email || null, address || null],
//     );

//     const [[customer]] = await db.query(
//       "SELECT * FROM customers WHERE id = ?",
//       [result.insertId],
//     );

//     res.status(201).json({
//       message: "Customer created successfully",
//       customer,
//     });
//   } catch (error) {
//     console.error("Create customer error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,

        COALESCE(SUM(cb.grand_total), 0) AS total,
        COALESCE(SUM(cb.balance_due), 0) AS pending_amount

      FROM customers c
      LEFT JOIN customerBilling cb
        ON c.id = cb.customer_id

      GROUP BY c.id
      ORDER BY c.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Fetch customers failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET CUSTOMER BY ID
 */
export const getCustomerById = async (req, res) => {
  try {
    const [[customer]] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [req.params.id],
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// export const updateCustomer = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (isNaN(id)) {
//       return res.status(400).json({ message: "Invalid customer id" });
//     }

//     const { first_name, last_name, phone, email, address } = req.body;

//     // ❌ No fields provided
//     if (!first_name && !last_name && !phone && !email && !address) {
//       return res.status(400).json({ message: "No fields to update" });
//     }

//     // 🔍 Check exists
//     const [[existingCustomer]] = await db.query(
//       "SELECT * FROM customers WHERE id = ?",
//       [id],
//     );

//     if (!existingCustomer) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     // 📞 Phone validation
//     if (phone && !/^[0-9]{10,15}$/.test(phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     // 📧 Email validation
//     if (email && !/^\S+@\S+\.\S+$/.test(email)) {
//       return res.status(400).json({ message: "Invalid email address" });
//     }

//     // 🚫 Duplicate phone
//     if (phone) {
//       const [phoneExists] = await db.query(
//         "SELECT id FROM customers WHERE phone = ? AND id != ?",
//         [phone, id],
//       );
//       if (phoneExists.length) {
//         return res.status(409).json({ message: "Phone already in use" });
//       }
//     }

//     // 🚫 Duplicate email
//     if (email) {
//       const [emailExists] = await db.query(
//         "SELECT id FROM customers WHERE email = ? AND id != ?",
//         [email, id],
//       );
//       if (emailExists.length) {
//         return res.status(409).json({ message: "Email already in use" });
//       }
//     }

//     // 🧠 Safe values (no blanks)
//     const updatedData = {
//       first_name: first_name?.trim() || existingCustomer.first_name,
//       last_name: last_name?.trim() || existingCustomer.last_name,
//       phone: phone || existingCustomer.phone,
//       email: email || existingCustomer.email,
//       address: address?.trim() || existingCustomer.address,
//     };

//     // 📝 Update
//     await db.query(
//       `
//       UPDATE customers
//       SET
//         first_name = ?,
//         last_name = ?,
//         phone = ?,
//         email = ?,
//         address = ?
//       WHERE id = ?
//       `,
//       [
//         updatedData.first_name,
//         updatedData.last_name,
//         updatedData.phone,
//         updatedData.email,
//         updatedData.address,
//         id,
//       ],
//     );

//     const [[updatedCustomer]] = await db.query(
//       "SELECT * FROM customers WHERE id = ?",
//       [id],
//     );

//     return res.json({
//       message: "Customer updated successfully",
//       customer: updatedCustomer,
//     });
//   } catch (error) {
//     console.error("Update customer error:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

/**
 * DELETE CUSTOMER
 */
// export const deleteCustomer = async (req, res) => {
//   try {
//     const [result] = await db.query("DELETE FROM customers WHERE id = ?", [
//       req.params.id,
//     ]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     res.json({ message: "Customer deleted successfully" });
//   } catch (error) {
//     console.error("Delete customer error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// ------------------------------------hard delete---------------------------------------------

// export const createCustomer = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     let { first_name, last_name, phone, email, address, remarks } = req.body;
//     const userId = req.user?.id;

//     if (!first_name || !phone) {
//       throw new Error("First name and phone are required");
//     }

//     first_name = first_name.trim();
//     last_name = last_name?.trim() || null;
//     address = address?.trim() || null;

//     if (!/^[0-9]{10,15}$/.test(phone)) {
//       throw new Error("Invalid phone number");
//     }

//     if (email && !/^\S+@\S+\.\S+$/.test(email)) {
//       throw new Error("Invalid email");
//     }

//     // 🔍 duplicate check
//     const [exists] = await connection.query(
//       `SELECT id FROM customers WHERE phone = ? OR email = ?`,
//       [phone, email || null],
//     );

//     if (exists.length) {
//       throw new Error("Customer already exists");
//     }

//     const [result] = await connection.query(
//       `INSERT INTO customers
//        (first_name, last_name, phone, email, address)
//        VALUES (?, ?, ?, ?, ?)`,
//       [first_name, last_name, phone, email || null, address],
//     );

//     const id = result.insertId;

//     // ✅ AUDIT
//     await connection.query(
//       `INSERT INTO audit_logs
//        (table_name, record_id, action, new_data, changed_by, remarks)
//        VALUES (?, ?, 'INSERT', ?, ?, ?)`,
//       [
//         "customers",
//         id,
//         JSON.stringify({ first_name, phone, email }),
//         userId,
//         remarks || "Customer created",
//       ],
//     );

//     await connection.commit();

//     res.status(201).json({ message: "Customer created", id });
//   } catch (err) {
//     await connection.rollback();
//     console.log("create customer error", err);

//     next(err);
//   } finally {
//     connection.release();
//   }
// };

/* - add place field - */

export const createCustomer = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let { first_name, last_name, phone, email, place, address, remarks } =
      req.body;

    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (!first_name || !phone) {
      throw new Error("First name and phone are required");
    }

    first_name = first_name.trim();
    phone = phone.trim();
    email = email?.trim() || null;
    last_name = last_name?.trim() || null;
    place = place?.trim() || null;
    address = address?.trim() || null;

    if (!/^[0-9]{10,15}$/.test(phone)) {
      throw new Error("Invalid phone number");
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Invalid email");
    }

    // ✅ Check phone separately
    const [phoneExists] = await connection.query(
      `SELECT id FROM customers WHERE phone = ?`,
      [phone],
    );

    if (phoneExists.length) {
      throw new Error(`Customer with phone ${phone} already exists`);
    }

    // ✅ Check email separately (only if provided)
    if (email) {
      const [emailExists] = await connection.query(
        `SELECT id FROM customers WHERE email = ?`,
        [email],
      );

      if (emailExists.length) {
        throw new Error(`Customer with email ${email} already exists`);
      }
    }

    const [result] = await connection.query(
      `INSERT INTO customers
       (first_name, last_name, phone, email, place, address, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, phone, email, place, address, userId],
    );

    const id = result.insertId;

    await AuditLog({
      connection,
      table: "customers",
      recordId: id,
      action: "INSERT",
      newData: { first_name, last_name, phone, email, place, address },
      userId,
      remarks: remarks || "Customer created",
    });

    await connection.commit();

    return res.status(201).json({ message: "Customer created", id });
  } catch (err) {
    await connection.rollback();
    console.error("create customer error:", err);

    return res.status(500).json({
      message: err.message || "error creating customer",
    });
  } finally {
    connection.release();
  }
};

// export const updateCustomer = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const userId = req.user?.id;
//     const { remarks } = req.body;

//     const [[oldData]] = await connection.query(
//       "SELECT * FROM customers WHERE id = ?",
//       [id],
//     );

//     if (!oldData) throw new Error("Customer not found");

//     let data = { ...req.body };

//     if (data.phone && !/^[0-9]{10,15}$/.test(data.phone)) {
//       throw new Error("Invalid phone");
//     }

//     if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
//       throw new Error("Invalid email");
//     }

//     // 🚫 duplicate check
//     if (data.phone) {
//       const [exists] = await connection.query(
//         "SELECT id FROM customers WHERE phone = ? AND id != ?",
//         [data.phone, id],
//       );
//       if (exists.length) throw new Error("Phone already exists");
//     }

//     if (data.email) {
//       const [exists] = await connection.query(
//         "SELECT id FROM customers WHERE email = ? AND id != ?",
//         [data.email, id],
//       );
//       if (exists.length) throw new Error("Email already exists");
//     }

//     await connection.query("UPDATE customers SET ? WHERE id = ?", [data, id]);

//     const [[newData]] = await connection.query(
//       "SELECT * FROM customers WHERE id = ?",
//       [id],
//     );

//     await connection.query(
//       `INSERT INTO audit_logs
//        (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//        VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
//       [
//         "customers",
//         id,
//         JSON.stringify(oldData),
//         JSON.stringify(newData),
//         userId,
//         remarks || "Customer updated",
//       ],
//     );

//     await connection.commit();

//     res.json({ message: "Updated", data: newData });
//   } catch (err) {
//     await connection.rollback();
//     console.log("update customer error",err);

//     next(err);
//   } finally {
//     connection.release();
//   }
// };

/* -- add place --*/
export const updateCustomer = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body;

    if (!userId) throw new Error("User not authenticated");

    const [[oldData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );

    if (!oldData) throw new Error("Customer not found");

    // ✅ whitelist fields
    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "place",
      "address",
    ];

    let data = {};

    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key];
      }
    }

    // ✅ trim
    if (data.phone) data.phone = data.phone.trim();
    if (data.email) data.email = data.email.trim();
    if (data.first_name) data.first_name = data.first_name.trim();
    if (data.last_name) data.last_name = data.last_name.trim();
    if (data.place) data.place = data.place.trim();
    if (data.address) data.address = data.address.trim();

    if (Object.keys(data).length === 0) {
      throw new Error("No valid fields to update");
    }

    // ✅ validation
    if (data.phone && !/^[0-9]{10,15}$/.test(data.phone)) {
      throw new Error("Invalid phone");
    }

    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
      throw new Error("Invalid email");
    }

    // ✅ duplicate checks
    if (data.phone) {
      const [exists] = await connection.query(
        "SELECT id FROM customers WHERE phone = ? AND id != ?",
        [data.phone, id],
      );
      if (exists.length) throw new Error("Phone already exists");
    }

    if (data.email) {
      const [exists] = await connection.query(
        "SELECT id FROM customers WHERE email = ? AND id != ?",
        [data.email, id],
      );
      if (exists.length) throw new Error("Email already exists");
    }

    let isChanged = false;

    for (let key in data) {
      if (data[key] != oldData[key]) {
        isChanged = true;
        break;
      }
    }

    if (!isChanged) {
      await connection.rollback();
      return res.json({ message: "No changes detected" });
    }

    await connection.query("UPDATE customers SET ? WHERE id = ?", [data, id]);

    const [[newData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );

    // ✅ audit log
    await AuditLog({
      connection,
      table: "customers",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData,
      userId,
      remarks: remarks || "Customer updated",
    });

    await connection.commit();

    return res.json({ message: "Updated", data: newData });
  } catch (err) {
    await connection.rollback();
    console.error("update customer error", err);

    return res.status(500).json({
      message: err.message || "error updating customer",
    });
  } finally {
    connection.release();
  }
};

export const deleteCustomer = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    const [[oldData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );

    if (!oldData) throw new Error("Customer not found");

    // ⚠️ OPTIONAL SAFETY CHECK (VERY IMPORTANT)
    const [[hasBilling]] = await connection.query(
      "SELECT COUNT(*) as count FROM customerBilling WHERE customer_id = ?",
      [id],
    );

    // if (hasBilling.count > 0) {
    //   // throw new Error("Cannot delete customer with billing records");
    //   return res.status(400).json({
    //     message: "Cannot delete customer with billing records",
    //   });
    // }

    if (hasBilling.count > 0) {
      await connection.rollback(); // ✅ VERY IMPORTANT
      return res.status(400).json({
        message: "Cannot delete customer with billing records",
      });
    }

    // ✅ AUDIT FIRST
    // await connection.query(
    //   `INSERT INTO audit_logs
    //    (table_name, record_id, action, old_data, changed_by, remarks)
    //    VALUES (?, ?, 'DELETE', ?, ?, ?)`,
    //   [
    //     "customers",
    //     id,
    //     JSON.stringify(oldData),
    //     userId,
    //     remarks || "Customer hard deleted",
    //   ],
    // );

    await AuditLog({
      connection,
      table: "customers",
      recordId: id,
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || "Customer hard deleted",
    });

    // 🔥 HARD DELETE
    await connection.query("DELETE FROM customers WHERE id = ?", [id]);

    await connection.commit();

    res.json({ message: "Customer permanently deleted" });
  } catch (err) {
    await connection.rollback();
    console.error("DELETE CUSTOMER ERROR:", err);
    res.status(500).json({ message: err.message || "Error deleting customer" });
  } finally {
    connection.release();
  }
};
