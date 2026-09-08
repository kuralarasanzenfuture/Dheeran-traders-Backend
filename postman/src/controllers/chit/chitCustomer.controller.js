import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";


const aadharRegex = /^[2-9]{1}[0-9]{11}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// CREATE CUSTOMER
// export const createChitCustomer = async (req, res) => {
//   try {
//     let { name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode } = req.body;

//     if (!name || !phone) {
//       return res.status(400).json({ message: "Name and phone are required" });
//     }

//     // normalize PAN
//     if (pan_number) pan_number = pan_number.trim().toUpperCase();

//     // format validations
//     if (aadhar && !aadharRegex.test(aadhar)) {
//       return res.status(400).json({ message: "Invalid Aadhar format" });
//     }

//     if (pan_number && !panRegex.test(pan_number)) {
//       return res.status(400).json({ message: "Invalid PAN format" });
//     }

//     // check duplicates
//     const [exists] = await db.query(
//       `SELECT phone, aadhar, pan_number FROM chit_customers
//        WHERE phone = ? OR aadhar = ? OR pan_number = ?`,
//       [phone, aadhar || null, pan_number || null]
//     );

//     if (exists.length > 0) {
//       const dup = exists[0];
//       if (dup.phone === phone) {
//         return res.status(409).json({ message: "Phone already exists" });
//       }
//       if (aadhar && dup.aadhar === aadhar) {
//         return res.status(409).json({ message: "Aadhar already exists" });
//       }
//       if (pan_number && dup.pan_number === pan_number) {
//         return res.status(409).json({ message: "PAN already exists" });
//       }
//       return res.status(409).json({ message: "Customer already exists" });
//     }

//     const [result] = await db.query(
//       `INSERT INTO chit_customers
//       (name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode]
//     );

//     const [newCustomer] = await db.query(
//       `SELECT * FROM chit_customers WHERE id = ?`,
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Customer created successfully",
//       data: newCustomer[0],
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// GET ALL CUSTOMERS
export const getChitCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM chit_customers ORDER BY id DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE CUSTOMER
export const getChitCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`SELECT * FROM chit_customers WHERE id = ?`, [
      id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE CUSTOMER
// export const updateChitCustomer = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let { name, phone, place, aadhar, pan_number, door_no, address , state, district, pincode } = req.body;

//     if (!name || !phone) {
//       return res.status(400).json({ message: "Name and phone are required" });
//     }

//     // normalize PAN
//     if (pan_number) pan_number = pan_number.trim().toUpperCase();

//     // format validations
//     if (aadhar && !aadharRegex.test(aadhar)) {
//       return res.status(400).json({ message: "Invalid Aadhar format" });
//     }

//     if (pan_number && !panRegex.test(pan_number)) {
//       return res.status(400).json({ message: "Invalid PAN format" });
//     }

//     // duplicate check except current id
//     const [exists] = await db.query(
//       `SELECT phone, aadhar, pan_number FROM chit_customers
//        WHERE (phone = ? OR aadhar = ? OR pan_number = ?) AND id != ?`,
//       [phone, aadhar || null, pan_number || null, id]
//     );

//     if (exists.length > 0) {
//       const dup = exists[0];
//       if (dup.phone === phone) {
//         return res.status(409).json({ message: "Phone already exists" });
//       }
//       if (aadhar && dup.aadhar === aadhar) {
//         return res.status(409).json({ message: "Aadhar already exists" });
//       }
//       if (pan_number && dup.pan_number === pan_number) {
//         return res.status(409).json({ message: "PAN already exists" });
//       }
//       return res.status(409).json({ message: "Customer already exists" });
//     }

//     const [result] = await db.query(
//       `UPDATE chit_customers
//        SET name=?, phone=?, place=?, aadhar=?, pan_number=?, door_no=?, address=?, state=?, district=?, pincode=?
//        WHERE id=?`,
//       [name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     res.json({ message: "Customer updated successfully" });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// DELETE CUSTOMER
// export const deleteChitCustomer = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [result] = await db.query(
//       `DELETE FROM chit_customers WHERE id = ?`,
//       [id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     res.json({ message: "Customer deleted successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// --------------------------------------------------------------------------------

export const createChitCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      name,
      phone,
      place,
      aadhar,
      pan_number,
      door_no,
      address,
      state,
      district,
      pincode,
    } = req.body;

    const userId = req.user?.id;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone required" });
    }

    if (pan_number) pan_number = pan_number.trim().toUpperCase();

    const [result] = await connection.query(
      `INSERT INTO chit_customers 
      (name, phone, place, aadhar, pan_number, door_no, address, state, district, pincode, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        phone,
        place,
        aadhar,
        pan_number,
        door_no,
        address,
        state,
        district,
        pincode,
        userId,
      ],
    );

    const [newCustomer] = await connection.query(
      `SELECT * FROM chit_customers WHERE id = ?`,
      [result.insertId],
    );

    // ✅ AUDIT
    await AuditLog({
      connection,
      table: "chit_customers",
      recordId: result.insertId,
      action: "INSERT",
      newData: newCustomer[0],
      userId,
      remarks: "Customer created",
    });

    await connection.commit();

    res.status(201).json({
      message: "Customer created",
      data: newCustomer[0],
    });
  } catch (err) {
    console.error(`chit customer create error: ${err}`);
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

export const updateChitCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body;

    const [oldRows] = await connection.query(
      `SELECT * FROM chit_customers WHERE id = ?`,
      [id],
    );

    if (!oldRows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const oldData = oldRows[0];

    let {
      name,
      phone,
      place,
      aadhar,
      pan_number,
      door_no,
      address,
      state,
      district,
      pincode,
    } = req.body;

    // fallback values
    name = name ?? oldData.name;
    phone = phone ?? oldData.phone;
    place = place ?? oldData.place;
    aadhar = aadhar ?? oldData.aadhar;
    pan_number = pan_number
      ? pan_number.trim().toUpperCase()
      : oldData.pan_number;
    door_no = door_no ?? oldData.door_no;
    address = address ?? oldData.address;
    state = state ?? oldData.state;
    district = district ?? oldData.district;
    pincode = pincode ?? oldData.pincode;

    await connection.query(
      `UPDATE chit_customers
       SET name=?, phone=?, place=?, aadhar=?, pan_number=?, door_no=?, address=?, state=?, district=?, pincode=?, updated_by=?
       WHERE id=?`,
      [
        name,
        phone,
        place,
        aadhar,
        pan_number,
        door_no,
        address,
        state,
        district,
        pincode,
        userId,
        id,
      ],
    );

    const [newRows] = await connection.query(
      `SELECT * FROM chit_customers WHERE id = ?`,
      [id],
    );

    const newData = newRows[0];

    // ✅ AUDIT
    await AuditLog({
      connection,
      table: "chit_customers",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData,
      userId,
      remarks: remarks || "Customer updated",
    });

    await connection.commit();

    res.json({
      message: "Customer updated",
      data: newData,
    });
  } catch (err) {
    console.error(`chit customer update error: ${err}`);
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

export const deleteChitCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    const [rows] = await connection.query(
      `SELECT * FROM chit_customers WHERE id = ?`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const oldData = rows[0];

    // 👉 Instead of DELETE
    // await connection.query(
    //   `UPDATE chit_customers SET is_active = FALSE, updated_by = ? WHERE id = ?`,
    //   [userId, id],
    // );

    await connection.query(
      `DELETE FROM chit_customers WHERE id = ?`,
      [id],
    );

    await AuditLog({
      connection,
      table: "chit_customers",
      recordId: id,
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || "Customer deleted",
    });

    await connection.commit();

    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(`chit customer delete error: ${err}`);
    await connection.rollback();
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    connection.release();
  }
};
