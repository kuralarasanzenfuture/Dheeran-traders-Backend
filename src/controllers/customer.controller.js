import db from "../config/db.js";

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
      [phone, email || null]
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
      [first_name, last_name, phone, email || null, address || null]
    );

    const [[customer]] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [result.insertId]
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

/**
 * GET ALL CUSTOMERS
 */
export const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM customers ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Get customers error:", error);
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
      [req.params.id]
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

/**
 * UPDATE CUSTOMER
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, email, address } = req.body;

    

    

    // ✅ Prevent duplicate phone/email
    if (phone || email) {
      const [exists] = await db.query(
        `
        SELECT id FROM customers
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
      `
      UPDATE customers
      SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address)
      WHERE id = ?
      `,
      [
        first_name,
        last_name,
        phone,
        email,
        address,
        id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const [[customer]] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    res.json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE CUSTOMER
 */
export const deleteCustomer = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM customers WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
