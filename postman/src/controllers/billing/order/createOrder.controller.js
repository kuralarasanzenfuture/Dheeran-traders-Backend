import db from "../../../config/db.js";

export const createOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const {
      customer_id,
      expected_delivery_date,
      products,
      remarks,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const order_date = new Date().toISOString().slice(0, 10);

    /* ✅ VALIDATION */
    if (
      !customer_id ||
      !expected_delivery_date ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      throw new Error("Invalid input");
    }

    /* ✅ CHECK CUSTOMER */
    const [[customer]] = await conn.query(
      `SELECT id, CONCAT(first_name, ' ', COALESCE(last_name,'')) AS customer_name 
       FROM customers 
       WHERE id = ?`,
      [customer_id]
    );

    if (!customer) throw new Error("Customer not found");

    /* 🔢 GENERATE ORDER NUMBER */
    const order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    /* 🧾 INSERT ORDER */
    const [orderResult] = await conn.query(
      `INSERT INTO customerOrders 
      (order_number, customer_id, customer_name, order_date, expected_delivery_date, remarks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order_number,
        customer_id,
        customer.customer_name,
        order_date,
        expected_delivery_date,
        remarks || null,
        userId,
      ]
    );

    const order_id = orderResult.insertId;

    /* 📦 VALIDATE PRODUCTS (OPTIMIZED) */
    const productIds = products.map((p) => p.product_id);

    const [dbProducts] = await conn.query(
      `SELECT id FROM products WHERE id IN (?)`,
      [productIds]
    );

    if (dbProducts.length !== productIds.length) {
      throw new Error("Some products not found");
    }

    /* 📦 PREPARE BULK INSERT */
    const values = [];

    for (const item of products) {
      const qty = Number(item.quantity);

      if (!item.product_id || isNaN(qty) || qty <= 0) {
        throw new Error("Invalid product data");
      }

      values.push([order_id, item.product_id, qty]);
    }

    /* 🚀 INSERT ORDER PRODUCTS */
    await conn.query(
      `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
       VALUES ?`,
      [values]
    );

    /* ✅ COMMIT */
    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order_id,
        order_number,
      },
    });

  } catch (err) {
    console.error("Create order error:", err.message);

    await conn.rollback();

    res.status(400).json({
      success: false,
      message: err.message,
    });

  } finally {
    conn.release();
  }
};


