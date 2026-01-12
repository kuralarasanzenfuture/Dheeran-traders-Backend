import db from "../config/db.js";

/**
 * CREATE PRODUCT
 */
export const createProduct = async (req, res, next) => {
  try {
    const { product_name, brand, category, quantity, price } = req.body;

    if (!product_name || !brand || !category || !quantity || price == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [lastRow] = await db.query(`
      SELECT product_code FROM products ORDER BY id DESC LIMIT 1
    `);

    let nextNumber = 1;
    if (lastRow.length && lastRow[0].product_code) {
      nextNumber =
        parseInt(lastRow[0].product_code.split("-").pop(), 10) + 1;
    }

    const product_code = `DTT-PDT-${String(nextNumber).padStart(3, "0")}`;

    const [result] = await db.query(
      `
      INSERT INTO products
      (product_code, product_name, brand, category, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [product_code, product_name, brand, category, quantity, price]
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
    next(err);
  }
};

/**
 * GET ALL PRODUCTS
 */
/**
 * GET ALL PRODUCTS (WITH BRAND, CATEGORY, QUANTITY NAMES)
 */
export const getProducts = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id,
        p.product_code,
        p.product_name,
        b.name AS brand_name,
        c.name AS category_name,
        q.name AS quantity_name,
        p.price
      FROM products p
      LEFT JOIN brands b ON p.brand = b.id
      LEFT JOIN categories c ON p.category = c.id
      LEFT JOIN quantities q ON p.quantity = q.id
      ORDER BY p.id DESC
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
    const [[product]] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [req.params.id]
    );

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

    const [result] = await db.query(
      "UPDATE products SET ? WHERE id = ?",
      [req.body, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [[product]] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE PRODUCT
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const [result] = await db.query(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
};
