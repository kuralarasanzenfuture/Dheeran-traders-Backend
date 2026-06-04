import db from "../../../config/db.js";

// export const getAllCustomerBillings = async (req, res) => {
//   try {
//     const [billings] = await db.query(`
//       SELECT
//         cb.id,
//         cb.invoice_number,
//         cb.invoice_date,
//         cb.company_gst_number,
//         cb.customer_id,
//         c.address AS customer_address,
//         cb.customer_name,
//         cb.phone_number,
//         cb.staff_name,
//         cb.staff_phone,
//         cb.subtotal,
//         cb.grand_total,
//         cb.advance_paid,
//         cb.balance_due,
//         cb.cash_amount,
//         cb.upi_amount,
//         cb.cheque_amount,
//         cb.created_at
//       FROM customerBilling cb
//       LEFT JOIN customers c ON c.id = cb.customer_id
//       ORDER BY cb.created_at DESC
//     `);

//     if (!billings.length) return res.json([]);

//     const billingIds = billings.map((b) => b.id);

//     const [products] = await db.query(
//       `
//       SELECT
//         id,
//         billing_id,
//         product_id,
//         product_name,
//         product_brand,
//         product_category,
//         product_quantity,

//         hsn_code,
//         cgst_rate,
//         sgst_rate,
//         gst_total_rate,

//         cgst_amount,
//         sgst_amount,
//         gst_total_amount,

//         discount_percent,
//         discount_amount,

//         quantity,
//         rate,
//         final_rate,
//         total
//       FROM customerBillingProducts
//       WHERE billing_id IN (?)
//     `,
//       [billingIds],
//     );

//     const result = billings.map((b) => ({
//       ...b,
//       products: products.filter((p) => p.billing_id === b.id),
//     }));

//     res.json(result);
//   } catch (err) {
//     console.error("Billing fetch error:", err);
//     res.status(500).json({ message: "Failed to fetch billing data" });
//   }
// };

export const getAllCustomerBillings = async (req, res) => {
  try {
    // ✅ 1. BILLINGS
    const [billings] = await db.query(`
      SELECT
        cb.id,
        cb.invoice_number,
        cb.invoice_date,
        cb.company_gst_number,
        cb.customer_id,
        c.address AS customer_address,
        cb.customer_name,
        cb.phone_number,
        cb.staff_name,
        cb.staff_phone,
        cb.subtotal,
        cb.grand_total,
        cb.advance_paid,
        cb.balance_due,
        cb.cash_amount,
        cb.upi_amount,
        cb.cheque_amount,
        cb.created_at
      FROM customerBilling cb
      LEFT JOIN customers c ON c.id = cb.customer_id
      ORDER BY cb.created_at DESC
    `);

    if (!billings.length) return res.json([]);

    const billingIds = billings.map((b) => b.id);

    // ✅ 2. PRODUCTS
    const [products] = await db.query(
      `
      SELECT
        id, 
        billing_id,
        product_id,
        product_name,
        product_brand,
        product_category,
        product_quantity,

        hsn_code,
        cgst_rate,
        sgst_rate,
        gst_total_rate,

        cgst_amount,
        sgst_amount,
        gst_total_amount,

        discount_percent,
        discount_amount,

        quantity,
        rate,
        final_rate,
        total,
        returned_quantity,
        (quantity - COALESCE(returned_quantity, 0)) AS remaining_quantity
      FROM customerBillingProducts
      WHERE billing_id IN (?)
    `,
      [billingIds],
    );

    // ✅ 3. PAYMENTS
    const [payments] = await db.query(
      `
      SELECT 
        billing_id,
        SUM(total_amount) AS paid_amount
      FROM customerBillingPayment
      WHERE billing_id IN (?)
      GROUP BY billing_id
    `,
      [billingIds],
    );

    // 👉 Convert payments to map for fast lookup
    const paymentMap = {};
    payments.forEach((p) => {
      paymentMap[p.billing_id] = Number(p.paid_amount);
    });

    // ✅ 4. FINAL STRUCTURE
    const result = billings.map((b) => {
      const paymentSum = paymentMap[b.id] || 0;

      const total_paid_amount = Number(b.advance_paid || 0) + paymentSum;

      const total_pending_amount = Number(b.grand_total) - total_paid_amount;

      return {
        ...b,

        // 🔥 ADD THESE
        total_paid_amount,
        total_pending_amount,

        products: products.filter((p) => p.billing_id === b.id),
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Billing fetch error:", err);
    res.status(500).json({ message: "Failed to fetch billing data" });
  }
};

export const getCustomerBillingById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[billing]] = await db.query(
      `
      SELECT
        cb.*,
        c.address AS customer_address,
        cbd.bank_name,
        cbd.account_name,
        cbd.account_number,
        cbd.ifsc_code,
        cbd.branch,
        cbd.qr_code_image
      FROM customerBilling cb
      LEFT JOIN customers c ON c.id = cb.customer_id
      LEFT JOIN company_bank_details cbd ON cbd.id = cb.bank_id
      WHERE cb.id = ?
    `,
      [id],
    );

    if (!billing) return res.status(404).json({ message: "Invoice not found" });

    const [products] = await db.query(
      `
      SELECT
        billing_id,
        product_id,
        product_name,
        product_brand,
        product_category,
        product_quantity,

        hsn_code,
        cgst_rate,
        sgst_rate,
        gst_total_rate,

        cgst_amount,
        sgst_amount,
        gst_total_amount,

        discount_percent,
        discount_amount,

        quantity,
        rate,
        final_rate,
        total
      FROM customerBillingProducts
      WHERE billing_id = ?
    `,
      [id],
    );

    res.json({ billing, products });
  } catch (err) {
    console.error("Invoice fetch error:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

export const getHighestSellingBrand = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        product_brand,
        SUM(quantity) AS total_quantity_sold
      FROM customerBillingProducts
      GROUP BY product_brand
      ORDER BY total_quantity_sold DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No sales data found" });
    }

    res.json({
      highest_selling_brand: rows[0].product_brand,
      total_quantity_sold: rows[0].total_quantity_sold,
    });
  } catch (err) {
    console.error("Highest selling brand error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCustomerProductFullData = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        cbp.id AS billing_product_id,
        cb.id AS billing_id,
        cb.invoice_number,
        cb.invoice_date,

        cb.customer_id,
        cb.customer_name,
        cb.phone_number,
        cb.customer_gst_number,

        cb.staff_name,
        cb.staff_phone,

        cb.subtotal,
        cb.grand_total,
        cb.advance_paid,
        cb.balance_due,
        cb.cash_amount,
        cb.upi_amount,
        cb.cheque_amount,
        cb.created_at,

        cbp.product_id,
        cbp.product_name,
        cbp.product_brand,
        cbp.product_category,
        cbp.product_quantity,

        cbp.hsn_code,
        cbp.cgst_rate,
        cbp.sgst_rate,
        cbp.gst_total_rate,

        cbp.cgst_amount,
        cbp.sgst_amount,
        cbp.gst_total_amount,

        cbp.discount_percent,
        cbp.discount_amount,

        cbp.quantity,
        cbp.rate,
        cbp.final_rate,
        cbp.total

      FROM customerBillingProducts cbp
      JOIN customerBilling cb ON cbp.billing_id = cb.id
      ORDER BY cb.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const productWiseReport = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        product_id,
        product_name,
        product_brand,
        product_category,
        product_quantity,
        DATE(created_at) AS created_at,
        SUM(quantity) AS total_quantity_sold,
        SUM(total) AS total_sales_amount
      FROM customerBillingProducts
      GROUP BY
        product_id,
        product_name,
        product_brand,
        product_category,
        product_quantity,
        DATE(created_at)
      ORDER BY total_quantity_sold DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Product wise report error:", err);
    res.status(500).json({ message: "Failed to fetch product wise report" });
  }
};

export const productWiseReportByDate = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const [rows] = await db.query(
      `
      SELECT 
        cbp.product_id,
        cbp.product_name,
        cbp.product_brand,
        cbp.product_category,
        cbp.product_quantity,
        SUM(cbp.quantity) AS total_quantity_sold
      FROM customerBillingProducts cbp
      JOIN customerBilling cb ON cb.id = cbp.billing_id
      WHERE DATE(cb.created_at) >= ? 
        AND DATE(cb.created_at) <= ?
      GROUP BY
        cbp.product_id,
        cbp.product_name,
        cbp.product_brand,
        cbp.product_category,
        cbp.product_quantity
      ORDER BY total_quantity_sold DESC
    `,
      [fromDate, toDate],
    );

    res.json(rows);
  } catch (err) {
    console.error("Product wise report error:", err);
    res.status(500).json({ message: "Failed to fetch product wise report" });
  }
};

/* BRAND WISE – ALL BRANDS */
export const brandWiseReport = async (req, res) => {
  const [rows] = await db.query(`
    SELECT 
      TRIM(cbp.product_brand) AS brand,
      SUM(cbp.quantity) AS qty,
      SUM(cbp.total) AS total_sales_amount
    FROM customerBillingProducts cbp
    WHERE cbp.product_brand IS NOT NULL
      AND cbp.product_brand != ''
    GROUP BY cbp.product_brand
    ORDER BY qty DESC
  `);

  res.json(rows);
};

/* CUSTOMER WISE */
export const customerWiseReport = async (req, res) => {
  const [rows] = await db.query(`
    SELECT
      cb.customer_id,
      cb.customer_name,
      SUM(cbp.quantity) AS total_items,
      SUM(cbp.total) AS total_spent
    FROM customerBilling cb
    JOIN customerBillingProducts cbp ON cb.id = cbp.billing_id
    GROUP BY cb.customer_id, cb.customer_name
    ORDER BY total_spent DESC
  `);
  res.json(rows);
};

export const getPendingBills = async (req, res) => {
  try {
    // const [billings] = await db.query(`
    //   SELECT
    //     cb.id,
    //     cb.invoice_number,
    //     cb.invoice_date,

    //     CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
    //     c.phone AS phone_number,

    //     cb.grand_total,
    //     cb.advance_paid,
    //     cb.balance_due,

    //     cb.created_at
    //   FROM customerBilling cb
    //   JOIN customers c ON c.id = cb.customer_id
    //   WHERE cb.balance_due > 0
    //   ORDER BY cb.created_at DESC
    // `);

    const [billings] = await db.query(`
  SELECT
    cb.id,
    cb.invoice_number,
    cb.invoice_date,

    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
    c.phone AS phone_number,

    cb.grand_total,
    cb.advance_paid,

    -- 🔥 TOTAL PAID (advance + payments)
    cb.advance_paid + COALESCE(SUM(p.total_amount), 0) AS total_paid_amount,

    cb.balance_due,
    cb.created_at

  FROM customerBilling cb
  JOIN customers c ON c.id = cb.customer_id

  LEFT JOIN customerBillingPayment p 
    ON p.billing_id = cb.id

  WHERE cb.balance_due > 0

  GROUP BY cb.id
  ORDER BY cb.created_at DESC
`);

    res.json(billings);
  } catch (err) {
    console.error("Pending billing fetch error:", err);
    res.status(500).json({ message: "Failed to fetch pending bills" });
  }
};

export const getLastInvoiceNumber = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT invoice_number 
      FROM customerBilling 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.json({ lastInvoiceNumber: null });
    }

    return res.json({
      lastInvoiceNumber: rows[0].invoice_number,
    });
  } catch (error) {
    console.error("Error fetching last invoice:", error);
    return res
      .status(500)
      .json({ message: "Failed to get last invoice number" });
  }
};

// export const getNextInvoiceNumber = async (req, res) => {
//   try {
//     const now = new Date();

//     let startYear = now.getFullYear();

//     // Financial year logic (Apr–Mar)
//     if (now.getMonth() < 3) {
//       startYear -= 1;
//     }

//     const shortStartYear = startYear.toString().slice(-2);
//     const shortEndYear = (startYear + 1).toString().slice(-2);

//     const financialYear = `${shortStartYear}-${shortEndYear}`;

//     const [rows] = await db.query(
//       `
//       SELECT invoice_number 
//       FROM customerBilling 
//       WHERE invoice_number LIKE ?
//       ORDER BY created_at DESC 
//       LIMIT 1
//       `,
//       [`INV/${financialYear}/%`],
//     );

//     let nextNumber = 1;

//     if (rows.length > 0) {
//       const lastInvoice = rows[0].invoice_number; // INV/26-27/0002

//       const parts = lastInvoice.split("/");
//       const lastNumber = Number(parts[2]);

//       nextNumber = lastNumber + 1;
//     }

//     const padded = String(nextNumber).padStart(4, "0");

//     const nextInvoice = `INV/${financialYear}/${padded}`;

//     return res.json({
//       nextInvoiceNumber: nextInvoice,
//     });
//   } catch (error) {
//     console.error("Error generating next invoice:", error);
//     return res
//       .status(500)
//       .json({ message: "Failed to generate next invoice number" });
//   }
// };

// export const getAssignedPendingBills = async (req, res) => {
//   try {
//     const user_id = req.user?.id;

//     if (!user_id) throw new Error("Unauthorized");

//     const [rows] = await db.query(
//       `
//       SELECT
//         cb.id AS billing_id,
//         cb.invoice_number,
//         cb.invoice_date,

//         cb.customer_id,
//         c.first_name,
//         c.last_name,
//         c.phone,

//         cb.grand_total,
//         cb.advance_paid,
//         cb.balance_due,
//         cb.payment_status,

//         cb.created_at

//       FROM customerBilling cb

//       JOIN customers c
//         ON c.id = cb.customer_id

//       JOIN user_bill_customer_assignments uca
//         ON uca.customer_id = cb.customer_id

//       WHERE uca.user_id = ?
//         AND uca.is_active = TRUE

//         AND cb.balance_due > 0
//         AND cb.status = 'ACTIVE'

//       ORDER BY cb.invoice_date ASC
//       `,
//       [user_id]
//     );

//     return res.json({
//       success: true,
//       count: rows.length,
//       data: rows,
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const getNextInvoiceNumber = async (req, res) => {
  try {
    const now = new Date();

    let startYear = now.getFullYear();

    if (now.getMonth() < 3) {
      startYear -= 1;
    }

    const shortStartYear = startYear.toString().slice(-2);
    const shortEndYear = (startYear + 1).toString().slice(-2);
    const financialYear = `${shortStartYear}-${shortEndYear}`;

    const [rows] = await db.query(
      `
      SELECT invoice_number, staff_name, staff_phone 
      FROM customerBilling 
      WHERE invoice_number LIKE ?
      ORDER BY CAST(SUBSTRING_INDEX(invoice_number, '/', -1) AS UNSIGNED) DESC
      LIMIT 1
      `,
      [`INV/${financialYear}/%`],
    );

    let nextNumber = 1;
    let staffName = null;
    let staffPhone = null;

    if (rows.length > 0) {
      const lastInvoice = rows[0].invoice_number;
      const parts = lastInvoice.split("/");
      const lastNumber = parts[2] ? parseInt(parts[2], 10) : 0;

      nextNumber = lastNumber + 1;

      staffName = rows[0].staff_name;
      staffPhone = rows[0].staff_phone;
    }

    const padded = String(nextNumber).padStart(4, "0");
    const nextInvoice = `INV/${financialYear}/${padded}`;

    return res.json({
      nextInvoiceNumber: nextInvoice,
      staffName,
      staffPhone,
    });
  } catch (error) {
    console.error("Error generating next invoice:", error);
    return res.status(500).json({
      message: "Failed to generate next invoice number",
    });
  }
};

export const getAssignedPendingBills = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const role = req.user?.role;

    if (!user_id) throw new Error("Unauthorized");

    let query = `
      SELECT 
        cb.id AS billing_id,
        cb.invoice_number,
        cb.invoice_date,

        cb.customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.place,
        c.address,


        cb.grand_total,
        cb.advance_paid,
        cb.balance_due,
        cb.payment_status,

        cb.created_at

      FROM customerBilling cb
      JOIN customers c ON c.id = cb.customer_id
    `;

    let params = [];

    // 🔥 USER → only assigned
    if (role !== "ADMIN") {
      query += `
        JOIN user_bill_customer_assignments uca 
          ON uca.customer_id = cb.customer_id

        WHERE uca.user_id = ?
          AND uca.is_active = TRUE
      `;
      params.push(user_id);
    } else {
      // 🔥 ADMIN → all customers
      query += `
        WHERE 1=1
      `;
    }

    // 🔥 COMMON FILTER
    query += `
      AND cb.balance_due > 0
      AND cb.status = 'ACTIVE'
      ORDER BY cb.invoice_date ASC
    `;

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getUserPaymentCollectionReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    let dateFilter = "";
    let params = [];

    if (from && to) {
      dateFilter = "AND b.invoice_date BETWEEN ? AND ?";
      params.push(from, to);
    }

    /* ================= USER SUMMARY ================= */
    const [users] = await db.query(`
      SELECT 
        b.created_by AS user_id,
        u.username,
        u.phone,

        COUNT(DISTINCT b.id) AS total_invoices,
        COALESCE(SUM(b.grand_total), 0) AS total_billed,

        COALESCE(SUM(p.total_amount), 0) AS total_collected,

        COALESCE(SUM(p.cash_amount), 0) AS cash_collected,
        COALESCE(SUM(p.upi_amount), 0) AS upi_collected,
        COALESCE(SUM(p.cheque_amount), 0) AS cheque_collected

      FROM customerBilling b

      LEFT JOIN customerBillingPayment p 
        ON b.id = p.billing_id

      LEFT JOIN users_roles u 
        ON b.created_by = u.id

      WHERE b.created_by IS NOT NULL
      ${dateFilter}

      GROUP BY b.created_by, u.username, u.phone
      ORDER BY total_collected DESC
    `, params);

    /* ================= PRODUCT BREAKDOWN ================= */
    const [products] = await db.query(`
      SELECT 
        b.created_by AS user_id,
        bp.product_id,
        bp.product_name,

        SUM(bp.quantity) AS total_quantity,
        SUM(bp.total) AS total_sales

      FROM customerBilling b

      JOIN customerBillingProducts bp 
        ON b.id = bp.billing_id

      WHERE b.created_by IS NOT NULL
      ${dateFilter}

      GROUP BY 
        b.created_by, 
        bp.product_id, 
        bp.product_name
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
        total_quantity: Number(p.total_quantity),
        total_sales: Number(p.total_sales),
      });
    }

    const result = users.map((user) => ({
      user_id: user.user_id,
      username: user.username || "Unknown",
      phone: user.phone || "-",

      total_invoices: Number(user.total_invoices),
      total_billed: Number(user.total_billed),

      total_collected: Number(user.total_collected),

      cash_collected: Number(user.cash_collected),
      upi_collected: Number(user.upi_collected),
      cheque_collected: Number(user.cheque_collected),

      products: productMap[user.user_id] || [],
    }));

    res.json({
      success: true,
      data: result,
    });

  } catch (err) {
    console.error("User Payment Collection Report Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// export const getUserDateWiseCollection = async (req, res) => {
//   try {
//     const { from, to } = req.query;

//     let dateFilter = "";
//     let params = [];

//     if (from && to) {
//       dateFilter = "AND p.payment_date BETWEEN ? AND ?";
//       params.push(from, to);
//     }

//     const [rows] = await db.query(`
//       SELECT 
//         b.created_by AS user_id,
//         u.username,
//         u.phone,

//         p.payment_date,

//         SUM(p.total_amount) AS total_collected,
//         SUM(p.cash_amount) AS cash_collected,
//         SUM(p.upi_amount) AS upi_collected,
//         SUM(p.cheque_amount) AS cheque_collected

//       FROM customerBillingPayment p

//       JOIN customerBilling b 
//         ON p.billing_id = b.id

//       LEFT JOIN users_roles u 
//         ON b.created_by = u.id

//       WHERE b.created_by IS NOT NULL
//       ${dateFilter}

//       GROUP BY 
//         b.created_by,
//         u.username,
//         u.phone,
//         p.payment_date

//       ORDER BY 
//         p.payment_date DESC,
//         total_collected DESC
//     `, params);

//     res.json({
//       success: true,
//       data: rows.map(r => ({
//         user_id: r.user_id,
//         username: r.username || "Unknown",
//         phone: r.phone || "-",

//         payment_date: r.payment_date,

//         total_collected: Number(r.total_collected),
//         cash_collected: Number(r.cash_collected),
//         upi_collected: Number(r.upi_collected),
//         cheque_collected: Number(r.cheque_collected),
//       }))
//     });

//   } catch (err) {
//     console.error("Date-wise Collection Error:", err);

//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

/** USER DATE-WISE COLLECTION REPORT - GROUPED */

export const getUserDateWiseCollection = async (req, res) => {
  try {
    const { from, to } = req.query;

    let dateFilter = "";
    let params = [];

    if (from && to) {
      dateFilter = "AND p.payment_date BETWEEN ? AND ?";
      params.push(from, to);
    }

    const [rows] = await db.query(`
      SELECT 
        b.created_by AS user_id,
        u.username,
        u.phone,

        p.payment_date,

        SUM(p.total_amount) AS total_collected,
        SUM(p.cash_amount) AS cash_collected,
        SUM(p.upi_amount) AS upi_collected,
        SUM(p.cheque_amount) AS cheque_collected

      FROM customerBillingPayment p
      JOIN customerBilling b ON p.billing_id = b.id
      LEFT JOIN users_roles u ON b.created_by = u.id

      WHERE b.created_by IS NOT NULL
      ${dateFilter}

      GROUP BY 
        b.created_by,
        u.username,
        u.phone,
        p.payment_date

      ORDER BY p.payment_date DESC
    `, params);

    /* 🔥 GROUPING LOGIC */

    const userMap = {};

    for (const row of rows) {
      if (!userMap[row.user_id]) {
        userMap[row.user_id] = {
          user_id: row.user_id,
          username: row.username || "Unknown",
          phone: row.phone || "-",
          total_collected: Number(row.total_collected),
          cash_collected: Number(row.cash_collected),
          upi_collected: Number(row.upi_collected),
          cheque_collected: Number(row.cheque_collected),
          collections: []
        };
      }

      userMap[row.user_id].collections.push({
        payment_date: row.payment_date,
        total_collected: Number(row.total_collected),
        cash_collected: Number(row.cash_collected),
        upi_collected: Number(row.upi_collected),
        cheque_collected: Number(row.cheque_collected),
      });
    }

    const result = Object.values(userMap);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("Grouped Collection Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};