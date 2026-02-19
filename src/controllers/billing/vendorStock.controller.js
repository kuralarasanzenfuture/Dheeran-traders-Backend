import db from "../../config/db.js";

// add fields entry_id

export const createVendorStock = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { vendor_name, vendor_phone, entry_date, entry_time, products } =
      req.body;

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

    if (!/^\d{10,15}$/.test(vendor_phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    await conn.beginTransaction();

    /* 🔢 GENERATE ENTRY ID (ONCE) */
    const [[row]] = await conn.query(
      `SELECT COALESCE(MAX(entry_id), 0) + 1 AS next_entry_id FROM vendor_stocks FOR UPDATE`,
    );
    const entry_id = row.next_entry_id;

    for (const item of products) {
      const { product_id, product_quantity, total_stock } = item;

      if (!product_id || !product_quantity || total_stock <= 0) {
        throw new Error("Invalid product entry");
      }

      /* 🔒 LOCK PRODUCT */
      const [[product]] = await conn.query(
        `SELECT product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
        [product_id],
      );

      if (!product) throw new Error("Product not found");

      /* 📦 INSERT SNAPSHOT */
      await conn.query(
        `
        INSERT INTO vendor_stocks
        (entry_id, vendor_name, vendor_phone,
         product_id, product_name, product_brand,
         product_category, product_quantity,
         total_stock, entry_date, entry_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          entry_id,
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
        ],
      );

      /* ➕ UPDATE PRODUCT STOCK */
      await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
        total_stock,
        product_id,
      ]);
    }

    /* 🔁 FETCH FULL ENTRY */
    const [items] = await conn.query(
      `SELECT * FROM vendor_stocks WHERE entry_id = ? ORDER BY id`,
      [entry_id],
    );

    await conn.commit();

    res.status(201).json({
      message: "Vendor stock entry created",
      entry_id,
      vendor: {
        name: vendor_name,
        phone: vendor_phone,
        entry_date,
        entry_time,
      },
      items,
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
      [id],
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
      ],
    );

    await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
      diff,
      oldRow.product_id,
    ]);

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

export const deleteVendorStock = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    const [[row]] = await conn.query(
      `SELECT product_id, total_stock FROM vendor_stocks WHERE id = ?`,
      [id],
    );

    if (!row) {
      await conn.rollback();
      return res.status(404).json({ message: "Stock not found" });
    }

    await conn.query(`DELETE FROM vendor_stocks WHERE id = ?`, [id]);

    await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
      row.total_stock,
      row.product_id,
    ]);

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

export const deleteVendorEntry = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { entry_id } = req.params;

    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT product_id, total_stock FROM vendor_stocks WHERE entry_id = ?`,
      [entry_id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Entry not found" });
    }

    for (const row of rows) {
      await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
        row.total_stock,
        row.product_id,
      ]);
    }

    await conn.query(`DELETE FROM vendor_stocks WHERE entry_id = ?`, [
      entry_id,
    ]);

    await conn.commit();

    res.json({ message: "Vendor entry deleted", entry_id });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};
