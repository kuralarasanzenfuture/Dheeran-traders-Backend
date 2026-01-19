import db from "../config/db.js";

/**
 * CREATE PRODUCT
 */
export const createProduct = async (req, res, next) => {
  try {
    let { product_name, brand, category, quantity, price } = req.body;

    /* ===============================
       BASIC VALIDATION
    ================================ */
    if (
      !product_name ||
      !brand ||
      !category ||
      !quantity ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // product_name = product_name.trim();
    // brand = brand.trim();
    // category = category.trim();
    // quantity = quantity.trim();

    product_name = String(product_name).trim();
    brand = String(brand).trim();
    category = String(category).trim();
    quantity = String(quantity).trim();

    if (!product_name || !brand || !category || !quantity) {
      return res.status(400).json({
        message: "Fields cannot be empty",
      });
    }

    if (isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({
        message: "Price must be a valid positive number",
      });
    }

    /* ===============================
       GENERATE PRODUCT CODE
    ================================ */
    const [[lastRow]] = await db.query(`
      SELECT product_code
      FROM products
      ORDER BY id DESC
      LIMIT 1
    `);

    let nextNumber = 1;
    if (lastRow?.product_code) {
      nextNumber = parseInt(lastRow.product_code.split("-").pop(), 10) + 1;
    }

    const product_code = `DTT-PDT-${String(nextNumber).padStart(3, "0")}`;

    /* ===============================
       INSERT PRODUCT
    ================================ */
    const [result] = await db.query(
      `
      INSERT INTO products
      (product_code, product_name, brand, category, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [product_code, product_name, brand, category, quantity, price],
    );

    /* ===============================
       FETCH CREATED PRODUCT
    ================================ */
    const [[product]] = await db.query("SELECT * FROM products WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    /* ===============================
       HANDLE DUPLICATE ENTRY
    ================================ */
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Product already exists with the same name, brand, category and quantity",
      });
    }

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
    // const [rows] = await db.query(`
    //   SELECT
    //     p.id,
    //     p.product_code,
    //     p.product_name,
    //     b.name AS brand_name,
    //     c.name AS category_name,
    //     q.name AS quantity_name,
    //     p.price
    //   FROM products p
    //   LEFT JOIN brands b ON p.brand = b.id
    //   LEFT JOIN categories c ON p.category = c.id
    //   LEFT JOIN quantities q ON p.quantity = q.id
    //   ORDER BY p.id DESC
    // `);

    const [rows] = await db.query(`
          SELECT
      id,
      product_code,
      product_name,
      brand AS brand_name,
      category AS category_name,
      quantity AS quantity_name,
      price
    FROM products
    ORDER BY id DESC;
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

    const [result] = await db.query("UPDATE products SET ? WHERE id = ?", [
      req.body,
      id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [[product]] = await db.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

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
