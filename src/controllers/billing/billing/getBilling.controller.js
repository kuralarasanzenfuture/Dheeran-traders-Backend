import db from "../../../config/db.js";


export const getAllCustomerBillings = async (req, res) => {
  try {
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
      WHERE billing_id IN (?)
    `,
      [billingIds],
    );

    const result = billings.map((b) => ({
      ...b,
      products: products.filter((p) => p.billing_id === b.id),
    }));

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
    const [billings] = await db.query(`
      SELECT
        cb.id,
        cb.invoice_number,
        cb.invoice_date,

        CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
        c.phone AS phone_number,

        cb.grand_total,
        cb.advance_paid,
        cb.balance_due,

        cb.created_at
      FROM customerBilling cb
      JOIN customers c ON c.id = cb.customer_id
      WHERE cb.balance_due > 0
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

export const getNextInvoiceNumber = async (req, res) => {
  try {
    const now = new Date();

    let startYear = now.getFullYear();

    // Financial year logic (Apr–Mar)
    if (now.getMonth() < 3) {
      startYear -= 1;
    }

    const shortStartYear = startYear.toString().slice(-2);
    const shortEndYear = (startYear + 1).toString().slice(-2);

    const financialYear = `${shortStartYear}-${shortEndYear}`;

    const [rows] = await db.query(
      `
      SELECT invoice_number 
      FROM customerBilling 
      WHERE invoice_number LIKE ?
      ORDER BY created_at DESC 
      LIMIT 1
      `,
      [`INV/${financialYear}/%`]
    );

    let nextNumber = 1;

    if (rows.length > 0) {
      const lastInvoice = rows[0].invoice_number; // INV/26-27/0002

      const parts = lastInvoice.split("/");
      const lastNumber = Number(parts[2]);

      nextNumber = lastNumber + 1;
    }

    const padded = String(nextNumber).padStart(4, "0");

    const nextInvoice = `INV/${financialYear}/${padded}`;

    return res.json({
      nextInvoiceNumber: nextInvoice,
    });
  } catch (error) {
    console.error("Error generating next invoice:", error);
    return res
      .status(500)
      .json({ message: "Failed to generate next invoice number" });
  }
};

