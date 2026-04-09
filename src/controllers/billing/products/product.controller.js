import db from "../../../config/db.js";

/**
 * CREATE PRODUCT
 */
// export const createProduct = async (req, res, next) => {
//   try {
//     let {
//       product_name,
//       brand,
//       category,
//       quantity,
//       price,
//       hsn_code = null,
//       cgst_rate = null,
//       sgst_rate = null,
//     } = req.body;

//     /* 🔴 REQUIRED */
//     if (!product_name || !brand || !category || !quantity || price === undefined) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     product_name = String(product_name).trim();
//     brand = String(brand).trim();
//     category = String(category).trim();
//     quantity = String(quantity).trim();

//     if (!product_name || !brand || !category || !quantity) {
//       return res.status(400).json({ message: "Fields cannot be empty" });
//     }

//     if (isNaN(price) || Number(price) <= 0) {
//       return res.status(400).json({ message: "Price must be positive number" });
//     }

//     /* GST OPTIONAL */
//     if (cgst_rate !== null && isNaN(cgst_rate)) {
//       return res.status(400).json({ message: "Invalid CGST" });
//     }
//     if (sgst_rate !== null && isNaN(sgst_rate)) {
//       return res.status(400).json({ message: "Invalid SGST" });
//     }

//     const gst_total_rate =
//       cgst_rate !== null && sgst_rate !== null
//         ? Number(cgst_rate) + Number(sgst_rate)
//         : null;

//     const [[lastRow]] = await db.query(
//       `SELECT product_code FROM products ORDER BY id DESC LIMIT 1`
//     );

//     let nextNumber = 1;
//     if (lastRow?.product_code) {
//       nextNumber = parseInt(lastRow.product_code.split("-").pop(), 10) + 1;
//     }

//     const product_code = `DTT-PDT-${String(nextNumber).padStart(3, "0")}`;

//     const [result] = await db.query(
//       `
//       INSERT INTO products
//       (product_code, product_name, brand, category, quantity, hsn_code,
//        cgst_rate, sgst_rate, gst_total_rate, price)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         product_code,
//         product_name,
//         brand,
//         category,
//         quantity,
//         hsn_code,
//         cgst_rate,
//         sgst_rate,
//         gst_total_rate,
//         price,
//       ]
//     );

//     const [[product]] = await db.query(
//       "SELECT * FROM products WHERE id = ?",
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Product created successfully",
//       product,
//     });
//   } catch (err) {
//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({
//         message:
//           "Product already exists with same name, brand, category and quantity",
//       });
//     }
//     next(err);
//   }
// };

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
// export const updateProduct = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const data = { ...req.body };

//     if (data.cgst_rate !== undefined && data.sgst_rate !== undefined) {
//       if (data.cgst_rate === null || data.sgst_rate === null) {
//         data.gst_total_rate = null;
//       } else {
//         data.gst_total_rate =
//           Number(data.cgst_rate) + Number(data.sgst_rate);
//       }
//     }

//     const [result] = await db.query("UPDATE products SET ? WHERE id = ?", [
//       data,
//       id,
//     ]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     const [[product]] = await db.query("SELECT * FROM products WHERE id = ?", [
//       id,
//     ]);

//     res.json({ message: "Product updated successfully", product });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * DELETE PRODUCT
 */
// export const deleteProduct = async (req, res, next) => {
//   try {
//     const [result] = await db.query("DELETE FROM products WHERE id = ?", [
//       req.params.id,
//     ]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     res.json({ message: "Product deleted successfully" });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * UPDATE PRODUCT STOCK
 */
// export const updateProductStock = async (req, res) => {
//   try {
//     const { stock } = req.body;
//     const { id } = req.params;

//     if (stock === undefined || isNaN(stock)) {
//       return res.status(400).json({ message: "Valid stock is required" });
//     }

//     const [result] = await db.query(
//       `UPDATE products SET stock = ? WHERE id = ?`,
//       [stock, id],
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     res.json({ message: "Stock updated successfully" });
//   } catch (err) {
//     console.error("Stock update error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// ----------------------------------- hard delete foreign key ------------------------------------------------------

// export const createProduct = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       product_name,
//       brand_id,
//       category_id,
//       quantity_id,
//       price,
//       hsn_code,
//       cgst_rate,
//       sgst_rate,
//       remarks,
//     } = req.body;

//     const userId = req.user?.id;

//     if (!product_name || !brand_id || !category_id || !quantity_id || !price) {
//       throw new Error(
//         `Missing fields ${!product_name ? "product_name" : ""} ${!brand_id ? "brand_id" : ""} ${!category_id ? "category_id" : ""} ${!quantity_id ? "quantity_id" : ""} ${!price ? "price" : ""}`,
//       );
//     }

//     // ✅ Validate relations
//     const [[valid]] = await connection.query(
//       `SELECT q.id
//        FROM quantities q
//        WHERE q.id = ? AND q.category_id = ?`,
//       [quantity_id, category_id],
//     );

//     if (!valid) throw new Error("Invalid quantity/category relation");

//     const gst_total_rate =
//       cgst_rate && sgst_rate ? Number(cgst_rate) + Number(sgst_rate) : null;

//     // ✅ Generate code
//     const [[last]] = await connection.query(
//       "SELECT product_code FROM products ORDER BY id DESC LIMIT 1",
//     );

//     let next = 1;
//     if (last?.product_code) {
//       next = parseInt(last.product_code.split("-").pop()) + 1;
//     }

//     const product_code = `PDT-${String(next).padStart(4, "0")}`;

//     const [result] = await connection.query(
//       `INSERT INTO products
//       (product_code, product_name, brand_id, category_id, quantity_id,
//        hsn_code, cgst_rate, sgst_rate, gst_total_rate, price, created_by)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         product_code,
//         product_name,
//         brand_id,
//         category_id,
//         quantity_id,
//         hsn_code,
//         cgst_rate,
//         sgst_rate,
//         gst_total_rate,
//         price,
//         userId,
//       ],
//     );

//     const id = result.insertId;

//     // ✅ AUDIT
//     await connection.query(
//       `INSERT INTO audit_logs
//        (table_name, record_id, action, new_data, changed_by, remarks)
//        VALUES (?, ?, 'INSERT', ?, ?, ?)`,
//       [
//         "products",
//         id,
//         JSON.stringify(req.body),
//         userId,
//         remarks || "Product created",
//       ],
//     );

//     await connection.commit();

//     res.status(201).json({ message: "Created", id });
//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };

// export const updateProduct = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const userId = req.user?.id;
//     const { remarks } = req.body;

//     const [[oldData]] = await connection.query(
//       "SELECT * FROM products WHERE id = ?",
//       [id]
//     );

//     if (!oldData) throw new Error("Product not found");

//     const data = { ...req.body };

//     if (data.cgst_rate !== undefined && data.sgst_rate !== undefined) {
//       data.gst_total_rate =
//         data.cgst_rate && data.sgst_rate
//           ? Number(data.cgst_rate) + Number(data.sgst_rate)
//           : null;
//     }

//     data.updated_by = userId;

//     await connection.query(
//       "UPDATE products SET ? WHERE id = ?",
//       [data, id]
//     );

//     const [[newData]] = await connection.query(
//       "SELECT * FROM products WHERE id = ?",
//       [id]
//     );

//     // ✅ AUDIT
//     await connection.query(
//       `INSERT INTO audit_logs
//        (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//        VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
//       [
//         "products",
//         id,
//         JSON.stringify(oldData),
//         JSON.stringify(newData),
//         userId,
//         remarks || "Product updated"
//       ]
//     );

//     await connection.commit();

//     res.json({ message: "Updated", data: newData });

//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };

// export const deleteProduct = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const { remarks } = req.body;
//     const userId = req.user?.id;

//     const [[oldData]] = await connection.query(
//       "SELECT * FROM products WHERE id = ?",
//       [id]
//     );

//     if (!oldData) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // ✅ AUDIT FIRST
//     await connection.query(
//       `INSERT INTO audit_logs
//        (table_name, record_id, action, old_data, changed_by, remarks)
//        VALUES (?, ?, 'DELETE', ?, ?, ?)`,
//       [
//         "products",
//         id,
//         JSON.stringify(oldData),
//         userId,
//         remarks || "Hard delete product"
//       ]
//     );

//     // ✅ HARD DELETE
//     await connection.query(
//       "DELETE FROM products WHERE id = ?",
//       [id]
//     );

//     await connection.commit();

//     res.json({ message: "Product permanently deleted" });

//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };
// ---------------------------------------- hard delete -------------------------------------------------------------------------------

export const createProduct = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      product_name,
      brand,
      category,
      quantity,
      price,
      hsn_code = null,
      cgst_rate = null,
      sgst_rate = null,
      remarks,
    } = req.body;

    const userId = req.user?.id;

    // ✅ VALIDATION
    if (!product_name || !brand || !category || !quantity || price === undefined) {
      throw new Error("Missing required fields");
    }

    // normalize (VERY IMPORTANT)
    product_name = product_name.trim();
    brand = brand.trim().toLowerCase();
    category = category.trim().toLowerCase();
    quantity = quantity.trim().toLowerCase();

    if (!product_name || !brand || !category || !quantity) {
      throw new Error("Fields cannot be empty");
    }

    if (isNaN(price) || Number(price) <= 0) {
      throw new Error("Invalid price");
    }

    const gst_total_rate =
      cgst_rate && sgst_rate
        ? Number(cgst_rate) + Number(sgst_rate)
        : null;

    // ✅ DUPLICATE CHECK (matches UNIQUE index)
    const [exists] = await connection.query(
      `SELECT id FROM products 
       WHERE product_name = ? AND brand = ? AND category = ? AND quantity = ?`,
      [product_name, brand, category, quantity]
    );

    if (exists.length) {
      throw new Error("Product already exists");
    }

    // ✅ CODE GENERATION
    const [[last]] = await connection.query(
      "SELECT product_code FROM products ORDER BY id DESC LIMIT 1"
    );

    let nextNum = 1;
    if (last?.product_code) {
      nextNum = parseInt(last.product_code.split("-").pop()) + 1;
    }

    const product_code = `DTT-PDT-${String(nextNum).padStart(4, "0")}`;

    // ✅ INSERT
    const [result] = await connection.query(
      `INSERT INTO products
      (product_code, product_name, brand, category, quantity,
       hsn_code, cgst_rate, sgst_rate, gst_total_rate, price, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        userId,
      ]
    );

    const id = result.insertId;

    // ✅ AUDIT (clean, minimal)
    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, new_data, changed_by, remarks)
       VALUES (?, ?, 'INSERT', ?, ?, ?)`,
      [
        "products",
        id,
        JSON.stringify({
          product_name,
          brand,
          category,
          quantity,
          price,
        }),
        userId,
        remarks || "Product created",
      ]
    );

    await connection.commit();

    res.status(201).json({ message: "Product created", id });

  } catch (err) {
    await connection.rollback();
    console.error(`Error creating product: ${err}`);
    next(err);
  } finally {
    connection.release();
  }
};

export const updateProduct = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body;

    const [[oldData]] = await connection.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (!oldData) throw new Error("Product not found");

    let data = { ...req.body };

    // normalize if present
    if (data.brand) data.brand = data.brand.trim().toLowerCase();
    if (data.category) data.category = data.category.trim().toLowerCase();
    if (data.quantity) data.quantity = data.quantity.trim().toLowerCase();
    if (data.product_name) data.product_name = data.product_name.trim();

    if (data.price && (isNaN(data.price) || Number(data.price) <= 0)) {
      throw new Error("Invalid price");
    }

    if (data.cgst_rate !== undefined && data.sgst_rate !== undefined) {
      data.gst_total_rate =
        Number(data.cgst_rate) + Number(data.sgst_rate);
    }

    data.updated_by = userId;

    await connection.query(
      "UPDATE products SET ? WHERE id = ?",
      [data, id]
    );

    const [[newData]] = await connection.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
       VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
      [
        "products",
        id,
        JSON.stringify(oldData),
        JSON.stringify(newData),
        userId,
        remarks || "Product updated",
      ]
    );

    await connection.commit();

    res.json({ message: "Updated", data: newData });

  } catch (err) {
    await connection.rollback();
    console.error(`❌ UPDATE PRODUCT ERROR: ${err.message}`);
    next(err);
  } finally {
    connection.release();
  }
};

export const deleteProduct = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    const [[oldData]] = await connection.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (!oldData) throw new Error("Product not found");

    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, old_data, changed_by, remarks)
       VALUES (?, ?, 'DELETE', ?, ?, ?)`,
      [
        "products",
        id,
        JSON.stringify(oldData),
        userId,
        remarks || "Hard delete",
      ]
    );

    await connection.query(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    await connection.commit();

    res.json({ message: "Deleted permanently" });

  } catch (err) {
    await connection.rollback();
    console.error("delete Product", err);
    next(err);
  } finally {
    connection.release();
  }
};

export const updateProductStock = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { stock, remarks } = req.body;
    const { id } = req.params;
    const userId = req.user?.id;

    if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
      throw new Error("Invalid stock");
    }

    const [[oldData]] = await connection.query(
      "SELECT stock FROM products WHERE id = ?",
      [id]
    );

    if (!oldData) throw new Error("Product not found");

    await connection.query(
      `UPDATE products SET stock = ?, updated_by = ? WHERE id = ?`,
      [stock, userId, id]
    );

    const change = Number(stock) - Number(oldData.stock);

    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
       VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
      [
        "products",
        id,
        JSON.stringify({ stock: oldData.stock }),
        JSON.stringify({ stock, change }),
        userId,
        remarks || `Stock ${oldData.stock} → ${stock}`,
      ]
    );

    await connection.commit();

    res.json({ message: "Stock updated", change });

  } catch (err) {
    await connection.rollback();
    console.error("Stock update error:", err);
    next(err);
  } finally {
    connection.release();
  }
};