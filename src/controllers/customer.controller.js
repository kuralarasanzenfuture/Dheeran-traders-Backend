import db from "../config/db.js";

/**
 * CREATE CUSTOMER
 */
export const createCustomer = async (req, res, next) => {
  try {
    const {
      customer_name,
      product_id,
      product_name,
      product_brand,
      product_quantity,
      phone,
      email,
      address,
      payment_mode,
      advance_pay,
      pending_pay,
      stock,
    } = req.body;

    if (
      !customer_name ||
      !product_id ||
      !product_name ||
      !product_quantity ||
      !phone ||
      !payment_mode ||
      stock == null
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [result] = await db.query(
      `INSERT INTO customers (
        customer_name,
        product_id,
        product_name,
        product_brand,
        product_quantity,
        phone,
        email,
        address,
        payment_mode,
        advance_pay,
        pending_pay,
        stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_name,
        product_id,
        product_name,
        product_brand,
        product_quantity,
        phone,
        email,
        address,
        payment_mode,
        advance_pay || 0,
        pending_pay || 0,
        stock,
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Customer created successfully",
      customer: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET ALL CUSTOMERS
 */
export const getCustomers = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM customers ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET SINGLE CUSTOMER
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE CUSTOMER
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE customers SET ? WHERE id = ?",
      [req.body, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    res.json({
      message: "Customer updated successfully",
      customer: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE CUSTOMER
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "DELETE FROM customers WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    next(err);
  }
};
