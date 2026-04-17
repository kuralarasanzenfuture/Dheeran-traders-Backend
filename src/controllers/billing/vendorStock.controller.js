import db from "../../config/db.js";

// add fields entry_id

// export const createVendorStock = async (req, res) => {
//   const conn = await db.getConnection();
//   try {
//     const { vendor_name, vendor_phone, entry_date, entry_time, products } =
//       req.body;

//     if (
//       !vendor_name ||
//       !vendor_phone ||
//       !entry_date ||
//       !entry_time ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       return res.status(400).json({ message: "Invalid vendor stock data" });
//     }

//     if (!/^\d{10,15}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     await conn.beginTransaction();

//     /* 🔢 GENERATE ENTRY ID (ONCE) */
//     const [[row]] = await conn.query(
//       `SELECT COALESCE(MAX(entry_id), 0) + 1 AS next_entry_id FROM vendor_stocks FOR UPDATE`,
//     );
//     const entry_id = row.next_entry_id;

//     for (const item of products) {
//       const { product_id, product_quantity, total_stock } = item;

//       if (!product_id || !product_quantity || total_stock <= 0) {
//         throw new Error("Invalid product entry");
//       }

//       /* 🔒 LOCK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
//         [product_id],
//       );

//       if (!product) throw new Error("Product not found");

//       /* 📦 INSERT SNAPSHOT */
//       await conn.query(
//         `
//         INSERT INTO vendor_stocks
//         (entry_id, vendor_name, vendor_phone,
//          product_id, product_name, product_brand,
//          product_category, product_quantity,
//          total_stock, entry_date, entry_time)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           entry_id,
//           vendor_name,
//           vendor_phone,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           product_quantity,
//           total_stock,
//           entry_date,
//           entry_time,
//         ],
//       );

//       /* ➕ UPDATE PRODUCT STOCK */
//       await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
//         total_stock,
//         product_id,
//       ]);
//     }

//     /* 🔁 FETCH FULL ENTRY */
//     const [items] = await conn.query(
//       `SELECT * FROM vendor_stocks WHERE entry_id = ? ORDER BY id`,
//       [entry_id],
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Vendor stock entry created",
//       entry_id,
//       vendor: {
//         name: vendor_name,
//         phone: vendor_phone,
//         entry_date,
//         entry_time,
//       },
//       items,
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error("Vendor stock error:", err.message);
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

/**
 * GET ALL VENDOR STOCK ENTRIES
 */
export const getVendorStocks = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM vendor_stocks
      ORDER BY entry_date DESC, entry_time DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Get vendor stocks error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET SINGLE VENDOR STOCK BY ID
 */
export const getVendorStockById = async (req, res) => {
  try {
    const [[stock]] = await db.query(
      "SELECT * FROM vendor_stocks WHERE id = ?",
      [req.params.id],
    );

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Get vendor stock error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// export const updateVendorStock = async (req, res) => {
//   const conn = await db.getConnection();
//   try {
//     const { id } = req.params;
//     const {
//       vendor_name,
//       vendor_phone,
//       product_name,
//       product_brand,
//       product_category,
//       product_quantity,
//       total_stock,
//       entry_date,
//       entry_time,
//     } = req.body;

//     if (
//       !vendor_name ||
//       !vendor_phone ||
//       !product_name ||
//       !product_brand ||
//       !product_category ||
//       !product_quantity ||
//       total_stock == null ||
//       !entry_date ||
//       !entry_time
//     ) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     if (isNaN(total_stock) || total_stock < 0) {
//       return res.status(400).json({ message: "Invalid stock" });
//     }

//     await conn.beginTransaction();

//     const [[oldRow]] = await conn.query(
//       `SELECT product_id, total_stock FROM vendor_stocks WHERE id = ?`,
//       [id],
//     );

//     if (!oldRow) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     const diff = total_stock - oldRow.total_stock;

//     await conn.query(
//       `
//       UPDATE vendor_stocks
//       SET
//         vendor_name=?,
//         vendor_phone=?,
//         product_name=?,
//         product_brand=?,
//         product_category=?,
//         product_quantity=?,
//         total_stock=?,
//         entry_date=?,
//         entry_time=?
//       WHERE id=?
//       `,
//       [
//         vendor_name,
//         vendor_phone,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,
//         total_stock,
//         entry_date,
//         entry_time,
//         id,
//       ],
//     );

//     await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
//       diff,
//       oldRow.product_id,
//     ]);

//     await conn.commit();

//     res.json({ message: "Vendor stock updated & product stock adjusted" });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

/**
 * ADD STOCK (INCREMENT LOGIC)
 */
// export const addVendorStock = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { stock_added } = req.body;

//     if (stock_added == null || isNaN(stock_added) || stock_added <= 0) {
//       return res.status(400).json({ message: "Valid stock_added required" });
//     }

//     const [result] = await db.query(
//       `
//       UPDATE vendor_stocks
//       SET total_stock = total_stock + ?
//       WHERE id = ?
//       `,
//       [stock_added, id],
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     const [[stock]] = await db.query(
//       "SELECT * FROM vendor_stocks WHERE id = ?",
//       [id],
//     );

//     res.json({
//       message: "Stock added successfully",
//       stock,
//     });
//   } catch (error) {
//     console.error("Add vendor stock error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const deleteVendorStock = async (req, res) => {
//   const conn = await db.getConnection();
//   try {
//     const { id } = req.params;

//     await conn.beginTransaction();

//     const [[row]] = await conn.query(
//       `SELECT product_id, total_stock FROM vendor_stocks WHERE id = ?`,
//       [id],
//     );

//     if (!row) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     await conn.query(`DELETE FROM vendor_stocks WHERE id = ?`, [id]);

//     await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
//       row.total_stock,
//       row.product_id,
//     ]);

//     await conn.commit();

//     res.json({ message: "Vendor stock deleted & product stock reduced" });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const deleteVendorEntry = async (req, res) => {
//   const conn = await db.getConnection();
//   try {
//     const { entry_id } = req.params;

//     await conn.beginTransaction();

//     const [rows] = await conn.query(
//       `SELECT product_id, total_stock FROM vendor_stocks WHERE entry_id = ?`,
//       [entry_id],
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Entry not found" });
//     }

//     for (const row of rows) {
//       await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
//         row.total_stock,
//         row.product_id,
//       ]);
//     }

//     await conn.query(`DELETE FROM vendor_stocks WHERE entry_id = ?`, [
//       entry_id,
//     ]);

//     await conn.commit();

//     res.json({ message: "Vendor entry deleted", entry_id });
//   } catch (err) {
//     await conn.rollback();
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// -------------------------------- hard delete -------------------------------------------------------------

// export const createVendorStock = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const {
//       vendor_id,
//       vendor_name,
//       vendor_phone,
//       entry_date,
//       entry_time,
//       products,
//       remarks,
//     } = req.body;

//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     /* =========================
//        VALIDATION
//     ========================= */
//     if (
//       !vendor_id ||
//       !vendor_name ||
//       !vendor_phone ||
//       !entry_date ||
//       !entry_time ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       return res.status(400).json({ message: "Invalid vendor stock data" });
//     }

//     if (!/^\d{10,15}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     await conn.beginTransaction();

//     /* =========================
//        VERIFY VENDOR EXISTS
//     ========================= */
//     const [[vendor]] = await conn.query(
//       `SELECT id FROM vendors WHERE id = ? FOR UPDATE`,
//       [vendor_id],
//     );

//     if (!vendor) {
//       throw new Error("Vendor not found");
//     }

//     /* =========================
//        SAFE ENTRY ID (LOCKED)
//     ========================= */
//     const [[row]] = await conn.query(
//       `SELECT COALESCE(MAX(entry_id), 0) + 1 AS next_entry_id FROM vendor_stocks FOR UPDATE`,
//     );
//     const entry_id = row.next_entry_id;

//     const insertedItems = [];

//     /* =========================
//        PROCESS PRODUCTS
//     ========================= */
//     for (const item of products) {
//       const { product_id, product_quantity, total_stock } = item;

//       if (!product_id || !product_quantity || total_stock <= 0) {
//         throw new Error("Invalid product entry");
//       }

//       /* 🔒 LOCK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT id, product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
//         [product_id],
//       );

//       if (!product) throw new Error(`Product not found: ${product_id}`);

//       /* 📦 INSERT SNAPSHOT */
//       await conn.query(
//         `INSERT INTO vendor_stocks
//         (entry_id, vendor_id, vendor_name, vendor_phone,
//          product_id, product_name, product_brand,
//          product_category, product_quantity,
//          total_stock, entry_date, entry_time, created_by)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           entry_id,
//           vendor_id,
//           vendor_name,
//           vendor_phone,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           product_quantity,
//           total_stock,
//           entry_date,
//           entry_time,
//           userId,
//         ],
//       );

//       /* ➕ UPDATE PRODUCT STOCK */
//       await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
//         total_stock,
//         product_id,
//       ]);

//       insertedItems.push({
//         product_id,
//         quantity: product_quantity,
//         stock_added: total_stock,
//       });
//     }

//     /* =========================
//        AUDIT LOG
//     ========================= */
//     await conn.query(
//       `INSERT INTO audit_logs
//        (table_name, record_id, action, new_data, changed_by, remarks)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [
//         "vendor_stocks",
//         entry_id,
//         "INSERT",
//         JSON.stringify({
//           vendor_id,
//           items: insertedItems,
//         }),
//         userId,
//         remarks || "Vendor stock entry created",
//       ],
//     );

//     /* =========================
//        FETCH RESULT
//     ========================= */
//     const [items] = await conn.query(
//       `SELECT * FROM vendor_stocks WHERE entry_id = ? ORDER BY id`,
//       [entry_id],
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Vendor stock entry created",
//       entry_id,
//       vendor: {
//         id: vendor_id,
//         name: vendor_name,
//         phone: vendor_phone,
//         entry_date,
//         entry_time,
//       },
//       items,
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error("Vendor stock error:", err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

// export const updateVendorStock = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const { id } = req.params;
//     const {
//       vendor_id,
//       vendor_name,
//       vendor_phone,
//       product_name,
//       product_brand,
//       product_category,
//       product_quantity,
//       total_stock,
//       entry_date,
//       entry_time,
//       remarks,
//     } = req.body;

//     const userId = req.user?.id;

//     /* ========= VALIDATION ========= */
//     const errors = [];
//     if (!vendor_id) errors.push("vendor_id is required");
//     if (!vendor_name) errors.push("vendor_name is required");
//     if (!vendor_phone) errors.push("vendor_phone is required");
//     if (!product_name) errors.push("product_name is required");
//     if (!product_brand) errors.push("product_brand is required");
//     if (!product_category) errors.push("product_category is required");
//     if (!product_quantity) errors.push("product_quantity is required");
//     if (total_stock == null) errors.push("total_stock is required");
//     if (!entry_date) errors.push("entry_date is required");
//     if (!entry_time) errors.push("entry_time is required");

//     if (total_stock != null && (isNaN(total_stock) || total_stock < 0)) {
//       errors.push("total_stock must be >= 0");
//     }

//     if (!/^\d{10,15}$/.test(vendor_phone)) {
//       errors.push("Invalid vendor_phone");
//     }

//     if (errors.length > 0) {
//       return res.status(400).json({ message: "Validation failed", errors });
//     }

//     await conn.beginTransaction();

//     /* 🔒 LOCK ROW */
//     const [[oldRow]] = await conn.query(
//       `SELECT * FROM vendor_stocks WHERE id = ? FOR UPDATE`,
//       [id],
//     );

//     if (!oldRow) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     const diff = total_stock - oldRow.total_stock;

//     /* 🚨 PREVENT NEGATIVE STOCK */
//     const [[product]] = await conn.query(
//       `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
//       [oldRow.product_id],
//     );

//     if (!product) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Product not found" });
//     }

//     if (product.stock + diff < 0) {
//       await conn.rollback();
//       return res.status(400).json({
//         message: "Stock cannot go negative",
//       });
//     }

//     /* UPDATE */
//     await conn.query(
//       `UPDATE vendor_stocks SET
//         vendor_id=?,
//         vendor_name=?,
//         vendor_phone=?,
//         product_name=?,
//         product_brand=?,
//         product_category=?,
//         product_quantity=?,
//         total_stock=?,
//         entry_date=?,
//         entry_time=?
//        WHERE id=?`,
//       [
//         vendor_id,
//         vendor_name,
//         vendor_phone,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,
//         total_stock,
//         entry_date,
//         entry_time,
//         id,
//       ],
//     );

//     /* UPDATE PRODUCT STOCK */
//     await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
//       diff,
//       oldRow.product_id,
//     ]);

//     /* AUDIT */
//     await conn.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//       VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
//       [
//         "vendor_stocks",
//         id,
//         JSON.stringify(oldRow),
//         JSON.stringify({ total_stock }),
//         userId,
//         remarks || "Vendor stock updated",
//       ],
//     );

//     await conn.commit();

//     res.json({ message: "Vendor stock updated successfully" });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const addVendorStock = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const { id } = req.params;
//     const { stock_added, remarks } = req.body;
//     const userId = req.user?.id;

//     if (!stock_added || isNaN(stock_added) || stock_added <= 0) {
//       return res.status(400).json({ message: "Valid stock_added required" });
//     }

//     await conn.beginTransaction();

//     const [[row]] = await conn.query(
//       `SELECT * FROM vendor_stocks WHERE id = ? FOR UPDATE`,
//       [id],
//     );

//     if (!row) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     await conn.query(
//       `UPDATE vendor_stocks SET total_stock = total_stock + ? WHERE id = ?`,
//       [stock_added, id],
//     );

//     await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
//       stock_added,
//       row.product_id,
//     ]);

//     /* AUDIT */
//     await conn.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, new_data, changed_by, remarks)
//       VALUES (?, ?, 'UPDATE', ?, ?, ?)`,
//       [
//         "vendor_stocks",
//         id,
//         JSON.stringify({ stock_added }),
//         userId,
//         remarks || "Vendor stock added",
//       ],
//     );

//     await conn.commit();

//     res.json({ message: "Stock added successfully" });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const deleteVendorStock = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const { id } = req.params;

//     const { remarks } = req.body || {};

//     const userId = req.user?.id;

//     if (!id || isNaN(id)) {
//       return res
//         .status(400)
//         .json({ message: "Id required and must be a number" });
//     }

//     await conn.beginTransaction();

//     const [[row]] = await conn.query(
//       `SELECT * FROM vendor_stocks WHERE id = ? FOR UPDATE`,
//       [id],
//     );

//     if (!row) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     const [[product]] = await conn.query(
//       `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
//       [row.product_id],
//     );

//     if (product.stock - row.total_stock < 0) {
//       await conn.rollback();
//       return res.status(400).json({
//         message: "Cannot delete. Stock will go negative",
//       });
//     }

//     await conn.query(`DELETE FROM vendor_stocks WHERE id = ?`, [id]);

//     await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
//       row.total_stock,
//       row.product_id,
//     ]);

//     /* AUDIT */
//     await conn.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, changed_by, remarks)
//       VALUES (?, ?, 'DELETE', ?, ?, ?)`,
//       [
//         "vendor_stocks",
//         id,
//         JSON.stringify(row),
//         userId,
//         remarks || "Vendor stock deleted",
//       ],
//     );

//     await conn.commit();

//     res.json({ message: "Vendor stock deleted" });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// export const deleteVendorEntry = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const { entry_id } = req.params;

//     const { remarks } = req.body || {};

//     const userId = req.user?.id;

//     if (!entry_id || isNaN(entry_id)) {
//       return res
//         .status(400)
//         .json({ message: "Id required and must be a number" });
//     }

//     if (userId == null) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     await conn.beginTransaction();

//     const [rows] = await conn.query(
//       `SELECT * FROM vendor_stocks WHERE entry_id = ? FOR UPDATE`,
//       [entry_id],
//     );

//     if (!rows.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Entry not found" });
//     }

//     for (const row of rows) {
//       const [[product]] = await conn.query(
//         `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
//         [row.product_id],
//       );

//       if (product.stock - row.total_stock < 0) {
//         await conn.rollback();
//         return res.status(400).json({
//           message: "Stock will go negative. Cannot delete entry",
//         });
//       }

//       await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
//         row.total_stock,
//         row.product_id,
//       ]);
//     }

//     await conn.query(`DELETE FROM vendor_stocks WHERE entry_id = ?`, [
//       entry_id,
//     ]);

//     /* AUDIT */
//     await conn.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, changed_by, remarks)
//       VALUES (?, ?, 'DELETE', ?, ?, ?)`,
//       [
//         "vendor_stocks",
//         entry_id,
//         JSON.stringify(rows),
//         userId,
//         remarks || "Vendor entry deleted",
//       ],
//     );

//     await conn.commit();

//     res.json({ message: "Vendor entry deleted", entry_id });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

/*-------------------------------- implementation -stocks with inventory service-----------------------------------------------------*/

export const createVendorStock = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      vendor_id,
      vendor_name,
      vendor_phone,
      entry_date,
      entry_time,
      products,
      remarks,
    } = req.body;

    console.log(req.body);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    /* =========================
       VALIDATION
    ========================= */
    if (
      !vendor_id ||
      !vendor_name ||
      !vendor_phone ||
      !entry_date ||
      !entry_time ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({ message: "Invalid vendor stock data" });
    }

    if (!/^\d{10,15}$/.test(vendor_phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    await conn.beginTransaction();

    /* =========================
       VERIFY VENDOR EXISTS
    ========================= */
    const [[vendor]] = await conn.query(
      `SELECT id FROM vendors WHERE id = ? FOR UPDATE`,
      [vendor_id],
    );

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    /* =========================
       SAFE ENTRY ID (LOCKED)
    ========================= */
    const [[row]] = await conn.query(
      `SELECT COALESCE(MAX(entry_id), 0) + 1 AS next_entry_id FROM vendor_stocks FOR UPDATE`,
    );
    const entry_id = row.next_entry_id;

    const insertedItems = [];

    /* =========================
       PROCESS PRODUCTS
    ========================= */
    for (const item of products) {
      const { product_id, product_quantity, total_stock } = item;

      if (!product_id || !product_quantity || total_stock <= 0) {
        throw new Error("Invalid product entry");
      }

      /* 🔒 LOCK PRODUCT */
      const [[product]] = await conn.query(
        `SELECT id, product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
        [product_id],
      );

      if (!product) throw new Error(`Product not found: ${product_id}`);

      /* 📦 INSERT SNAPSHOT */
      await conn.query(
        `INSERT INTO vendor_stocks
        (entry_id, vendor_id, vendor_name, vendor_phone,
         product_id, product_name, product_brand,
         product_category, product_quantity,
         total_stock, entry_date, entry_time, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry_id,
          vendor_id,
          vendor_name,
          vendor_phone,
          product_id,
          product.product_name,
          product.brand,
          product.category,
          product_quantity,
          total_stock,
          entry_date,
          entry_time,
          userId,
        ],
      );

      /* ➕ UPDATE PRODUCT STOCK */
      await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
        total_stock,
        product_id,
      ]);

      insertedItems.push({
        product_id,
        quantity: product_quantity,
        stock_added: total_stock,
      });
    }

    /* =========================
       AUDIT LOG
    ========================= */
    await conn.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, new_data, changed_by, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "vendor_stocks",
        entry_id,
        "INSERT",
        JSON.stringify({
          vendor_id,
          items: insertedItems,
        }),
        userId,
        remarks || "Vendor stock entry created",
      ],
    );

    /* =========================
       FETCH RESULT
    ========================= */
    const [items] = await conn.query(
      `SELECT * FROM vendor_stocks WHERE entry_id = ? ORDER BY id`,
      [entry_id],
    );

    await conn.commit();

    res.status(201).json({
      message: "Vendor stock entry created",
      entry_id,
      vendor: {
        id: vendor_id,
        name: vendor_name,
        phone: vendor_phone,
        entry_date,
        entry_time,
      },
      items,
    });
  } catch (err) {
    await conn.rollback();
    console.error("Vendor stock error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const updateVendorStock = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;
    const { total_stock, remarks } = req.body;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");
    if (total_stock == null || isNaN(total_stock) || total_stock < 0) {
      throw new Error("Invalid total_stock");
    }

    await conn.beginTransaction();

    /* 🔒 LOCK STOCK ROW */
    const [[oldRow]] = await conn.query(
      `SELECT * FROM vendor_stocks WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!oldRow) throw new Error("Stock not found");

    const diff = Number(total_stock) - Number(oldRow.total_stock);

    /* 🔒 LOCK PRODUCT */
    const [[product]] = await conn.query(
      `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
      [oldRow.product_id],
    );

    if (!product) throw new Error("Product not found");

    if (product.stock + diff < 0) {
      throw new Error("Stock cannot go negative");
    }

    /* UPDATE vendor_stocks */
    await conn.query(`UPDATE vendor_stocks SET total_stock = ? WHERE id = ?`, [
      total_stock,
      id,
    ]);

    /* UPDATE product stock */
    const newStock = product.stock + diff;

    await conn.query(
      `UPDATE products SET stock = ?, updated_by = ? WHERE id = ?`,
      [newStock, userId, oldRow.product_id],
    );

    /* LEDGER ENTRY */
    await conn.query(
      `INSERT INTO billing_stock_inventory_ledger
      (product_id, change_qty, balance_after, reference_type, reference_id, remarks, created_by)
      VALUES (?, ?, ?, 'VENDOR_STOCK', ?, ?, ?)`,
      [
        oldRow.product_id,
        diff,
        newStock,
        id,
        remarks || `Vendor stock update ${oldRow.total_stock} → ${total_stock}`,
        userId,
      ],
    );

    /* AUDIT */
    await conn.query(
      `INSERT INTO audit_logs
      (table_name, record_id, action, old_data, new_data, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "vendor_stocks",
        id,
        "UPDATE",
        JSON.stringify(oldRow),
        JSON.stringify({ total_stock }),
        userId,
        remarks || "Vendor stock updated",
      ],
    );

    await conn.commit();

    res.json({ message: "Vendor stock updated", diff });
  } catch (err) {
    await conn.rollback();
    console.error("UPDATE ERROR:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const addVendorStock = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;
    const { stock_added, remarks } = req.body;
    const userId = req.user?.id;

    if (!stock_added || isNaN(stock_added) || stock_added <= 0) {
      throw new Error("Invalid stock_added");
    }

    await conn.beginTransaction();

    const [[row]] = await conn.query(
      `SELECT * FROM vendor_stocks WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!row) throw new Error("Stock not found");

    const [[product]] = await conn.query(
      `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
      [row.product_id],
    );

    const newStock = product.stock + Number(stock_added);

    /* UPDATE */
    await conn.query(
      `UPDATE vendor_stocks SET total_stock = total_stock + ? WHERE id = ?`,
      [stock_added, id],
    );

    await conn.query(
      `UPDATE products SET stock = ?, updated_by = ? WHERE id = ?`,
      [newStock, userId, row.product_id],
    );

    /* LEDGER */
    await conn.query(
      `INSERT INTO billing_stock_inventory_ledger
      (product_id, change_qty, balance_after, reference_type, reference_id, remarks, created_by)
      VALUES (?, ?, ?, 'VENDOR_STOCK', ?, ?, ?)`,
      [
        row.product_id,
        stock_added,
        newStock,
        id,
        remarks || "Stock added",
        userId,
      ],
    );

    /* AUDIT */
    await conn.query(
      `INSERT INTO audit_logs
      (table_name, record_id, action, new_data, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "vendor_stocks",
        "UPDATE",
        id,
        JSON.stringify({ stock_added }),
        userId,
        remarks || "Vendor stock added",
      ],
    );

    await conn.commit();

    res.json({ message: "Stock added" });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteVendorStock = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;
    const userId = req.user?.id;

    await conn.beginTransaction();

    const [[row]] = await conn.query(
      `SELECT * FROM vendor_stocks WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!row) throw new Error("Stock not found");

    const [[product]] = await conn.query(
      `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
      [row.product_id],
    );

    if (product.stock - row.total_stock < 0) {
      throw new Error("Stock will go negative");
    }

    const newStock = product.stock - row.total_stock;

    await conn.query(`DELETE FROM vendor_stocks WHERE id = ?`, [id]);

    await conn.query(
      `UPDATE products SET stock = ?, updated_by = ? WHERE id = ?`,
      [newStock, userId, row.product_id],
    );

    /* LEDGER */
    await conn.query(
      `INSERT INTO billing_stock_inventory_ledger
      (product_id, change_qty, balance_after, reference_type, reference_id, remarks, created_by)
      VALUES (?, ?, ?, 'VENDOR_STOCK', ?, ?, ?)`,
      [
        row.product_id,
        -row.total_stock,
        newStock,
        id,
        "Delete vendor stock",
        userId,
      ],
    );

    /* AUDIT */
    await conn.query(
      `INSERT INTO audit_logs
      (table_name, record_id, action, old_data, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "vendor_stocks",
        id,
        "DELETE",
        JSON.stringify(row),
        userId,
        "Vendor stock deleted",
      ],
    );

    await conn.commit();

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE VENDOR STOCK ERROR:", err);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteVendorEntry = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { entry_id } = req.params;
    const userId = req.user?.id;

    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM vendor_stocks WHERE entry_id = ? FOR UPDATE`,
      [entry_id],
    );

    if (!rows.length) throw new Error("Entry not found");

    for (const row of rows) {
      const [[product]] = await conn.query(
        `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
        [row.product_id],
      );

      if (product.stock - row.total_stock < 0) {
        throw new Error("Stock will go negative");
      }

      const newStock = product.stock - row.total_stock;

      await conn.query(
        `UPDATE products SET stock = ?, updated_by = ? WHERE id = ?`,
        [newStock, userId, row.product_id],
      );

      /* LEDGER */
      await conn.query(
        `INSERT INTO billing_stock_inventory_ledger
        (product_id, change_qty, balance_after, reference_type, reference_id, remarks, created_by)
        VALUES (?, ?, ?, 'VENDOR_STOCK', ?, ?, ?)`,
        [
          row.product_id,
          -row.total_stock,
          newStock,
          entry_id,
          "Delete entry",
          userId,
        ],
      );
    }

    await conn.query(`DELETE FROM vendor_stocks WHERE entry_id = ?`, [
      entry_id,
    ]);

    /* AUDIT */
    await conn.query(
      `INSERT INTO audit_logs
      (table_name, record_id, action, old_data, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "vendor_stocks",
        entry_id,
        "DELETE",
        JSON.stringify(rows),
        userId,
        "Vendor entry deleted",
      ],
    );

    await conn.commit();

    res.json({ message: "Entry deleted" });
  } catch (err) {
    console.error("DELETE VENDOR ENTRY ERROR:", err);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
