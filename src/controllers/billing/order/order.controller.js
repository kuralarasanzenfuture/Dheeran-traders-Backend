import db from "../../../config/db.js";

// export const createOrder = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const { customer_id, employee_id, products, remarks } = req.body;

//     if (!customer_id || !employee_id || !Array.isArray(products) || products.length === 0) {
//       throw new Error("Invalid input");
//     }

//     /* ✅ CHECK CUSTOMER */
//     const [[customer]] = await conn.query(
//       `SELECT id, customer_name FROM customers WHERE id=?`,
//       [customer_id]
//     );
//     if (!customer) throw new Error("Customer not found");

//     /* ✅ CHECK EMPLOYEE */
//     const [[employee]] = await conn.query(
//       `SELECT id FROM employees_details WHERE id=?`,
//       [employee_id]
//     );
//     if (!employee) throw new Error("Employee not found");

//     /* 🔢 GENERATE ORDER NUMBER */
//     const [countRes] = await conn.query(`SELECT COUNT(*) AS count FROM customerOrders`);
//     const order_number = `ORD-${Date.now()}-${countRes[0].count + 1}`;

//     /* 🧾 CREATE ORDER */
//     const [orderResult] = await conn.query(
//       `INSERT INTO customerOrders
//       (order_number, customer_id, customer_name, employee_id, order_date, remarks)
//       VALUES (?, ?, ?, ?, CURDATE(), ?)`,
//       [order_number, customer_id, customer.customer_name, employee_id, remarks || null]
//     );

//     const order_id = orderResult.insertId;

//     /* 📦 INSERT PRODUCTS */
//     for (const item of products) {
//       const { product_id, quantity } = item;

//       if (!product_id || !quantity || quantity <= 0) {
//         throw new Error("Invalid product data");
//       }

//       /* ✅ CHECK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT id FROM products WHERE id=?`,
//         [product_id]
//       );

//       if (!product) throw new Error(`Product not found: ${product_id}`);

//       await conn.query(
//         `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
//          VALUES (?, ?, ?)`,
//         [order_id, product_id, quantity]
//       );
//     }

//     await conn.commit();

//     res.status(201).json({
//       message: "Order created successfully",
//       order_id,
//       order_number
//     });

//   } catch (err) {
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const createOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { customer_id, employee_id, products, remarks } = req.body;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const order_date = new Date().toISOString().slice(0, 10);

    if (
      !customer_id ||
      !employee_id ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      throw new Error("Invalid input");
    }

    /* ✅ CHECK CUSTOMER */
    const [[customer]] = await conn.query(
      `SELECT id, first_name AS customer_name FROM customers WHERE id=?`,
      [customer_id],
    );
    if (!customer) throw new Error("Customer not found");

    /* ✅ CHECK EMPLOYEE */
    const [[employee]] = await conn.query(
      `SELECT id FROM employees_details WHERE id=?`,
      [employee_id],
    );
    if (!employee) throw new Error("Employee not found");

    /* 🔢 SAFE ORDER NUMBER */
    const order_number = `ORD-${Date.now()}`;

    /* 🧾 CREATE ORDER */
    const [orderResult] = await conn.query(
      `INSERT INTO customerOrders 
      (order_number, customer_id, customer_name, employee_id, order_date, remarks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order_number,
        customer_id,
        customer.customer_name,
        employee_id,
        order_date,
        remarks || null,
        userId,
      ],
    );

    const order_id = orderResult.insertId;

    /* 📦 PREPARE BULK INSERT */
    const values = [];

    for (const item of products) {
      const qty = Number(item.quantity);

      if (!item.product_id || isNaN(qty) || qty <= 0) {
        throw new Error("Invalid product data");
      }

      /* ✅ CHECK PRODUCT */
      const [[product]] = await conn.query(
        `SELECT id FROM products WHERE id=?`,
        [item.product_id],
      );

      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }

      values.push([order_id, item.product_id, qty]);
    }

    /* 🚀 BULK INSERT (FAST) */
    await conn.query(
      `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
       VALUES ?`,
      [values],
    );

    await conn.commit();

    res.status(201).json({
      message: "Order created successfully",
      order_id,
      order_number,
    });
  } catch (err) {
    console.error("Create order error:", err.message);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const getOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.*,
        e.employee_name
      FROM customerOrders o
      LEFT JOIN employees_details e ON o.employee_id = e.id
      ORDER BY o.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Get orders error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await db.query(
      `SELECT * FROM customerOrders WHERE id=?`,
      [id],
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    const [products] = await db.query(
      `SELECT 
        op.*,
        p.product_name
       FROM customerOrderProducts op
       JOIN products p ON op.product_id = p.id
       WHERE op.order_id=?`,
      [id],
    );

    res.json({ order, products });
  } catch (err) {
    console.error("Get order error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// export const updateOrder = async (req, res) => {

// //   {
// // //   "status": "CONFIRMED",
// //   "products": [
// //     // { "product_id": 1, "quantity": 5 },
// //     { "product_id": 2, "quantity": 2 }
// //   ],
// //   "remarks":"products update"
// // }

//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const { id } = req.params;
//     const { products, status, remarks } = req.body;

//     const [[order]] = await conn.query(
//       `SELECT * FROM customerOrders WHERE id=? FOR UPDATE`,
//       [id]
//     );

//     if (!order) throw new Error("Order not found");

//     /* DELETE OLD PRODUCTS */
//     await conn.query(
//       `DELETE FROM customerOrderProducts WHERE order_id=?`,
//       [id]
//     );

//     /* INSERT NEW PRODUCTS */
//     for (const item of products) {
//       const [[product]] = await conn.query(
//         `SELECT id FROM products WHERE id=?`,
//         [item.product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       await conn.query(
//         `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
//          VALUES (?, ?, ?)`,
//         [id, item.product_id, item.quantity]
//       );
//     }

//     /* UPDATE ORDER */
//     await conn.query(
//       `UPDATE customerOrders
//        SET status=?, remarks=?
//        WHERE id=?`,
//       [status || order.status, remarks || null, id]
//     );

//     await conn.commit();

//     res.json({ message: "Order updated successfully" });

//   } catch (err) {
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const updateOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { products, status, remarks } = req.body;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    /* 🔒 LOCK ORDER */
    const [[order]] = await conn.query(
      `SELECT * FROM customerOrders WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!order) throw new Error("Order not found");

    if (order.status === "BILLED") {
      throw new Error("Cannot update billed order");
    }

    /* ⚠️ VALIDATE PRODUCTS */
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("Products required");
    }

    /* 🗑 DELETE OLD PRODUCTS */
    await conn.query(`DELETE FROM customerOrderProducts WHERE order_id=?`, [
      id,
    ]);

    /* 📦 PREPARE BULK INSERT */
    const values = [];

    for (const item of products) {
      const qty = Number(item.quantity);

      if (!item.product_id || isNaN(qty) || qty <= 0) {
        throw new Error("Invalid product data");
      }

      /* ✅ CHECK PRODUCT */
      const [[product]] = await conn.query(
        `SELECT id FROM products WHERE id=?`,
        [item.product_id],
      );

      if (!product) throw new Error(`Product not found: ${item.product_id}`);

      values.push([id, item.product_id, qty]);
    }

    /* 🚀 BULK INSERT */
    await conn.query(
      `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
       VALUES ?`,
      [values],
    );

    /* 📝 UPDATE ORDER */
    await conn.query(
      `UPDATE customerOrders 
       SET 
         status = ?, 
         remarks = ?, 
         updated_by = ?
       WHERE id = ?`,
      [status || order.status, remarks || null, userId, id],
    );

    await conn.commit();

    res.json({
      message: "Order updated successfully",
    });
  } catch (err) {
    console.error("Update order error:", err.message);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`DELETE FROM customerOrders WHERE id=?`, [
      id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete order error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const confirmOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    /* 🔒 LOCK ORDER */
    const [[order]] = await conn.query(
      `SELECT status FROM customerOrders WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!order) throw new Error("Order not found");

    /* ❌ PREVENT INVALID STATUS CHANGE */
    if (order.status === "CANCELLED") {
      throw new Error("Cancelled order cannot be confirmed");
    }

    if (order.status === "BILLED") {
      throw new Error("Already billed order cannot be confirmed");
    }

    if (order.status === "CONFIRMED") {
      return res.json({ message: "Order already confirmed" });
    }

    /* ✅ UPDATE STATUS */
    await conn.query(
      `UPDATE customerOrders
       SET status='CONFIRMED', updated_by=?
       WHERE id=?`,
      [userId, id]
    );

    await conn.commit();

    res.json({
      message: "Order confirmed successfully",
    });

  } catch (err) {
    console.error("Confirm order error:", err.message);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const updateOrderStatus = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    if (!status) throw new Error("Status is required");

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "DELIVERED",
      "BILLED",
      "CANCELLED"
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    /* 🔒 LOCK ORDER */
    const [[order]] = await conn.query(
      `SELECT status FROM customerOrders WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!order) throw new Error("Order not found");

    const currentStatus = order.status;

    /* ❌ PREVENT SAME STATUS */
    if (currentStatus === status) {
      return res.json({ message: `Order already ${status}` });
    }

    /* ❌ FINAL STATES */
    if (currentStatus === "CANCELLED") {
      throw new Error("Cancelled order cannot be updated");
    }

    if (currentStatus === "BILLED") {
      throw new Error("Billed order cannot be updated");
    }

    /* ✅ STATUS FLOW VALIDATION */
    const allowedTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["DELIVERED", "BILLED", "CANCELLED"],
      DELIVERED: ["BILLED"],
    };

    if (
      allowedTransitions[currentStatus] &&
      !allowedTransitions[currentStatus].includes(status)
    ) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${status}`
      );
    }

    /* ✅ UPDATE STATUS */
    await conn.query(
      `UPDATE customerOrders
       SET status=?, updated_by=?
       WHERE id=?`,
      [status, userId, id]
    );

    await conn.commit();

    res.json({
      message: `Order status updated to ${status}`,
    });

  } catch (err) {
    console.error("Update order status error:", err.message);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
