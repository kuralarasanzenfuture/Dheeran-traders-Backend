import db from "../config/db.js";

/**
 * CREATE VENDOR STOCK
 */
// export const createVendorStock = async (req, res) => {
//   try {
//     const {
//       vendor_name,
//       vendor_phone,
//       product_id,
//       product_name,
//       product_brand,
//       product_category,
//       product_quantity,
//       total_stock,
//     } = req.body;

//     // ✅ Validation
//     if (
//       !vendor_name ||
//       !vendor_phone ||
//       !product_id ||
//       !product_name ||
//       !product_brand ||
//       !product_category ||
//       !product_quantity ||
//       total_stock == null
//     ) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     if (!/^\d{10}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     if (isNaN(total_stock) || total_stock <= 0) {
//       return res.status(400).json({ message: "Stock must be greater than 0" });
//     }

//     // ✅ Insert (ALLOW DUPLICATES — EACH VISIT IS A NEW ROW)
//     const [result] = await db.query(
//       `
//       INSERT INTO vendor_stocks
//       (vendor_name, vendor_phone, product_id, product_name,
//        product_brand, product_category, product_quantity, total_stock)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         vendor_name,
//         vendor_phone,
//         product_id,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,
//         total_stock,
//       ]
//     );

//     const [[stock]] = await db.query(
//       "SELECT * FROM vendor_stocks WHERE id = ?",
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Vendor stock added successfully",
//       stock,
//     });
//   } catch (error) {
//     console.error("Create vendor stock error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const createVendorStock = async (req, res) => {
//   try {
//     const {
//       vendor_name,
//       vendor_phone,
//       product_id,
//       product_name,
//       product_brand,
//       product_category,
//       product_quantity,
//       total_stock,
//       entry_date,
//       entry_time,
//     } = req.body;

//     // ✅ Required validation
//     if (
//       !vendor_name ||
//       !vendor_phone ||
//       !product_id ||
//       !product_name ||
//       !product_brand ||
//       !product_category ||
//       !product_quantity ||
//       total_stock == null ||
//       !entry_date ||
//       !entry_time
//     ) {
//       return res.status(400).json({
//         message: "All fields including entry_date and entry_time are required",
//       });
//     }

//     // ✅ Phone validation
//     if (!/^\d{10}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     // ✅ Stock validation
//     if (isNaN(total_stock) || total_stock <= 0) {
//       return res.status(400).json({
//         message: "Stock must be greater than 0",
//       });
//     }

//     // ✅ Date format validation
//     if (isNaN(Date.parse(entry_date))) {
//       return res.status(400).json({ message: "Invalid entry_date format" });
//     }

//     // ✅ Insert (each visit = new row)
//     const [result] = await db.query(
//       `
//       INSERT INTO vendor_stocks
//       (vendor_name, vendor_phone, product_id, product_name,
//        product_brand, product_category, product_quantity,
//        total_stock, entry_date, entry_time)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         vendor_name,
//         vendor_phone,
//         product_id,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,
//         total_stock,
//         entry_date,
//         entry_time,
//       ],
//     );

//     const [[stock]] = await db.query(
//       "SELECT * FROM vendor_stocks WHERE id = ?",
//       [result.insertId],
//     );

//     res.status(201).json({
//       message: "Vendor stock added successfully",
//       stock,
//     });
//   } catch (error) {
//     console.error("Create vendor stock error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// ✅ Insert (each visit = new row at a time)
// export const createVendorStock = async (req, res) => {
//   const conn = await db.getConnection();
//   try {
//     const {
//       vendor_name,
//       vendor_phone,
//       product_id,
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
//       !product_id ||
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

//     if (!/^\d{10}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     if (isNaN(total_stock) || total_stock <= 0) {
//       return res.status(400).json({ message: "Stock must be > 0" });
//     }

//     await conn.beginTransaction();

//     // insert vendor stock snapshot
//     const [result] = await conn.query(
//       `
//       INSERT INTO vendor_stocks
//       (vendor_name, vendor_phone, product_id, product_name,
//        product_brand, product_category, product_quantity,
//        total_stock, entry_date, entry_time)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         vendor_name,
//         vendor_phone,
//         product_id,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,
//         total_stock,
//         entry_date,
//         entry_time,
//       ]
//     );

//     // update product stock
//     await conn.query(
//       `UPDATE products SET stock = stock + ? WHERE id = ?`,
//       [total_stock, product_id]
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Vendor stock added & product stock updated",
//       id: result.insertId,
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

// insert more data at a time
// export const createVendorStock = async (req, res) => {
//   const conn = await db.getConnection();
//   try {
//     const {
//       vendor_name,
//       vendor_phone,
//       entry_date,
//       entry_time,
//       products
//     } = req.body;

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

//     if (!/^\d{10}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     await conn.beginTransaction();

//     for (const item of products) {
//       const { product_id, product_quantity, total_stock } = item;

//       if (!product_id || !product_quantity || total_stock <= 0) {
//         throw new Error("Invalid product entry");
//       }

//       /* 🔒 LOCK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
//         [product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       /* 📦 SNAPSHOT ENTRY */
//       await conn.query(
//         `
//         INSERT INTO vendor_stocks
//         (vendor_name, vendor_phone, product_id, product_name,
//          product_brand, product_category, product_quantity,
//          total_stock, entry_date, entry_time)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
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
//         ]
//       );

//       /* ➕ UPDATE PRODUCT STOCK */
//       await conn.query(
//         `UPDATE products SET stock = stock + ? WHERE id = ?`,
//         [total_stock, product_id]
//       );
//     }

//     await conn.commit();

//     res.status(201).json({
//       message: "Vendor stock added for multiple products",
//       total_products: products.length,

//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error("Vendor stock error:", err.message);
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const createVendorStock = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      vendor_name,
      vendor_phone,
      entry_date,
      entry_time,
      products
    } = req.body;

    if (
      !vendor_name ||
      !vendor_phone ||
      !entry_date ||
      !entry_time ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({ message: "Invalid vendor stock data" });
    }

    if (!/^\d{10}$/.test(vendor_phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    await conn.beginTransaction();

    for (const item of products) {
      const { product_id, product_quantity, total_stock } = item;

      if (!product_id || !product_quantity || total_stock <= 0) {
        throw new Error("Invalid product entry");
      }

      /* 🔒 LOCK PRODUCT */
      const [[product]] = await conn.query(
        `SELECT product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
        [product_id]
      );

      if (!product) throw new Error("Product not found");

      /* 📦 INSERT SNAPSHOT */
      await conn.query(
        `
        INSERT INTO vendor_stocks
        (vendor_name, vendor_phone, product_id, product_name,
         product_brand, product_category, product_quantity,
         total_stock, entry_date, entry_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
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
        ]
      );

      /* ➕ UPDATE STOCK */
      await conn.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [total_stock, product_id]
      );
    }

    /* 🔁 FETCH INSERTED SNAPSHOTS */
    const [vendorStocks] = await conn.query(
      `
      SELECT *
      FROM vendor_stocks
      WHERE vendor_name = ?
        AND vendor_phone = ?
        AND entry_date = ?
        AND entry_time = ?
      ORDER BY id DESC
      `,
      [vendor_name, vendor_phone, entry_date, entry_time]
    );

    /* 🔁 FETCH UPDATED PRODUCT STOCK */
    const productIds = products.map(p => p.product_id);

    const [updatedProducts] = await conn.query(
      `
      SELECT id, product_name, stock
      FROM products
      WHERE id IN (?)
      `,
      [productIds]
    );

    await conn.commit();

    res.status(201).json({
      message: "Vendor stock added successfully",
      vendor: {
        name: vendor_name,
        phone: vendor_phone,
        entry_date,
        entry_time
      },
      items: vendorStocks,
      updated_products: updatedProducts
    });
  } catch (err) {
    await conn.rollback();
    console.error("Vendor stock error:", err.message);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};



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

/**
 * UPDATE VENDOR STOCK
 */
// export const updateVendorStock = async (req, res) => {
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
//     } = req.body;

//     // ✅ Validation
//     if (
//       !vendor_name ||
//       !vendor_phone ||
//       !product_name ||
//       !product_brand ||
//       !product_category ||
//       !product_quantity ||
//       total_stock == null ||
//       isNaN(total_stock) ||
//       total_stock < 0
//     ) {
//       return res.status(400).json({
//         message: "All fields with valid total_stock are required",
//       });
//     }

//     // ✅ Ensure record exists
//     const [[exists]] = await db.query(
//       "SELECT id FROM vendor_stocks WHERE id = ?",
//       [id]
//     );

//     if (!exists) {
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     // ✅ Update
//     await db.query(
//       `
//       UPDATE vendor_stocks
//       SET
//         vendor_name = ?,
//         vendor_phone = ?,
//         product_name = ?,
//         product_brand = ?,
//         product_category = ?,
//         product_quantity = ?,
//         total_stock = ?
//       WHERE id = ?
//       `,
//       [
//         vendor_name,
//         vendor_phone,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,
//         total_stock,
//         id,
//       ]
//     );

//     const [[stock]] = await db.query(
//       "SELECT * FROM vendor_stocks WHERE id = ?",
//       [id]
//     );

//     res.json({
//       message: "Stock updated successfully",
//       stock,
//     });
//   } catch (error) {
//     console.error("Update vendor stock error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const updateVendorStock = async (req, res) => {
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

//     // ✅ Required fields validation
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
//       return res.status(400).json({
//         message: "All fields including entry_date and entry_time are required",
//       });
//     }

//     // ✅ Phone validation
//     if (!/^\d{10}$/.test(vendor_phone)) {
//       return res.status(400).json({ message: "Invalid phone number" });
//     }

//     // ✅ Stock validation
//     if (isNaN(total_stock) || total_stock < 0) {
//       return res.status(400).json({
//         message: "Total stock must be a valid number",
//       });
//     }

//     // ✅ Date validation
//     if (isNaN(Date.parse(entry_date))) {
//       return res.status(400).json({ message: "Invalid entry_date format" });
//     }

//     // ✅ Time validation (HH:MM or HH:MM:SS)
//     if (!/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(entry_time)) {
//       return res.status(400).json({ message: "Invalid entry_time format" });
//     }

//     // ✅ Check existence
//     const [[exists]] = await db.query(
//       "SELECT id FROM vendor_stocks WHERE id = ?",
//       [id],
//     );

//     if (!exists) {
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     // ✅ Update
//     await db.query(
//       `
//       UPDATE vendor_stocks
//       SET
//         vendor_name = ?,
//         vendor_phone = ?,
//         product_name = ?,
//         product_brand = ?,
//         product_category = ?,
//         product_quantity = ?,
//         total_stock = ?,
//         entry_date = ?,
//         entry_time = ?
//       WHERE id = ?
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

//     const [[stock]] = await db.query(
//       "SELECT * FROM vendor_stocks WHERE id = ?",
//       [id],
//     );

//     res.json({
//       message: "Vendor stock updated successfully",
//       stock,
//     });
//   } catch (error) {
//     console.error("Update vendor stock error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const updateVendorStock = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      vendor_name,
      vendor_phone,
      product_name,
      product_brand,
      product_category,
      product_quantity,
      total_stock,
      entry_date,
      entry_time,
    } = req.body;

    if (
      !vendor_name ||
      !vendor_phone ||
      !product_name ||
      !product_brand ||
      !product_category ||
      !product_quantity ||
      total_stock == null ||
      !entry_date ||
      !entry_time
    ) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (isNaN(total_stock) || total_stock < 0) {
      return res.status(400).json({ message: "Invalid stock" });
    }

    await conn.beginTransaction();

    const [[oldRow]] = await conn.query(
      `SELECT product_id, total_stock FROM vendor_stocks WHERE id = ?`,
      [id]
    );

    if (!oldRow) {
      await conn.rollback();
      return res.status(404).json({ message: "Stock not found" });
    }

    const diff = total_stock - oldRow.total_stock;

    await conn.query(
      `
      UPDATE vendor_stocks
      SET
        vendor_name=?,
        vendor_phone=?,
        product_name=?,
        product_brand=?,
        product_category=?,
        product_quantity=?,
        total_stock=?,
        entry_date=?,
        entry_time=?
      WHERE id=?
      `,
      [
        vendor_name,
        vendor_phone,
        product_name,
        product_brand,
        product_category,
        product_quantity,
        total_stock,
        entry_date,
        entry_time,
        id,
      ]
    );

    await conn.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [diff, oldRow.product_id]
    );

    await conn.commit();

    res.json({ message: "Vendor stock updated & product stock adjusted" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};


/**
 * ADD STOCK (INCREMENT LOGIC)
 */
export const addVendorStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_added } = req.body;

    if (stock_added == null || isNaN(stock_added) || stock_added <= 0) {
      return res.status(400).json({ message: "Valid stock_added required" });
    }

    const [result] = await db.query(
      `
      UPDATE vendor_stocks
      SET total_stock = total_stock + ?
      WHERE id = ?
      `,
      [stock_added, id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Stock not found" });
    }

    const [[stock]] = await db.query(
      "SELECT * FROM vendor_stocks WHERE id = ?",
      [id],
    );

    res.json({
      message: "Stock added successfully",
      stock,
    });
  } catch (error) {
    console.error("Add vendor stock error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE VENDOR STOCK
 */
// export const deleteVendorStock = async (req, res) => {
//   try {
//     const [result] = await db.query("DELETE FROM vendor_stocks WHERE id = ?", [
//       req.params.id,
//     ]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Stock not found" });
//     }

//     res.json({ message: "Vendor stock deleted successfully" });
//   } catch (error) {
//     console.error("Delete vendor stock error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const deleteVendorStock = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    const [[row]] = await conn.query(
      `SELECT product_id, total_stock FROM vendor_stocks WHERE id = ?`,
      [id]
    );

    if (!row) {
      await conn.rollback();
      return res.status(404).json({ message: "Stock not found" });
    }

    await conn.query(`DELETE FROM vendor_stocks WHERE id = ?`, [id]);

    await conn.query(
      `UPDATE products SET stock = stock - ? WHERE id = ?`,
      [row.total_stock, row.product_id]
    );

    await conn.commit();

    res.json({ message: "Vendor stock deleted & product stock reduced" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};
