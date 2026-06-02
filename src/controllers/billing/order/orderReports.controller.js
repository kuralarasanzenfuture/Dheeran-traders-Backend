import db from "../../../config/db.js";

export const getOrderSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) AS total_orders,
        SUM(op.total_amount) AS total_revenue,
        SUM(CASE WHEN o.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN o.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM customerOrders o
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
    `);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrdersByDateRange = async (req, res) => {
  const { from, to } = req.query;

  try {
    const [rows] = await db.query(`
      SELECT 
        o.id,
        o.order_number,
        o.order_date,
        o.status,
        SUM(op.total_amount) AS order_total
      FROM customerOrders o
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      WHERE o.order_date BETWEEN ? AND ?
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `, [from, to]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerReport = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.customer_id,
        o.customer_name,
        COUNT(DISTINCT o.id) AS total_orders,
        SUM(op.total_amount) AS total_spent
      FROM customerOrders o
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      GROUP BY o.customer_id, o.customer_name
      ORDER BY total_spent DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductSalesReport = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.product_name,
        SUM(op.quantity) AS total_quantity,
        SUM(op.total_amount) AS total_revenue
      FROM customerOrderProducts op
      JOIN products p ON op.product_id = p.id
      GROUP BY p.id
      ORDER BY total_quantity DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDeliveryReport = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) AS total_delivered,
        SUM(CASE 
          WHEN delivery_date <= expected_delivery_date THEN 1 
          ELSE 0 
        END) AS on_time,
        SUM(CASE 
          WHEN delivery_date > expected_delivery_date THEN 1 
          ELSE 0 
        END) AS delayed_count
      FROM customerOrders
      WHERE status = 'DELIVERED'
    `);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCancelledOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(DISTINCT o.id) AS cancelled_orders,
        SUM(op.total_amount) AS lost_revenue
      FROM customerOrders o
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      WHERE o.status = 'CANCELLED'
    `);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getUserOrderReport = async (req, res) => {
//   try {
//     const { from, to } = req.query;

//     let dateFilter = "";
//     let params = [];

//     if (from && to) {
//       dateFilter = "AND o.order_date BETWEEN ? AND ?";
//       params.push(from, to);
//     }

//     /* ================= USER SUMMARY ================= */
//     const [users] = await db.query(`
//       SELECT 
//         o.created_by AS user_id,
//         COUNT(DISTINCT o.id) AS total_orders,
//         COALESCE(SUM(op.total_amount), 0) AS total_revenue
//       FROM customerOrders o
//       LEFT JOIN customerOrderProducts op 
//         ON o.id = op.order_id
//       WHERE o.created_by IS NOT NULL
//       ${dateFilter}
//       GROUP BY o.created_by
//       ORDER BY total_revenue DESC
//     `, params);

//     /* ================= PRODUCT DETAILS ================= */
//     const [products] = await db.query(`
//       SELECT 
//         o.created_by AS user_id,
//         op.product_id,
//         p.product_name,
//         SUM(op.quantity) AS total_quantity,
//         SUM(op.total_amount) AS total_revenue
//       FROM customerOrders o
//       JOIN customerOrderProducts op 
//         ON o.id = op.order_id
//       JOIN products p 
//         ON op.product_id = p.id
//       WHERE o.created_by IS NOT NULL
//       ${dateFilter}
//       GROUP BY 
//         o.created_by, 
//         op.product_id, 
//         p.product_name
//     `, params);

//     /* ================= MERGE (OPTIMIZED) ================= */

//     const productMap = {};

//     for (const p of products) {
//       if (!productMap[p.user_id]) {
//         productMap[p.user_id] = [];
//       }

//       productMap[p.user_id].push({
//         product_id: p.product_id,
//         product_name: p.product_name,
//         total_quantity: Number(p.total_quantity),
//         total_revenue: Number(p.total_revenue),
//       });
//     }

//     const result = users.map((user) => ({
//       user_id: user.user_id,
//       total_orders: Number(user.total_orders),
//       total_revenue: Number(user.total_revenue),
//       products: productMap[user.user_id] || [],
//     }));

//     /* ================= RESPONSE ================= */

//     res.json({
//       success: true,
//       data: result,
//     });

//   } catch (err) {
//     console.error("User Order Report Error:", err);

//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const getUserOrderReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    let dateFilter = "";
    let params = [];

    if (from && to) {
      dateFilter = "AND o.order_date BETWEEN ? AND ?";
      params.push(from, to);
    }

    /* ================= USER SUMMARY ================= */
    const [users] = await db.query(`
      SELECT 
        o.created_by AS user_id,
        u.username,
        u.phone,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(op.total_amount), 0) AS total_revenue
      FROM customerOrders o
      LEFT JOIN customerOrderProducts op 
        ON o.id = op.order_id
      LEFT JOIN users_roles u 
        ON o.created_by = u.id   -- 🔥 JOIN USER TABLE
      WHERE o.created_by IS NOT NULL
      ${dateFilter}
      GROUP BY o.created_by, u.username, u.phone
      ORDER BY total_revenue DESC
    `, params);

    /* ================= PRODUCT DETAILS ================= */
    const [products] = await db.query(`
      SELECT 
        o.created_by AS user_id,
        op.product_id,
        p.product_name,
        p.brand,
        p.category,
        p.category,
        p.quantity,
        p.price,
        SUM(op.quantity) AS total_quantity,
        SUM(op.total_amount) AS total_revenue
      FROM customerOrders o
      JOIN customerOrderProducts op 
        ON o.id = op.order_id
      JOIN products p 
        ON op.product_id = p.id
      WHERE o.created_by IS NOT NULL
      ${dateFilter}
      GROUP BY 
        o.created_by, 
        op.product_id, 
        p.product_name
    `, params);

    /* ================= MERGE ================= */

    const productMap = {};

    for (const p of products) {
      if (!productMap[p.user_id]) {
        productMap[p.user_id] = [];
      }

      productMap[p.user_id].push({
        product_id: p.product_id,
        product_name: p.product_name,
        brand: p.brand,
        category: p.category,
        quantity: p.quantity,
        price: p.price,
        total_quantity: Number(p.total_quantity),
        total_revenue: Number(p.total_revenue),
      });
    }

    const result = users.map((user) => ({
      user_id: user.user_id,
      username: user.username,
      phone: user.phone,
      total_orders: Number(user.total_orders),
      total_revenue: Number(user.total_revenue),
      products: productMap[user.user_id] || [],
    }));

    res.json({
      success: true,
      data: result,
    });

  } catch (err) {
    console.error("User Order Report Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
