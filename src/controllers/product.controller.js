import db from "../config/db.js";

// CREATE TABLE products (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   product_name VARCHAR(150) NOT NULL,
//   quantity VARCHAR(50) NOT NULL,          -- 25kg, 50kg
//   price DECIMAL(10,2) NOT NULL,
//   stock INT NOT NULL,                      -- 100, 50
//   category VARCHAR(100),                  -- half boil, full boil
//   brand VARCHAR(100),                     -- surya, bullet
//   status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock',

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
// );

/**
 * CREATE PRODUCT
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      product_name,
      quantity,
      price,
      stock,
      category,
      brand,
      status,
    } = req.body;

    if (!product_name || !quantity || !price || stock == null) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [result] = await db.query(
      `INSERT INTO products
       (product_name, quantity, price, stock, category, brand, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        quantity,
        price,
        stock,
        category,
        brand,
        status || "in_stock",
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Product created successfully",
      product: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET ALL PRODUCTS
 */
export const getProducts = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET SINGLE PRODUCT
 */
export const getProductById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(rows[0]);
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

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    res.json({
      message: "Product updated successfully",
      product: rows[0],
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

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
};
