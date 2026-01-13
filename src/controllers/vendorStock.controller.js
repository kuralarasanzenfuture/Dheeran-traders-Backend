import db from "../config/db.js";

/**
 * CREATE / ADD VENDOR STOCK (NEW VISIT)
 */
export const createVendorStock = async (req, res) => {
  try {
    const {
      vendor_name,
      vendor_phone,
      product_id,
      product_name,
      product_brand,
      product_category,
      product_quantity,
      total_stock,
    } = req.body;

    // ✅ Validation
    if (
      !vendor_name ||
      !vendor_phone ||
      !product_id ||
      !product_name ||
      !product_brand ||
      !product_category ||
      !product_quantity ||
      total_stock == null
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!/^\d{10}$/.test(vendor_phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (isNaN(total_stock) || total_stock <= 0) {
      return res.status(400).json({ message: "Stock must be greater than 0" });
    }

    // ✅ Insert (ALLOW DUPLICATES — EACH VISIT IS A NEW ROW)
    const [result] = await db.query(
      `
      INSERT INTO vendor_stocks
      (vendor_name, vendor_phone, product_id, product_name,
       product_brand, product_category, product_quantity, total_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vendor_name,
        vendor_phone,
        product_id,
        product_name,
        product_brand,
        product_category,
        product_quantity,
        total_stock,
      ]
    );

    const [[stock]] = await db.query(
      "SELECT * FROM vendor_stocks WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Vendor stock added successfully",
      stock,
    });
  } catch (error) {
    console.error("Create vendor stock error:", error);
    res.status(500).json({ message: "Server error" });
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
      [req.params.id]
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
 * UPDATE VENDOR STOCK (CORRECTION ONLY)
 */
export const updateVendorStock = async (req, res) => {
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
    } = req.body;

    // ✅ Validation
    if (
      !vendor_name ||
      !vendor_phone ||
      !product_name ||
      !product_brand ||
      !product_category ||
      !product_quantity ||
      total_stock == null ||
      isNaN(total_stock) ||
      total_stock < 0
    ) {
      return res.status(400).json({
        message: "All fields with valid total_stock are required",
      });
    }

    // ✅ Ensure record exists
    const [[exists]] = await db.query(
      "SELECT id FROM vendor_stocks WHERE id = ?",
      [id]
    );

    if (!exists) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // ✅ Update
    await db.query(
      `
      UPDATE vendor_stocks
      SET
        vendor_name = ?,
        vendor_phone = ?,
        product_name = ?,
        product_brand = ?,
        product_category = ?,
        product_quantity = ?,
        total_stock = ?
      WHERE id = ?
      `,
      [
        vendor_name,
        vendor_phone,
        product_name,
        product_brand,
        product_category,
        product_quantity,
        total_stock,
        id,
      ]
    );

    const [[stock]] = await db.query(
      "SELECT * FROM vendor_stocks WHERE id = ?",
      [id]
    );

    res.json({
      message: "Stock updated successfully",
      stock,
    });
  } catch (error) {
    console.error("Update vendor stock error:", error);
    res.status(500).json({ message: "Server error" });
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
      [stock_added, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Stock not found" });
    }

    const [[stock]] = await db.query(
      "SELECT * FROM vendor_stocks WHERE id = ?",
      [id]
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
export const deleteVendorStock = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM vendor_stocks WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Stock not found" });
    }

    res.json({ message: "Vendor stock deleted successfully" });
  } catch (error) {
    console.error("Delete vendor stock error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
