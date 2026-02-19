import db from "../../config/db.js";

/**
 * CREATE CUSTOMER
 */
export const createCustomer = async (req, res) => {
  try {
    const { first_name, last_name, phone, email, address } = req.body;

    // ✅ Required fields validation
    if (!first_name || !phone) {
      return res.status(400).json({
        message: "First name and phone are required",
      });
    }

    // ✅ Duplicate phone / email check
    const [exists] = await db.query(
      `
      SELECT id FROM customers
      WHERE phone = ? OR email = ?
      `,
      [phone, email || null],
    );

    if (exists.length) {
      return res.status(409).json({
        message: "Customer with same phone or email already exists",
      });
    }

    // ✅ Insert customer
    const [result] = await db.query(
      `
      INSERT INTO customers
      (first_name, last_name, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
      `,
      [first_name, last_name, phone, email || null, address || null],
    );

    const [[customer]] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

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

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const { first_name, last_name, phone, email, address } = req.body;

    // ❌ No fields provided
    if (!first_name && !last_name && !phone && !email && !address) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // 🔍 Check exists
    const [[existingCustomer]] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );

    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // 📞 Phone validation
    if (phone && !/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // 📧 Email validation
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // 🚫 Duplicate phone
    if (phone) {
      const [phoneExists] = await db.query(
        "SELECT id FROM customers WHERE phone = ? AND id != ?",
        [phone, id],
      );
      if (phoneExists.length) {
        return res.status(409).json({ message: "Phone already in use" });
      }
    }

    // 🚫 Duplicate email
    if (email) {
      const [emailExists] = await db.query(
        "SELECT id FROM customers WHERE email = ? AND id != ?",
        [email, id],
      );
      if (emailExists.length) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    // 🧠 Safe values (no blanks)
    const updatedData = {
      first_name: first_name?.trim() || existingCustomer.first_name,
      last_name: last_name?.trim() || existingCustomer.last_name,
      phone: phone || existingCustomer.phone,
      email: email || existingCustomer.email,
      address: address?.trim() || existingCustomer.address,
    };

    // 📝 Update
    await db.query(
      `
      UPDATE customers
      SET
        first_name = ?,
        last_name = ?,
        phone = ?,
        email = ?,
        address = ?
      WHERE id = ?
      `,
      [
        updatedData.first_name,
        updatedData.last_name,
        updatedData.phone,
        updatedData.email,
        updatedData.address,
        id,
      ],
    );

    const [[updatedCustomer]] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );

    return res.json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE CUSTOMER
 */
export const deleteCustomer = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM customers WHERE id = ?", [
      req.params.id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
