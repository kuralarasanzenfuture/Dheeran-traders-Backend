import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";
import { applyStockChange } from "../../../services/billing/inventory.service.js";
import { generateInvoiceNumber } from "../../../utils/generateInvoiceNumberBilling.js";

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

// export const createOrder = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const {
//       customer_id,
//       employee_id,
//       expected_delivery_date,
//       products,
//       remarks,
//     } = req.body;

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     const order_date = new Date().toISOString().slice(0, 10);

//     if (
//       !customer_id ||
//       !employee_id ||
//       !expected_delivery_date ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       throw new Error("Invalid input");
//     }

//     /* ✅ CHECK CUSTOMER */
//     const [[customer]] = await conn.query(
//       `SELECT id, first_name AS customer_name FROM customers WHERE id=?`,
//       [customer_id],
//     );
//     if (!customer) throw new Error("Customer not found");

//     /* ✅ CHECK EMPLOYEE */
//     const [[employee]] = await conn.query(
//       `SELECT id FROM employees_details WHERE id=?`,
//       [employee_id],
//     );
//     if (!employee) throw new Error("Employee not found");

//     /* 🔢 SAFE ORDER NUMBER */
//     const order_number = `ORD-${Date.now()}`;

//     /* 🧾 CREATE ORDER */
//     const [orderResult] = await conn.query(
//       `INSERT INTO customerOrders
//       (order_number, customer_id, customer_name, employee_id, order_date, expected_delivery_date, remarks, created_by)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         order_number,
//         customer_id,
//         customer.customer_name,
//         employee_id,
//         order_date,
//         expected_delivery_date,
//         remarks || null,
//         userId,
//       ],
//     );

//     const order_id = orderResult.insertId;

//     /* 📦 PREPARE BULK INSERT */
//     const values = [];

//     for (const item of products) {
//       const qty = Number(item.quantity);

//       if (!item.product_id || isNaN(qty) || qty <= 0) {
//         throw new Error("Invalid product data");
//       }

//       /* ✅ CHECK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT id FROM products WHERE id=?`,
//         [item.product_id],
//       );

//       if (!product) {
//         throw new Error(`Product not found: ${item.product_id}`);
//       }

//       values.push([order_id, item.product_id, qty]);
//     }

//     /* 🚀 BULK INSERT (FAST) */
//     await conn.query(
//       `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
//        VALUES ?`,
//       [values],
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Order created successfully",
//       order_id,
//       order_number,
//     });
//   } catch (err) {
//     console.error("Create order error:", err.message);
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

/* --- remove employee id --- */
// export const createOrder = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const {
//       customer_id,
//       expected_delivery_date,
//       products,
//       remarks,
//     } = req.body;

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     const order_date = new Date().toISOString().slice(0, 10);

//     if (
//       !customer_id ||
//       !expected_delivery_date ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       throw new Error("Invalid input");
//     }

//     /* ✅ CHECK CUSTOMER */
//     const [[customer]] = await conn.query(
//       `SELECT id, first_name FROM customers WHERE id=?`,
//       [customer_id]
//     );

//     if (!customer) throw new Error("Customer not found");

//     /* 🔢 SAFE ORDER NUMBER */
//     const order_number = `ORD-${Date.now()}`;

//     /* 🧾 CREATE ORDER */
//     const [orderResult] = await conn.query(
//       `INSERT INTO customerOrders
//       (order_number, customer_id, customer_name, order_date, expected_delivery_date, remarks, created_by)
//       VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [
//         order_number,
//         customer_id,
//         customer.first_name,
//         order_date,
//         expected_delivery_date,
//         remarks || null,
//         userId,
//       ]
//     );

//     const order_id = orderResult.insertId;

//     /* 📦 PREPARE BULK INSERT */
//     const values = [];

//     for (const item of products) {
//       const qty = Number(item.quantity);

//       if (!item.product_id || isNaN(qty) || qty <= 0) {
//         throw new Error("Invalid product data");
//       }

//       /* ✅ CHECK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT id FROM products WHERE id=?`,
//         [item.product_id]
//       );

//       if (!product) {
//         throw new Error(`Product not found: ${item.product_id}`);
//       }

//       values.push([order_id, item.product_id, qty]);
//     }

//     /* 🚀 BULK INSERT */
//     await conn.query(
//       `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
//        VALUES ?`,
//       [values]
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Order created successfully",
//       order_id,
//       order_number,
//     });

//   } catch (err) {
//     console.error("Create order error:", err.message);
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

/*-- improve version --- */

export const createOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { customer_id, expected_delivery_date, products, remarks } = req.body;

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
      [customer_id],
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
      ],
    );

    const order_id = orderResult.insertId;

    /* 📦 VALIDATE PRODUCTS (OPTIMIZED) */
    const productIds = products.map((p) => p.product_id);

    // 🔴 DUPLICATE CHECK
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      throw new Error("Duplicate product_id not allowed");
    }

    const [dbProducts] = await conn.query(
      `SELECT id FROM products WHERE id IN (?)`,
      [productIds],
    );

    if (dbProducts.length !== productIds.length) {
      throw new Error("Some products not found");
    }

    /* 📦 PREPARE BULK INSERT */
    const values = [];

    // for (const item of products) {
    //   const qty = Number(item.quantity);

    //   if (!item.product_id || isNaN(qty) || qty <= 0) {
    //     throw new Error("Invalid product data");
    //   }

    //   values.push([order_id, item.product_id, qty]);
    // }

    // /* 🚀 INSERT ORDER PRODUCTS */
    // await conn.query(
    //   `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
    //    VALUES ?`,
    //   [values],
    // );

    for (const item of products) {
      const qty = Number(item.quantity);
      const total = Number(item.total_amount);

      if (
        !item.product_id ||
        isNaN(qty) ||
        qty <= 0 ||
        isNaN(total) ||
        total <= 0
      ) {
        throw new Error("Invalid product data");
      }

      values.push([order_id, item.product_id, qty, total]);
    }

    /* 🚀 INSERT ORDER PRODUCTS */
    await conn.query(
      `INSERT INTO customerOrderProducts 
   (order_id, product_id, quantity, total_amount)
   VALUES ?`,
      [values],
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

// export const getOrders = async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT
//         o.*,
//         e.employee_name
//       FROM customerOrders o
//       LEFT JOIN employees_details e ON o.employee_id = e.id
//       ORDER BY o.id DESC
//     `);

//     res.json(rows);
//   } catch (err) {
//     console.error("Get orders error:", err.message);
//     res.status(500).json({ message: err.message });
//   }
// };

/* -- remove employee_id -- */
export const getOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id,
        o.order_number,

        /* 👤 CUSTOMER */
        o.customer_id,
        o.customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.place AS customer_place,
        c.address AS customer_address,

        /* 📅 ORDER */
        o.order_date,
        o.expected_delivery_date,
        o.delivery_date,
        o.status,
        o.remarks,

        /* 👤 CREATED / UPDATED */
        o.created_by,
        uc.username AS created_by_name,

        o.updated_by,
        uu.username AS updated_by_name,

        o.created_at,
        o.updated_at

      FROM customerOrders o

      /* 🔥 JOIN CUSTOMER */
      LEFT JOIN customers c 
        ON o.customer_id = c.id

      LEFT JOIN users_roles uc 
        ON o.created_by = uc.id

      LEFT JOIN users_roles uu 
        ON o.updated_by = uu.id

      ORDER BY o.id DESC
    `);

    res.json({
      count: rows.length,
      data: rows,
    });

  } catch (err) {
    console.error("Get orders error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id; // logged-in user id

    const [rows] = await db.query(
      `
      SELECT 
        o.id,
        o.order_number,
        o.customer_id,
        o.customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.place AS customer_place,
        c.address AS customer_address,
        o.order_date,
        o.expected_delivery_date,
        o.delivery_date,
        o.status,
        o.remarks,

        o.created_by,
        uc.username AS created_by_name,

        o.updated_by,
        uu.username AS updated_by_name,

        o.created_at,
        o.updated_at

      FROM customerOrders o

      LEFT JOIN users_roles uc 
        ON o.created_by = uc.id

      LEFT JOIN users_roles uu 
        ON o.updated_by = uu.id

      LEFT JOIN customers c 
        ON o.customer_id = c.id

      WHERE o.created_by = ?

      ORDER BY o.id DESC
    `,
      [userId],
    );

    res.json({
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Get my orders error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// export const getOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // const [[order]] = await db.query(
//     //   `SELECT * FROM customerOrders WHERE id=?`,
//     //   [id],
//     // );

//     const [[order]] = await db.query(
//       `
//   SELECT
//     o.*,
//     c.*,
//     e.employee_name,
//     e.phone as employee_phone
//   FROM customerOrders o
//   JOIN employees_details e
//     ON o.employee_id = e.id
//   JOIN customers c
//     ON o.customer_id = c.id
//   WHERE o.id = ?
// `,
//       [id],
//     );

//     if (!order) return res.status(404).json({ message: "Order not found" });

//     const [products] = await db.query(
//       `SELECT
//         op.*,
//         p.*
//        FROM customerOrderProducts op
//        JOIN products p ON op.product_id = p.id
//        WHERE op.order_id=?`,
//       [id],
//     );

//     res.json({ order, products });
//   } catch (err) {
//     console.error("Get order error:", err.message);
//     res.status(500).json({ message: err.message });
//   }
// };

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

// export const getOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query(`
//       SELECT
//         o.id AS order_id,
//         o.order_number,
//         o.order_date,
//         o.expected_delivery_date,
//         o.delivery_date,
//         o.status,

//         -- 👤 CUSTOMER
//         CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
//         c.phone AS customer_phone,

//         -- 👨‍💼 EMPLOYEE
//         e.employee_name,
//         e.phone AS employee_phone,

//         -- 📦 PRODUCT
//         p.id AS product_id,
//         p.product_name,
//         p.brand,
//         p.category,

//         op.quantity,
//         p.price AS rate,

//         -- 💰 PRODUCT TOTAL
//         (op.quantity * p.price) AS total,

//         -- 💰 GRAND TOTAL (same in each row)
//         SUM(op.quantity * p.price) OVER (PARTITION BY o.id) AS grand_total

//       FROM customerOrders o

//       JOIN customers c ON o.customer_id = c.id
//       JOIN employees_details e ON o.employee_id = e.id
//       JOIN customerOrderProducts op ON op.order_id = o.id
//       JOIN products p ON op.product_id = p.id

//       WHERE o.id = ?
//     `, [id]);

//     if (rows.length === 0) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.json({
//       count: rows.length,
//       data: rows
//     });

//   } catch (err) {
//     console.error("Get order error:", err.message);
//     res.status(500).json({ message: err.message });
//   }
// };

// export const getOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // ✅ 1. ORDER + CUSTOMER + EMPLOYEE
//     const [[row]] = await db.query(
//       `
//       SELECT
//         o.id AS order_id,
//         o.order_number,
//         o.customer_id AS order_customer_id,
//         o.employee_id AS order_employee_id,
//         o.order_date,
//         o.expected_delivery_date,
//         o.delivery_date,
//         o.status,
//         o.remarks,
//         o.created_by,
//         o.updated_by,

//         -- 👤 CUSTOMER (FULL DATA)
//        -- c.*,
//        -- 👤 CUSTOMER (SAFE ALIASING)
//         c.id AS customer_id,
//         c.first_name,
//         c.last_name,
//         c.phone AS customer_phone,
//         c.email AS customer_email,
//         c.address AS customer_address,
//         c.created_at AS customer_created_at,
//         c.updated_at AS customer_updated_at,

//         -- 👨‍💼 EMPLOYEE
//         e.id AS employee_id,
//         e.employee_name,
//         e.phone AS employee_phone,
//         e.email AS employee_email,
//         e.address AS employee_address

//       FROM customerOrders o
//       JOIN customers c ON o.customer_id = c.id
//       JOIN employees_details e ON o.employee_id = e.id
//       WHERE o.id = ?
//       `,
//       [id],
//     );

//     // ❌ Not found
//     if (!row) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // ✅ 2. PRODUCTS
//     const [productsRaw] = await db.query(
//       `
//       SELECT
//         op.id AS order_product_id,
//         op.product_id,
//         op.quantity,

//         p.product_name,
//         p.brand,
//         p.category,
//         p.price AS rate,

//         -- 💰 CALCULATED TOTAL
//         (op.quantity * p.price) AS total

//       FROM customerOrderProducts op
//       JOIN products p ON op.product_id = p.id
//       WHERE op.order_id = ?
//       `,
//       [id],
//     );

//     // ✅ 3. CALCULATE SUMMARY
//     const grand_total = productsRaw.reduce(
//       (sum, item) => sum + Number(item.total),
//       0,
//     );

//     const total_items = productsRaw.length;

//     // ✅ 4. FINAL TREE STRUCTURE
//     const response = {
//       order: {
//         order_id: row.order_id,
//         order_number: row.order_number,
//         order_customer_id: row.order_customer_id,
//         order_employee_id: row.order_employee_id,
//         order_date: row.order_date,
//         expected_delivery_date: row.expected_delivery_date,
//         delivery_date: row.delivery_date,
//         status: row.status,
//         remarks: row.remarks,
//         created_by: row.created_by,
//         updated_by: row.updated_by,

//         // customer: {
//         //   id: row.customer_id,
//         //   name: row.customer_name,
//         //   phone: row.customer_phone,
//         //   address: row.address,
//         // },

//         // 👤CUSTOMER
//         customer: {
//           id: row.customer_id || row.id, // depending on alias
//           first_name: row.first_name,
//           last_name: row.last_name,
//           name: `${row.first_name} ${row.last_name || ""}`,
//           phone: row.customer_phone,
//           email: row.customer_email,
//           address: row.customer_address,
//         },

//         employee: {
//           id: row.employee_id,
//           name: row.employee_name,
//           phone: row.employee_phone,
//           email: row.employee_email,
//           address: row.employee_address,
//         },

//         summary: {
//           total_items,
//           grand_total,
//         },

//         products: productsRaw,
//       },
//     };

//     // ✅ 5. RESPONSE
//     res.json(response);
//   } catch (err) {
//     console.error("Get order error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

/* -- remove employee id -- */

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    /* ✅ 1. ORDER + CUSTOMER + USER (CREATED/UPDATED) */
    const [[row]] = await db.query(
      `
      SELECT
        o.id AS order_id,
        o.order_number,
        o.customer_id,
        o.order_date,
        o.expected_delivery_date,
        o.delivery_date,
        o.status,
        o.remarks,

        o.created_by,
        uc.username AS created_by_name,

        o.updated_by,
        uu.username AS updated_by_name,

        o.created_at,
        o.updated_at,

        /* 👤 CUSTOMER */
        c.id AS customer_id,
        c.first_name,
        c.last_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address AS customer_address

      FROM customerOrders o

      JOIN customers c 
        ON o.customer_id = c.id

      LEFT JOIN users_roles uc 
        ON o.created_by = uc.id

      LEFT JOIN users_roles uu 
        ON o.updated_by = uu.id

      WHERE o.id = ?
      `,
      [id],
    );

    /* ❌ NOT FOUND */
    if (!row) {
      return res.status(404).json({ message: "Order not found" });
    }

    /* ✅ 2. PRODUCTS */
    const [productsRaw] = await db.query(
      `
      SELECT 
        op.id AS order_product_id,
        op.product_id,
        op.quantity,

        p.product_name,
        p.brand,
        p.category,
        p.price AS rate,

        /* 💰 CALCULATED TOTAL */
        (op.quantity * p.price) AS total,
        op.total_amount AS final_total,
        
        (op.total_amount / op.quantity) AS final_unit_price,
        p.price - (op.total_amount / op.quantity) AS discount

      FROM customerOrderProducts op
      JOIN products p ON op.product_id = p.id
      WHERE op.order_id = ?
      `,
      [id],
    );

    /* ✅ 3. SUMMARY */
    const product_grand_total = productsRaw.reduce(
      (sum, item) => sum + Number(item.total),
      0,
    );

    const product_final_total = productsRaw.reduce(
      (sum, item) => sum + Number(item.final_total),
      0,
    );

    const total_discount = productsRaw.reduce(
      (sum, item) => sum + Number(item.discount),
      0,
    );

    const total_items = productsRaw.length;

    /* ✅ 4. FINAL STRUCTURE */
    const response = {
      order: {
        order_id: row.order_id,
        order_number: row.order_number,
        order_date: row.order_date,
        expected_delivery_date: row.expected_delivery_date,
        delivery_date: row.delivery_date,
        status: row.status,
        remarks: row.remarks,

        created_by: {
          id: row.created_by,
          name: row.created_by_name,
        },

        updated_by: {
          id: row.updated_by,
          name: row.updated_by_name,
        },

        customer: {
          id: row.customer_id,
          first_name: row.first_name,
          last_name: row.last_name,
          name: `${row.first_name} ${row.last_name || ""}`,
          phone: row.customer_phone,
          email: row.customer_email,
          address: row.customer_address,
        },

        summary: {
          total_items,
          product_grand_total,
          product_final_total,
          total_discount,
        },

        products: productsRaw,
      },
    };

    /* ✅ RESPONSE */
    res.json(response);
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ message: err.message });
  }
};

// export const updateOrder = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const { id } = req.params;
//     const { expected_delivery_date, products, status, remarks } = req.body;

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     /* 🔒 LOCK ORDER */
//     const [[order]] = await conn.query(
//       `SELECT * FROM customerOrders WHERE id=? FOR UPDATE`,
//       [id],
//     );

//     if (!order) throw new Error("Order not found");

//     if (order.status === "BILLED") {
//       throw new Error("Cannot update billed order");
//     }

//     /* ⚠️ VALIDATE PRODUCTS */
//     if (!Array.isArray(products) || products.length === 0) {
//       throw new Error("Products required");
//     }

//     /* 🗑 DELETE OLD PRODUCTS */
//     await conn.query(`DELETE FROM customerOrderProducts WHERE order_id=?`, [
//       id,
//     ]);

//     /* 📦 PREPARE BULK INSERT */
//     const values = [];

//     for (const item of products) {
//       const qty = Number(item.quantity);

//       if (!item.product_id || isNaN(qty) || qty <= 0) {
//         throw new Error("Invalid product data");
//       }

//       /* ✅ CHECK PRODUCT */
//       const [[product]] = await conn.query(
//         `SELECT id FROM products WHERE id=?`,
//         [item.product_id],
//       );

//       if (!product) throw new Error(`Product not found: ${item.product_id}`);

//       values.push([id, item.product_id, qty]);
//     }

//     /* 🚀 BULK INSERT */
//     await conn.query(
//       `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
//        VALUES ?`,
//       [values],
//     );

//     /* 📝 UPDATE ORDER */
//     await conn.query(
//       `UPDATE customerOrders
//        SET
//        expected_delivery_date = ?,
//          status = ?,
//          remarks = ?,
//          updated_by = ?
//        WHERE id = ?`,
//       [
//         expected_delivery_date || order.expected_delivery_date,
//         status || order.status,
//         remarks || null,
//         userId,
//         id,
//       ],
//     );

//     await conn.commit();

//     res.json({
//       message: "Order updated successfully",
//     });
//   } catch (err) {
//     console.error("Update order error:", err.message);
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

// export const updateOrder = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const { id } = req.params;
//     const {
//       customer_id,
//       employee_id,
//       expected_delivery_date,
//       products,
//       status,
//       remarks,
//     } = req.body;

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     // 🔒 LOCK ORDER
//     const [[order]] = await conn.query(
//       `SELECT * FROM customerOrders WHERE id=? FOR UPDATE`,
//       [id],
//     );

//     if (!order) throw new Error("Order not found");

//     if (order.status === "BILLED") {
//       throw new Error("Cannot update billed order");
//     }

//     if (order.status === "DELIVERED") {
//       throw new Error("Cannot update delivered order");
//     }

//     // ✅ CHECK CUSTOMER (only if updating)
//     if (customer_id) {
//       const [[customer]] = await conn.query(
//         `SELECT id FROM customers WHERE id=?`,
//         [customer_id],
//       );
//       if (!customer) throw new Error("Customer not found");
//     }

//     // ✅ CHECK EMPLOYEE (only if updating)
//     if (employee_id) {
//       const [[employee]] = await conn.query(
//         `SELECT id FROM employees_details WHERE id=?`,
//         [employee_id],
//       );
//       if (!employee) throw new Error("Employee not found");
//     }

//     // 📦 HANDLE PRODUCTS (optional update)
//     if (products) {
//       if (!Array.isArray(products) || products.length === 0) {
//         throw new Error("Products must be a non-empty array");
//       }

//       const values = [];

//       for (const item of products) {
//         const qty = Number(item.quantity);

//         if (!item.product_id || isNaN(qty) || qty <= 0) {
//           throw new Error("Invalid product data");
//         }

//         // ✅ CHECK PRODUCT
//         const [[product]] = await conn.query(
//           `SELECT id FROM products WHERE id=?`,
//           [item.product_id],
//         );

//         if (!product) {
//           throw new Error(`Product not found: ${item.product_id}`);
//         }

//         values.push([id, item.product_id, qty]);
//       }

//       // 🗑 DELETE OLD PRODUCTS
//       await conn.query(`DELETE FROM customerOrderProducts WHERE order_id=?`, [
//         id,
//       ]);

//       // 🚀 BULK INSERT NEW PRODUCTS
//       await conn.query(
//         `INSERT INTO customerOrderProducts (order_id, product_id, quantity)
//          VALUES ?`,
//         [values],
//       );
//     }

//     // 📝 UPDATE ORDER (only changed fields)
//     await conn.query(
//       `
//       UPDATE customerOrders
//       SET
//         customer_id = COALESCE(?, customer_id),
//         employee_id = COALESCE(?, employee_id),
//         expected_delivery_date = COALESCE(?, expected_delivery_date),
//         status = COALESCE(?, status),
//         remarks = ?,
//         updated_by = ?
//       WHERE id = ?
//       `,
//       [
//         customer_id || null,
//         employee_id || null,
//         expected_delivery_date || null,
//         status || null,
//         remarks ?? order.remarks,
//         userId,
//         id,
//       ],
//     );

//     await conn.commit();

//     res.json({
//       message: "Order updated successfully",
//     });
//   } catch (err) {
//     console.error("Update order error:", err.message);
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

/* -- remove employee_id from updateOrder -- */
export const updateOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { customer_id, expected_delivery_date, products, status, remarks } =
      req.body;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // 🔒 LOCK ORDER
    const [[order]] = await conn.query(
      `SELECT * FROM customerOrders WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!order) throw new Error("Order not found");

    if (order.status === "BILLED") {
      throw new Error("Cannot update billed order");
    }

    if (order.status === "DELIVERED") {
      throw new Error("Cannot update delivered order");
    }

    // ✅ CHECK CUSTOMER (only if updating)
    if (customer_id) {
      const [[customer]] = await conn.query(
        `SELECT id FROM customers WHERE id=?`,
        [customer_id],
      );
      if (!customer) throw new Error("Customer not found");
    }

    // 📦 HANDLE PRODUCTS (optional update)
    if (products) {
      if (!Array.isArray(products) || products.length === 0) {
        throw new Error("Products must be a non-empty array");
      }

      const values = [];

      for (const item of products) {
        const qty = Number(item.quantity);
        const total = Number(item.total_amount);

        if (
          !item.product_id ||
          isNaN(qty) ||
          qty <= 0 ||
          isNaN(total) ||
          total <= 0
        ) {
          throw new Error("Invalid product data");
        }

        // ✅ CHECK PRODUCT
        const [[product]] = await conn.query(
          `SELECT id FROM products WHERE id=?`,
          [item.product_id],
        );

        if (!product) {
          throw new Error(`Product not found: ${item.product_id}`);
        }

        values.push([id, item.product_id, qty, total]);
      }

      // 🗑 DELETE OLD PRODUCTS
      await conn.query(`DELETE FROM customerOrderProducts WHERE order_id=?`, [
        id,
      ]);

      // 🚀 BULK INSERT NEW PRODUCTS
      await conn.query(
        `INSERT INTO customerOrderProducts (order_id, product_id, quantity, total_amount)
         VALUES ?`,
        [values],
      );
    }

    // 📝 UPDATE ORDER (only changed fields)
    await conn.query(
      `
      UPDATE customerOrders 
      SET
        customer_id = COALESCE(?, customer_id),
        expected_delivery_date = COALESCE(?, expected_delivery_date),
        status = COALESCE(?, status),
        remarks = ?,
        updated_by = ?
      WHERE id = ?
      `,
      [
        customer_id || null,
        expected_delivery_date || null,
        status || null,
        remarks ?? order.remarks,
        userId,
        id,
      ],
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
      [id],
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
      [userId, id],
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

export const cancelOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    const [[order]] = await conn.query(
      `SELECT status FROM customerOrders WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!order) throw new Error("Order not found");

    // 🔥 STRICT RULE
    if (order.status !== "PENDING") {
      throw new Error("Only pending orders can be cancelled");
    }

    await conn.query(
      `UPDATE customerOrders
       SET status='CANCELLED', updated_by=?
       WHERE id=?`,
      [userId, id],
    );

    await conn.commit();

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deliverOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    const [[order]] = await conn.query(
      `SELECT status FROM customerOrders WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!order) throw new Error("Order not found");

    // 🔥 STRICT RULE
    if (order.status !== "BILLED") {
      throw new Error("Only billed orders can be delivered");
    }

    await conn.query(
      `UPDATE customerOrders
       SET status='DELIVERED', updated_by=?, delivery_date=NOW()
       WHERE id=?`,
      [userId, id],
    );

    await conn.commit();

    res.json({ message: "Order delivered successfully" });
  } catch (err) {
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
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    /* 🔒 LOCK ORDER */
    const [[order]] = await conn.query(
      `SELECT status FROM customerOrders WHERE id=? FOR UPDATE`,
      [id],
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

    // if (currentStatus === "BILLED") {
    //   throw new Error("Billed order cannot be updated");
    // }

    if (status === "BILLED") {
      throw new Error("BILLED status cannot be set manually");
    }

    /* ✅ STATUS FLOW VALIDATION */
    // const allowedTransitions = {
    //   PENDING: ["CONFIRMED", "CANCELLED"],
    //   CONFIRMED: ["DELIVERED", "BILLED", "CANCELLED"],
    //   DELIVERED: ["BILLED"],
    // };

    const allowedTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["DELIVERED", "CANCELLED"],
      DELIVERED: [], // 🔥 no manual transitions
    };

    if (
      allowedTransitions[currentStatus] &&
      !allowedTransitions[currentStatus].includes(status)
    ) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${status}`,
      );
    }

    /* ✅ UPDATE STATUS */
    await conn.query(
      `UPDATE customerOrders
       SET status=?, updated_by=?
       WHERE id=?`,
      [status, userId, id],
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

export const getProductsWithAvailableStock = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.product_name,
        p.brand,
        p.category,
        p.price,
        p.stock AS actual_stock,

        COALESCE(SUM(op.quantity), 0) AS reserved_qty,

        (p.stock - COALESCE(SUM(op.quantity), 0)) AS available_stock

      FROM products p

      LEFT JOIN customerOrderProducts op 
        ON op.product_id = p.id

      LEFT JOIN customerOrders o 
        ON o.id = op.order_id
        AND o.status IN ('PENDING','CONFIRMED')

      GROUP BY p.id
      ORDER BY p.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Stock fetch error:", err);
    res.status(500).json({ message: err.message });
  }
};

// export const generateBillFromOrder = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const orderId = req.params.id;
//     const userId = req.user?.id;

//     if (!userId) throw new Error("Unauthorized");

//     const {
//       customer_gst_number,
//       company_gst_number,
//       vehicle_number,
//       eway_bill_number,
//       staff_name,
//       staff_phone,
//       bank_id,
//       cash_amount = 0,
//       upi_amount = 0,
//       cheque_amount = 0,
//       upi_reference,
//       items, // optional for partial billing
//       remarks,
//     } = req.body;

//     // ======================================================
//     // ✅ LOCK ORDER
//     // ======================================================

//     const [[order]] = await connection.query(
//       `SELECT * FROM customerOrders WHERE id = ? FOR UPDATE`,
//       [orderId]
//     );

//     if (!order) throw new Error("Order not found");

//     if (!["CONFIRMED", "PARTIALLY_BILLED"].includes(order.status)) {
//       throw new Error("Order not ready for billing");
//     }

//     // ======================================================
//     // ✅ VERIFY BANK
//     // ======================================================

//     const [[bank]] = await connection.query(
//       `SELECT id FROM company_bank_details WHERE id = ? AND status='active'`,
//       [bank_id]
//     );

//     if (!bank) throw new Error("Invalid bank");

//     // ======================================================
//     // ✅ GET ORDER PRODUCTS
//     // ======================================================

//     const [orderProducts] = await connection.query(
//       `SELECT * FROM customerOrderProducts WHERE order_id = ?`,
//       [orderId]
//     );

//     let subtotal = 0;
//     let total_gst = 0;
//     let grand_total = 0;

//     const processedProducts = [];

//     // ======================================================
//     // ✅ PROCESS PRODUCTS
//     // ======================================================

//     for (const op of orderProducts) {
//       const reqItem = items?.find(i => i.product_id === op.product_id);

//       const remainingQty = op.quantity - op.billed_quantity;

//       if (remainingQty <= 0) continue;

//       const billQty = reqItem ? Number(reqItem.quantity) : remainingQty;

//       if (billQty <= 0) continue;

//       if (billQty > remainingQty) {
//         throw new Error(`Over billing product ${op.product_id}`);
//       }

//       // 🔒 LOCK PRODUCT
//       const [[product]] = await connection.query(
//         `SELECT * FROM products WHERE id = ? FOR UPDATE`,
//         [op.product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < billQty) {
//         throw new Error(`Stock low: ${product.product_name}`);
//       }

//       const rate = Number(product.price);

//       const baseTotal = rate * billQty;

//       const cgst = (baseTotal * (product.cgst_rate || 0)) / 100;
//       const sgst = (baseTotal * (product.sgst_rate || 0)) / 100;
//       const igst = (baseTotal * (product.igst_rate || 0)) / 100;

//       const gstTotal = cgst + sgst + igst;
//       const total = baseTotal + gstTotal;

//       subtotal += baseTotal;
//       total_gst += gstTotal;
//       grand_total += total;

//       processedProducts.push({
//         product_id: op.product_id,
//         product_name: product.product_name,
//         product_brand: product.brand,
//         product_category: product.category,
//         product_quantity: product.quantity,
//         quantity: billQty,
//         rate,
//         hsn_code: product.hsn_code,
//         cgst_rate: product.cgst_rate,
//         sgst_rate: product.sgst_rate,
//         igst_rate: product.igst_rate,
//         gst_total_rate:
//           (product.cgst_rate || 0) +
//           (product.sgst_rate || 0) +
//           (product.igst_rate || 0),
//         cgst_amount: cgst,
//         sgst_amount: sgst,
//         igst_amount: igst,
//         gst_total_amount: gstTotal,
//         total,
//       });
//     }

//     if (processedProducts.length === 0) {
//       throw new Error("Nothing to bill");
//     }

//     // ======================================================
//     // ✅ PAYMENT
//     // ======================================================

//     const advance_paid =
//       Number(cash_amount) +
//       Number(upi_amount) +
//       Number(cheque_amount);

//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) throw new Error("Overpayment not allowed");

//     const payment_status =
//       advance_paid === 0
//         ? "UNPAID"
//         : advance_paid < grand_total
//         ? "PARTIAL"
//         : "PAID";

//     // ======================================================
//     // ✅ CREATE BILL
//     // ======================================================

//     const invoice_number = await generateInvoiceNumber(db);

//     const [billResult] = await connection.query(
//       `INSERT INTO customerBilling (
//         invoice_number,
//         invoice_date,
//         company_gst_number,
//         customer_id,
//         customer_name,
//         phone_number,
//         customer_gst_number,
//         vehicle_number,
//         eway_bill_number,
//         staff_name,
//         staff_phone,
//         bank_id,
//         subtotal,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//         cheque_amount,
//         upi_reference,
//         payment_status,
//         created_by,
//         remarks,
//         order_id
//       ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         invoice_number,
//         company_gst_number,
//         order.customer_id,
//         order.customer_name,
//         order.phone_number,
//         customer_gst_number,
//         vehicle_number,
//         eway_bill_number,
//         staff_name,
//         staff_phone,
//         bank_id,
//         subtotal,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//         cheque_amount,
//         upi_reference,
//         payment_status,
//         userId,
//         remarks || "Order billing",
//         orderId,
//       ]
//     );

//     const billing_id = billResult.insertId;

//     // ======================================================
//     // ✅ INSERT PRODUCTS + UPDATE ORDER + STOCK
//     // ======================================================

//     for (const p of processedProducts) {
//       await connection.query(
//         `INSERT INTO customerBillingProducts (
//           billing_id, product_id, product_name, product_brand,
//           product_category, product_quantity, hsn_code,
//           cgst_rate, sgst_rate, igst_rate, gst_total_rate,
//           cgst_amount, sgst_amount, igst_amount, gst_total_amount,
//           quantity, rate, total
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           billing_id,
//           p.product_id,
//           p.product_name,
//           p.product_brand,
//           p.product_category,
//           p.product_quantity,
//           p.hsn_code,
//           p.cgst_rate,
//           p.sgst_rate,
//           p.igst_rate,
//           p.gst_total_rate,
//           p.cgst_amount,
//           p.sgst_amount,
//           p.igst_amount,
//           p.gst_total_amount,
//           p.quantity,
//           p.rate,
//           p.total,
//         ]
//       );

//       // update billed qty
//       await connection.query(
//         `UPDATE customerOrderProducts
//          SET billed_quantity = billed_quantity + ?
//          WHERE order_id = ? AND product_id = ?`,
//         [p.quantity, orderId, p.product_id]
//       );

//       // stock
//       await applyStockChange({
//         conn: connection,
//         product_id: p.product_id,
//         qty_change: -p.quantity,
//         reference_type: "SALE",
//         reference_id: billing_id,
//         remarks: "Order billing",
//         userId,
//       });
//     }

//     // ======================================================
//     // ✅ UPDATE ORDER STATUS
//     // ======================================================

//     const [[pending]] = await connection.query(
//       `SELECT COUNT(*) as cnt
//        FROM customerOrderProducts
//        WHERE order_id = ?
//        AND quantity > billed_quantity`,
//       [orderId]
//     );

//     const newStatus =
//       pending.cnt > 0 ? "PARTIALLY_BILLED" : "BILLED";

//     await connection.query(
//       `UPDATE customerOrders SET status = ? WHERE id = ?`,
//       [newStatus, orderId]
//     );

//     // ======================================================
//     // ✅ AUDIT LOG
//     // ======================================================

//     await AuditLog({
//       connection,
//       table: "customerBilling",
//       recordId: billing_id,
//       action: "INSERT",
//       newData: {
//         invoice_number,
//         order_id: orderId,
//         total: grand_total,
//         products: processedProducts,
//       },
//       userId,
//       remarks: "Order billing created",
//     });

//     await connection.commit();

//     res.status(201).json({
//       message: "Order billed successfully",
//       billing_id,
//       invoice_number,
//       order_status: newStatus,
//     });

//   } catch (err) {
//     await connection.rollback();

//     console.error("Order billing error:", err);

//     res.status(400).json({
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

// export const generateBillFromOrder = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const orderId = req.params.id;
//     const userId = req.user?.id;

//     if (!userId) throw new Error("Unauthorized");

//     const {
//       customer_gst_number,
//       company_gst_number,
//       vehicle_number,
//       eway_bill_number,
//       staff_name,
//       staff_phone,
//       bank_id,
//       cash_amount = 0,
//       upi_amount = 0,
//       cheque_amount = 0,
//       upi_reference,
//       items,
//       remarks,
//     } = req.body;

//     // 🔒 helper (MANDATORY)
//     const toNum = (val) => Number(val || 0);

//     // ======================================================
//     // ✅ LOCK ORDER
//     // ======================================================

//     const [[order]] = await connection.query(
//       `
//   SELECT
//     o.*,
//     c.phone AS customer_phone
//   FROM customerOrders o
//   JOIN customers c ON c.id = o.customer_id
//   WHERE o.id = ?
//   FOR UPDATE
//   `,
//       [orderId],
//     );

//     if (!order) throw new Error("Order not found");

//     if (!["CONFIRMED", "PARTIALLY_BILLED"].includes(order.status)) {
//       throw new Error("Order not ready for billing");
//     }

//     // ======================================================
//     // ✅ VERIFY BANK
//     // ======================================================

//     const [[bank]] = await connection.query(
//       `SELECT id FROM company_bank_details WHERE id = ? AND status='active'`,
//       [bank_id],
//     );

//     if (!bank) throw new Error("Invalid bank");

//     // ======================================================
//     // ✅ GET ORDER PRODUCTS
//     // ======================================================

//     const [orderProducts] = await connection.query(
//       `SELECT * FROM customerOrderProducts WHERE order_id = ?`,
//       [orderId],
//     );

//     let subtotal = 0;
//     let total_gst = 0;
//     let grand_total = 0;

//     const processedProducts = [];

//     // ======================================================
//     // ✅ PROCESS PRODUCTS
//     // ======================================================

//     for (const op of orderProducts) {
//       const reqItem = items?.find((i) => i.product_id === op.product_id);

//       const remainingQty = toNum(op.quantity) - toNum(op.billed_quantity);

//       if (remainingQty <= 0) continue;

//       const billQty = reqItem ? toNum(reqItem.quantity) : remainingQty;

//       if (billQty <= 0) continue;

//       if (billQty > remainingQty) {
//         throw new Error(`Over billing product ${op.product_id}`);
//       }

//       // 🔒 LOCK PRODUCT
//       const [[product]] = await connection.query(
//         `SELECT * FROM products WHERE id = ? FOR UPDATE`,
//         [op.product_id],
//       );

//       if (!product) throw new Error("Product not found");

//       if (toNum(product.stock) < billQty) {
//         throw new Error(`Stock low: ${product.product_name}`);
//       }

//       // ✅ FORCE NUMBERS (CRITICAL)
//       const rate = toNum(product.price);

//       const cgst_rate = toNum(product.cgst_rate);
//       const sgst_rate = toNum(product.sgst_rate);
//       const igst_rate = toNum(product.igst_rate);

//       const gst_total_rate = cgst_rate + sgst_rate + igst_rate;

//       const baseTotal = rate * billQty;

//       const cgst_amount = (baseTotal * cgst_rate) / 100;
//       const sgst_amount = (baseTotal * sgst_rate) / 100;
//       const igst_amount = (baseTotal * igst_rate) / 100;

//       const gst_total_amount = cgst_amount + sgst_amount + igst_amount;

//       const total = baseTotal + gst_total_amount;

//       subtotal += baseTotal;
//       total_gst += gst_total_amount;
//       grand_total += total;

//       processedProducts.push({
//         product_id: op.product_id,
//         product_name: product.product_name,
//         product_brand: product.brand,
//         product_category: product.category,
//         product_quantity: product.quantity,

//         quantity: billQty,
//         rate,

//         hsn_code: product.hsn_code,

//         cgst_rate,
//         sgst_rate,
//         igst_rate,
//         gst_total_rate,

//         cgst_amount,
//         sgst_amount,
//         igst_amount,
//         gst_total_amount,

//         total,
//       });
//     }

//     if (processedProducts.length === 0) {
//       throw new Error("Nothing to bill");
//     }

//     // ======================================================
//     // ✅ PAYMENT
//     // ======================================================

//     const advance_paid =
//       toNum(cash_amount) + toNum(upi_amount) + toNum(cheque_amount);

//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) throw new Error("Overpayment not allowed");

//     const payment_status =
//       advance_paid === 0
//         ? "UNPAID"
//         : advance_paid < grand_total
//           ? "PARTIAL"
//           : "PAID";

//     // ======================================================
//     // ✅ INVOICE NUMBER (FIXED)
//     // ======================================================

//     const invoice_number = await generateInvoiceNumber(connection);

//     // ======================================================
//     // ✅ CREATE BILL
//     // ======================================================

//     const [billResult] = await connection.query(
//       `INSERT INTO customerBilling (
//         invoice_number,
//         invoice_date,
//         company_gst_number,
//         customer_id,
//         customer_name,
//         phone_number,
//         customer_gst_number,
//         vehicle_number,
//         eway_bill_number,
//         staff_name,
//         staff_phone,
//         bank_id,
//         subtotal,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//         cheque_amount,
//         upi_reference,
//         payment_status,
//         created_by,
//         remarks,
//         order_id
//       ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         invoice_number,
//         company_gst_number,
//         order.customer_id,
//         order.customer_name,
//         order.phone_number,
//         customer_gst_number,
//         vehicle_number,
//         eway_bill_number,
//         staff_name,
//         staff_phone,
//         bank_id,
//         subtotal,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//         cheque_amount,
//         upi_reference,
//         payment_status,
//         userId,
//         remarks || "Order billing",
//         orderId,
//       ],
//     );

//     const billing_id = billResult.insertId;

//     // ======================================================
//     // ✅ INSERT PRODUCTS + STOCK + ORDER UPDATE
//     // ======================================================

//     for (const p of processedProducts) {
//       await connection.query(
//         `INSERT INTO customerBillingProducts (
//           billing_id, product_id, product_name, product_brand,
//           product_category, product_quantity, hsn_code,
//           cgst_rate, sgst_rate, igst_rate, gst_total_rate,
//           cgst_amount, sgst_amount, igst_amount, gst_total_amount,
//           quantity, rate, total
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           billing_id,
//           p.product_id,
//           p.product_name,
//           p.product_brand,
//           p.product_category,
//           p.product_quantity,
//           p.hsn_code,
//           p.cgst_rate,
//           p.sgst_rate,
//           p.igst_rate,
//           p.gst_total_rate,
//           p.cgst_amount,
//           p.sgst_amount,
//           p.igst_amount,
//           p.gst_total_amount,
//           p.quantity,
//           p.rate,
//           p.total,
//         ],
//       );

//       await connection.query(
//         `UPDATE customerOrderProducts
//          SET billed_quantity = billed_quantity + ?
//          WHERE order_id = ? AND product_id = ?`,
//         [p.quantity, orderId, p.product_id],
//       );

//       await applyStockChange({
//         conn: connection,
//         product_id: p.product_id,
//         qty_change: -p.quantity,
//         reference_type: "SALE",
//         reference_id: billing_id,
//         remarks: "Order billing",
//         userId,
//       });
//     }

//     // ======================================================
//     // ✅ ORDER STATUS
//     // ======================================================

//     const [[pending]] = await connection.query(
//       `SELECT COUNT(*) as cnt
//        FROM customerOrderProducts
//        WHERE order_id = ?
//        AND quantity > billed_quantity`,
//       [orderId],
//     );

//     const newStatus = pending.cnt > 0 ? "PARTIALLY_BILLED" : "BILLED";

//     await connection.query(
//       `UPDATE customerOrders SET status = ? WHERE id = ?`,
//       [newStatus, orderId],
//     );

//     // ======================================================
//     // ✅ AUDIT
//     // ======================================================

//     await AuditLog({
//       connection,
//       table: "customerBilling",
//       recordId: billing_id,
//       action: "INSERT",
//       newData: {
//         invoice_number,
//         order_id: orderId,
//         total: grand_total,
//         products: processedProducts,
//       },
//       userId,
//       remarks: "Order billing created",
//     });

//     await connection.commit();

//     res.status(201).json({
//       message: "Order billed successfully",
//       billing_id,
//       invoice_number,
//       order_status: newStatus,
//     });
//   } catch (err) {
//     await connection.rollback();

//     console.error("Order billing error:", err);

//     res.status(400).json({
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

/* -- strict partial billing (ONLY items if provided)-- */
export const generateBillFromOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const orderId = req.params.id;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    const {
      customer_gst_number,
      company_gst_number,
      vehicle_number,
      eway_bill_number,
      staff_name,
      staff_phone,
      bank_id,
      cash_amount = 0,
      upi_amount = 0,
      cheque_amount = 0,
      upi_reference,
      items,
      remarks,
    } = req.body;

    const toNum = (val) => Number(val || 0);

    // ======================================================
    // ✅ LOCK ORDER + CUSTOMER PHONE
    // ======================================================

    const [[order]] = await connection.query(
      `
      SELECT o.*, c.phone AS customer_phone
      FROM customerOrders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
      FOR UPDATE
      `,
      [orderId],
    );

    if (!order) throw new Error("Order not found");

    if (!["CONFIRMED", "PARTIALLY_BILLED"].includes(order.status)) {
      throw new Error("Order not ready for billing");
    }

    // ======================================================
    // ✅ VERIFY BANK
    // ======================================================

    const [[bank]] = await connection.query(
      `SELECT id FROM company_bank_details WHERE id = ? AND status='active'`,
      [bank_id],
    );

    if (!bank) throw new Error("Invalid bank");

    // ======================================================
    // ✅ GET ORDER PRODUCTS
    // ======================================================

    const [orderProducts] = await connection.query(
      `SELECT * FROM customerOrderProducts WHERE order_id = ?`,
      [orderId],
    );

    if (!orderProducts.length) {
      throw new Error("No products in order");
    }

    // ======================================================
    // ✅ HANDLE PARTIAL BILLING
    // ======================================================

    const isPartial = Array.isArray(items) && items.length > 0;

    const itemMap = new Map();

    if (isPartial) {
      for (const i of items) {
        if (!i.product_id || !i.quantity) {
          throw new Error("Invalid item format");
        }
        itemMap.set(i.product_id, toNum(i.quantity));
      }

      // validate product exists in order
      const orderProductIds = orderProducts.map((p) => p.product_id);

      for (const pid of itemMap.keys()) {
        if (!orderProductIds.includes(pid)) {
          throw new Error(`Product ${pid} not in order`);
        }
      }
    }

    // ======================================================
    // ✅ CALCULATIONS
    // ======================================================

    let subtotal = 0;
    let total_gst = 0;
    let grand_total = 0;

    const processedProducts = [];

    for (const op of orderProducts) {
      const remainingQty = toNum(op.quantity) - toNum(op.billed_quantity);

      if (remainingQty <= 0) continue;

      // 🔥 STRICT FILTER
      if (isPartial && !itemMap.has(op.product_id)) continue;

      const billQty = isPartial ? itemMap.get(op.product_id) : remainingQty;

      if (billQty <= 0) continue;

      if (billQty > remainingQty) {
        throw new Error(`Over billing product ${op.product_id}`);
      }

      // 🔒 LOCK PRODUCT
      const [[product]] = await connection.query(
        `SELECT * FROM products WHERE id = ? FOR UPDATE`,
        [op.product_id],
      );

      if (!product) throw new Error("Product not found");

      if (toNum(product.stock) < billQty) {
        throw new Error(`Stock low: ${product.product_name}`);
      }

      const rate = toNum(product.price);

      const cgst_rate = toNum(product.cgst_rate);
      const sgst_rate = toNum(product.sgst_rate);
      const igst_rate = toNum(product.igst_rate);

      const gst_total_rate = cgst_rate + sgst_rate + igst_rate;

      const baseTotal = rate * billQty;

      const cgst_amount = (baseTotal * cgst_rate) / 100;
      const sgst_amount = (baseTotal * sgst_rate) / 100;
      const igst_amount = (baseTotal * igst_rate) / 100;

      const gst_total_amount = cgst_amount + sgst_amount + igst_amount;

      const total = baseTotal + gst_total_amount;

      subtotal += baseTotal;
      total_gst += gst_total_amount;
      grand_total += total;

      processedProducts.push({
        product_id: op.product_id,
        product_name: product.product_name,
        product_brand: product.brand,
        product_category: product.category,
        product_quantity: product.quantity,
        quantity: billQty,
        rate,
        hsn_code: product.hsn_code,
        cgst_rate,
        sgst_rate,
        igst_rate,
        gst_total_rate,
        cgst_amount,
        sgst_amount,
        igst_amount,
        gst_total_amount,
        total,
      });
    }

    if (processedProducts.length === 0) {
      throw new Error("Nothing to bill");
    }

    // ======================================================
    // ✅ PAYMENT
    // ======================================================

    const advance_paid =
      toNum(cash_amount) + toNum(upi_amount) + toNum(cheque_amount);

    const balance_due = grand_total - advance_paid;

    if (balance_due < 0) throw new Error("Overpayment not allowed");

    const payment_status =
      advance_paid === 0
        ? "UNPAID"
        : advance_paid < grand_total
          ? "PARTIAL"
          : "PAID";

    // ======================================================
    // ✅ INVOICE NUMBER
    // ======================================================

    const invoice_number = await generateInvoiceNumber(connection);

    // ======================================================
    // ✅ CREATE BILL
    // ======================================================

    const [billResult] = await connection.query(
      `INSERT INTO customerBilling (
        invoice_number,
        invoice_date,
        company_gst_number,
        customer_id,
        customer_name,
        phone_number,
        customer_gst_number,
        vehicle_number,
        eway_bill_number,
        staff_name,
        staff_phone,
        bank_id,
        subtotal,
        grand_total,
        advance_paid,
        balance_due,
        cash_amount,
        upi_amount,
        cheque_amount,
        upi_reference,
        payment_status,
        created_by,
        remarks,
        order_id
      ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        company_gst_number,
        order.customer_id,
        order.customer_name,
        order.customer_phone,
        customer_gst_number,
        vehicle_number,
        eway_bill_number,
        staff_name,
        staff_phone,
        bank_id,
        subtotal,
        grand_total,
        advance_paid,
        balance_due,
        cash_amount,
        upi_amount,
        cheque_amount,
        upi_reference,
        payment_status,
        userId,
        remarks || "Order billing",
        orderId,
      ],
    );

    const billing_id = billResult.insertId;

    // ======================================================
    // ✅ INSERT PRODUCTS + UPDATE ORDER + STOCK
    // ======================================================

    for (const p of processedProducts) {
      await connection.query(
        `INSERT INTO customerBillingProducts (
          billing_id, product_id, product_name, product_brand,
          product_category, product_quantity, hsn_code,
          cgst_rate, sgst_rate, igst_rate, gst_total_rate,
          cgst_amount, sgst_amount, igst_amount, gst_total_amount,
          quantity, rate, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billing_id,
          p.product_id,
          p.product_name,
          p.product_brand,
          p.product_category,
          p.product_quantity,
          p.hsn_code,
          p.cgst_rate,
          p.sgst_rate,
          p.igst_rate,
          p.gst_total_rate,
          p.cgst_amount,
          p.sgst_amount,
          p.igst_amount,
          p.gst_total_amount,
          p.quantity,
          p.rate,
          p.total,
        ],
      );

      await connection.query(
        `UPDATE customerOrderProducts
         SET billed_quantity = billed_quantity + ?
         WHERE order_id = ? AND product_id = ?`,
        [p.quantity, orderId, p.product_id],
      );

      await applyStockChange({
        conn: connection,
        product_id: p.product_id,
        qty_change: -p.quantity,
        reference_type: "SALE",
        reference_id: billing_id,
        remarks: "Order billing",
        userId,
      });
    }

    // ======================================================
    // ✅ UPDATE ORDER STATUS
    // ======================================================

    const [[pending]] = await connection.query(
      `SELECT COUNT(*) as cnt
       FROM customerOrderProducts
       WHERE order_id = ?
       AND quantity > billed_quantity`,
      [orderId],
    );

    const newStatus = pending.cnt > 0 ? "PARTIALLY_BILLED" : "BILLED";

    await connection.query(
      `UPDATE customerOrders SET status = ? WHERE id = ?`,
      [newStatus, orderId],
    );

    // ======================================================
    // ✅ AUDIT LOG
    // ======================================================

    await AuditLog({
      connection,
      table: "customerBilling",
      recordId: billing_id,
      action: "INSERT",
      newData: {
        invoice_number,
        order_id: orderId,
        total: grand_total,
        products: processedProducts,
      },
      userId,
      remarks: "Order billing created",
    });

    await connection.commit();

    res.status(201).json({
      message: "Order billed successfully",
      billing_id,
      invoice_number,
      order_status: newStatus,
    });
  } catch (err) {
    await connection.rollback();

    console.error("Order billing error:", err);

    res.status(400).json({
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
