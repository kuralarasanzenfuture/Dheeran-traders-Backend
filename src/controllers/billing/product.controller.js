import db from "../../config/db.js";

/**
 * CREATE PRODUCT
 */
/**
 * CREATE PRODUCT
 */
export const createProduct = async (req, res, next) => {
  try {
    let {
      product_name,
      brand,
      category,
      quantity,
      price,
      hsn_code = null,
      cgst_rate = null,
      sgst_rate = null,
    } = req.body;

    /* 🔴 REQUIRED */
    if (!product_name || !brand || !category || !quantity || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    product_name = String(product_name).trim();
    brand = String(brand).trim();
    category = String(category).trim();
    quantity = String(quantity).trim();

    if (!product_name || !brand || !category || !quantity) {
      return res.status(400).json({ message: "Fields cannot be empty" });
    }

    if (isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be positive number" });
    }

    /* GST OPTIONAL */
    if (cgst_rate !== null && isNaN(cgst_rate)) {
      return res.status(400).json({ message: "Invalid CGST" });
    }
    if (sgst_rate !== null && isNaN(sgst_rate)) {
      return res.status(400).json({ message: "Invalid SGST" });
    }

    const gst_total_rate =
      cgst_rate !== null && sgst_rate !== null
        ? Number(cgst_rate) + Number(sgst_rate)
        : null;

    const [[lastRow]] = await db.query(
      `SELECT product_code FROM products ORDER BY id DESC LIMIT 1`
    );

    let nextNumber = 1;
    if (lastRow?.product_code) {
      nextNumber = parseInt(lastRow.product_code.split("-").pop(), 10) + 1;
    }

    const product_code = `DTT-PDT-${String(nextNumber).padStart(3, "0")}`;

    const [result] = await db.query(
      `
      INSERT INTO products
      (product_code, product_name, brand, category, quantity, hsn_code,
       cgst_rate, sgst_rate, gst_total_rate, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product_code,
        product_name,
        brand,
        category,
        quantity,
        hsn_code,
        cgst_rate,
        sgst_rate,
        gst_total_rate,
        price,
      ]
    );

    const [[product]] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Product already exists with same name, brand, category and quantity",
      });
    }
    next(err);
  }
};

/**
 * GET ALL PRODUCTS
 */
export const getProducts = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        product_code,
        product_name,
        brand,
        category,
        quantity,
        hsn_code,
        cgst_rate,
        sgst_rate,
        gst_total_rate,
        price,
        stock
      FROM products
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET PRODUCT BY ID
 */
export const getProductById = async (req, res, next) => {
  try {
    const [[product]] = await db.query("SELECT * FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE PRODUCT
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if (data.cgst_rate !== undefined && data.sgst_rate !== undefined) {
      if (data.cgst_rate === null || data.sgst_rate === null) {
        data.gst_total_rate = null;
      } else {
        data.gst_total_rate =
          Number(data.cgst_rate) + Number(data.sgst_rate);
      }
    }

    const [result] = await db.query("UPDATE products SET ? WHERE id = ?", [
      data,
      id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [[product]] = await db.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE PRODUCT
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const [result] = await db.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE PRODUCT STOCK
 */
export const updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;
    const { id } = req.params;

    if (stock === undefined || isNaN(stock)) {
      return res.status(400).json({ message: "Valid stock is required" });
    }

    const [result] = await db.query(
      `UPDATE products SET stock = ? WHERE id = ?`,
      [stock, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Stock updated successfully" });
  } catch (err) {
    console.error("Stock update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};