import db from "../../../config/db.js";

/**
 * Helper to extract standardized start and end dates from req.query
 */
const getDateRange = (query) => {
  const start = query.from || query.startDate || query.fromDate || null;
  const end = query.to || query.endDate || query.toDate || null;
  return { start, end };
};

/**
 * 📊 1. Order Summary
 * Counts unique orders and total revenue with status breakdown and optional date/customer/user filtering.
 */
export const getOrderSummary = async (req, res) => {
  try {
    const {
      customer_id,
      created_by,
      status,
    } = req.query;

    const { start, end } = getDateRange(req.query);

    const conditions = [];
    const params = [];

    if (start && end) {
      conditions.push("o.order_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("o.order_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("o.order_date <= ?");
      params.push(end);
    }

    if (customer_id) {
      conditions.push("o.customer_id = ?");
      params.push(customer_id);
    }

    if (created_by) {
      conditions.push("o.created_by = ?");
      params.push(created_by);
    }

    if (status && status !== "ALL") {
      conditions.push("o.status = ?");
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT 
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(op.total_amount), 0) AS total_revenue,
        COALESCE(SUM(op.quantity), 0) AS total_items_quantity,
        COUNT(DISTINCT CASE WHEN o.status = 'PENDING' THEN o.id END) AS pending,
        COUNT(DISTINCT CASE WHEN o.status = 'CONFIRMED' THEN o.id END) AS confirmed,
        COUNT(DISTINCT CASE WHEN o.status = 'PARTIALLY_BILLED' THEN o.id END) AS partially_billed,
        COUNT(DISTINCT CASE WHEN o.status = 'BILLED' THEN o.id END) AS billed,
        COUNT(DISTINCT CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS delivered,
        COUNT(DISTINCT CASE WHEN o.status = 'CANCELLED' THEN o.id END) AS cancelled
      FROM customerOrders o
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      ${whereClause}
      `,
      params
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Order summary error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 📅 2. Orders by Date Range
 * Returns orders with total amounts and customer details. Safe against missing dates.
 */
export const getOrdersByDateRange = async (req, res) => {
  try {
    const {
      status,
      customer_id,
      created_by,
      search,
    } = req.query;

    const { start, end } = getDateRange(req.query);

    const conditions = [];
    const params = [];

    if (start && end) {
      conditions.push("o.order_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("o.order_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("o.order_date <= ?");
      params.push(end);
    }

    if (status && status !== "ALL") {
      conditions.push("o.status = ?");
      params.push(status);
    }

    if (customer_id) {
      conditions.push("o.customer_id = ?");
      params.push(customer_id);
    }

    if (created_by) {
      conditions.push("o.created_by = ?");
      params.push(created_by);
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        o.order_number LIKE ? OR
        o.customer_name LIKE ? OR
        c.phone LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT 
        o.id,
        o.order_number,
        o.customer_id,
        o.customer_name,
        c.phone AS customer_phone,
        c.place AS customer_place,
        o.order_date,
        o.expected_delivery_date,
        o.delivery_date,
        o.status,
        COALESCE(SUM(op.total_amount), 0) AS order_total,
        COALESCE(SUM(op.quantity), 0) AS total_quantity,
        COUNT(DISTINCT op.product_id) AS total_items
      FROM customerOrders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      ${whereClause}
      GROUP BY o.id, c.phone, c.place
      ORDER BY o.order_date DESC, o.id DESC
      `,
      params
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("Orders by date range error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 👤 3. Customer Order Report
 * Summarizes orders, items, and spend per customer with date range and search filtering.
 */
export const getCustomerReport = async (req, res) => {
  try {
    const {
      search,
      area_id,
      customer_id,
    } = req.query;

    const { start, end } = getDateRange(req.query);

    const conditions = [];
    const params = [];

    if (start && end) {
      conditions.push("o.order_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("o.order_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("o.order_date <= ?");
      params.push(end);
    }

    if (customer_id) {
      conditions.push("o.customer_id = ?");
      params.push(customer_id);
    }

    if (area_id) {
      conditions.push("c.area_id = ?");
      params.push(area_id);
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        o.customer_name LIKE ? OR
        c.first_name LIKE ? OR
        c.phone LIKE ? OR
        c.place LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT 
        o.customer_id,
        o.customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.place AS customer_place,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(op.total_amount), 0) AS total_spent,
        COALESCE(SUM(op.quantity), 0) AS total_items_purchased
      FROM customerOrders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      ${whereClause}
      GROUP BY o.customer_id, o.customer_name, c.phone, c.email, c.place
      ORDER BY total_spent DESC
      `,
      params
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("Customer report error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 📦 4. Product Sales Report
 * Aggregates quantity and revenue per product. Excludes cancelled orders by default.
 */
export const getProductSalesReport = async (req, res) => {
  try {
    const {
      category,
      brand,
      search,
      status,
    } = req.query;

    const { start, end } = getDateRange(req.query);

    const conditions = [];
    const params = [];

    // Exclude cancelled orders by default unless specified
    if (status && status !== "ALL") {
      conditions.push("o.status = ?");
      params.push(status);
    } else if (!status) {
      conditions.push("o.status != 'CANCELLED'");
    }

    if (start && end) {
      conditions.push("o.order_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("o.order_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("o.order_date <= ?");
      params.push(end);
    }

    if (category && category.trim()) {
      conditions.push("p.category = ?");
      params.push(category.trim());
    }

    if (brand && brand.trim()) {
      conditions.push("p.brand = ?");
      params.push(brand.trim());
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        p.product_name LIKE ? OR
        p.brand LIKE ? OR
        p.category LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.product_name,
        p.brand,
        p.category,
        p.price,
        COALESCE(SUM(op.quantity), 0) AS total_quantity,
        COALESCE(SUM(op.total_amount), 0) AS total_revenue,
        COUNT(DISTINCT o.id) AS order_count
      FROM customerOrderProducts op
      JOIN products p ON op.product_id = p.id
      JOIN customerOrders o ON op.order_id = o.id
      ${whereClause}
      GROUP BY p.id, p.product_name, p.brand, p.category, p.price
      ORDER BY total_quantity DESC
      `,
      params
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("Product sales report error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 🚚 5. Delivery Report
 * Shows delivery performance metrics (on-time vs delayed) with date filtering.
 */
export const getDeliveryReport = async (req, res) => {
  try {
    const { customer_id } = req.query;
    const { start, end } = getDateRange(req.query);

    const conditions = ["status = 'DELIVERED'"];
    const params = [];

    if (start && end) {
      conditions.push("delivery_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("delivery_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("delivery_date <= ?");
      params.push(end);
    }

    if (customer_id) {
      conditions.push("customer_id = ?");
      params.push(customer_id);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.query(
      `
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
      ${whereClause}
      `,
      params
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Delivery report error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ❌ 6. Cancelled Orders Report
 * Shows total cancelled orders and lost revenue with summary and order details.
 */
export const getCancelledOrders = async (req, res) => {
  try {
    const { customer_id, created_by, search } = req.query;
    const { start, end } = getDateRange(req.query);

    const conditions = ["o.status = 'CANCELLED'"];
    const params = [];

    if (start && end) {
      conditions.push("o.order_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("o.order_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("o.order_date <= ?");
      params.push(end);
    }

    if (customer_id) {
      conditions.push("o.customer_id = ?");
      params.push(customer_id);
    }

    if (created_by) {
      conditions.push("o.created_by = ?");
      params.push(created_by);
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(`(
        o.order_number LIKE ? OR
        o.customer_name LIKE ? OR
        c.phone LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Summary query
    const [summaryRows] = await db.query(
      `
      SELECT 
        COUNT(DISTINCT o.id) AS cancelled_orders,
        COALESCE(SUM(op.total_amount), 0) AS lost_revenue
      FROM customerOrders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      ${whereClause}
      `,
      params
    );

    // Detailed orders list
    const [ordersList] = await db.query(
      `
      SELECT 
        o.id,
        o.order_number,
        o.customer_id,
        o.customer_name,
        c.phone AS customer_phone,
        o.order_date,
        o.remarks,
        o.created_by,
        uc.username AS created_by_name,
        COALESCE(SUM(op.total_amount), 0) AS lost_amount
      FROM customerOrders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users_roles uc ON o.created_by = uc.id
      LEFT JOIN customerOrderProducts op ON o.id = op.order_id
      ${whereClause}
      GROUP BY o.id, c.phone, uc.username
      ORDER BY o.order_date DESC, o.id DESC
      `,
      params
    );

    res.json({
      success: true,
      summary: summaryRows[0],
      data: summaryRows[0],
      orders: ordersList,
    });
  } catch (err) {
    console.error("Cancelled orders report error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 👥 7. User Order Report
 * Aggregates performance by sales rep/user with product breakdown.
 * Fully compatible with MySQL ONLY_FULL_GROUP_BY.
 */
export const getUserOrderReport = async (req, res) => {
  try {
    const { user_id } = req.query;
    const { start, end } = getDateRange(req.query);

    const conditions = ["o.created_by IS NOT NULL"];
    const params = [];

    if (start && end) {
      conditions.push("o.order_date BETWEEN ? AND ?");
      params.push(start, end);
    } else if (start) {
      conditions.push("o.order_date >= ?");
      params.push(start);
    } else if (end) {
      conditions.push("o.order_date <= ?");
      params.push(end);
    }

    if (user_id) {
      conditions.push("o.created_by = ?");
      params.push(user_id);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    /* ================= USER SUMMARY ================= */
    const [users] = await db.query(
      `
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
        ON o.created_by = u.id
      ${whereClause}
      GROUP BY o.created_by, u.username, u.phone
      ORDER BY total_revenue DESC
      `,
      params
    );

    /* ================= PRODUCT DETAILS ================= */
    const [products] = await db.query(
      `
      SELECT 
        o.created_by AS user_id,
        op.product_id,
        p.product_name,
        p.brand,
        p.category,
        p.price,
        SUM(op.quantity) AS total_quantity,
        SUM(op.total_amount) AS total_revenue
      FROM customerOrders o
      JOIN customerOrderProducts op 
        ON o.id = op.order_id
      JOIN products p 
        ON op.product_id = p.id
      ${whereClause}
      GROUP BY 
        o.created_by, 
        op.product_id, 
        p.product_name,
        p.brand,
        p.category,
        p.price
      `,
      params
    );

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
    console.error("User Order Report Error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
