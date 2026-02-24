import db from "../../config/db.js";

/* 🔢 AUTO INVOICE NUMBER GENERATOR */
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();

  const [rows] = await db.query(
    `SELECT invoice_number 
     FROM customerBilling 
     WHERE invoice_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`INV-${year}-%`],
  );

  let next = 1;
  if (rows.length) {
    next = parseInt(rows[0].invoice_number.split("-")[2]) + 1;
  }

  return `INV-${year}-${String(next).padStart(4, "0")}`;
};

/* ================= CREATE BILL ================= */
// export const createCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();
//   try {
//     await connection.beginTransaction();

//     const {
//       customer_id,
//       customer_name,
//       phone_number,
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
//       products,
//     } = req.body;

//     /* 🔴 BASIC VALIDATION */
//     if (
//       !customer_id ||
//       !customer_name ||
//       !staff_name ||
//       !bank_id ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       return res.status(400).json({ message: "Invalid billing data" });
//     }

//     /* 🏦 VALID BANK */
//     const [[bank]] = await connection.query(
//       `SELECT id FROM company_bank_details WHERE id=? AND status='active'`,
//       [bank_id],
//     );
//     if (!bank) throw new Error("Invalid bank");

//     const invoice_number = await generateInvoiceNumber();
//     const invoice_date = new Date();

//     let subtotal = 0;
//     let grand_total = 0;

//     /* 🔒 STOCK CHECK + PRICE FROM DB */
//     for (const item of products) {
//       const { product_id, quantity } = item;
//       const qty = Number(quantity);

//       if (!product_id || qty <= 0) throw new Error("Invalid product line");

//       const [[product]] = await connection.query(
//         `SELECT stock, product_name, price FROM products WHERE id=? FOR UPDATE`,
//         [product_id],
//       );

//       if (!product) throw new Error("Product not found");
//       if (product.stock < qty)
//         throw new Error(`Stock low: ${product.product_name}`);

//       subtotal += qty * Number(product.price);
//     }

//     const advance_paid =
//       Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);
//     const balance_due = subtotal - advance_paid;
//     if (balance_due < 0) throw new Error("Payment exceeds bill");

//     /* 🧾 INSERT BILL HEADER */
//     const [billResult] = await connection.query(
//       `
//       INSERT INTO customerBilling (
//         invoice_number, invoice_date, company_gst_number,
//         customer_id, customer_name, phone_number, customer_gst_number,
//         vehicle_number, eway_bill_number,
//         staff_name, staff_phone, bank_id,
//         subtotal, grand_total, advance_paid, balance_due,
//         cash_amount, upi_amount, cheque_amount, upi_reference
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
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
//         0,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//         cheque_amount,
//         upi_reference,
//       ],
//     );

//     const billing_id = billResult.insertId;

//     /* 📦 PRODUCTS */
//     for (const item of products) {
//       const {
//         product_id,
//         quantity,
//         hsn_code = null,
//         cgst_rate = 0,
//         sgst_rate = 0,
//         gst_total_rate = 0,
//         discount_percent = 0,
//         discount_amount = 0,
//       } = item;

//       const qty = Number(quantity);

//       const [[product]] = await connection.query(
//         `SELECT product_name, brand, category, quantity, price FROM products WHERE id=?`,
//         [product_id],
//       );

//       const rate = Number(product.price);
//       const final_rate = rate;
//       const baseTotal = qty * final_rate;

//       const cgst_amount = (baseTotal * cgst_rate) / 100;
//       console.log(cgst_amount);

//       const sgst_amount = (baseTotal * sgst_rate) / 100;
//       const gst_total_amount = cgst_amount + sgst_amount;

//       const total = baseTotal + gst_total_amount - discount_amount;
//       grand_total += total;

//       await connection.query(
//         `
//         INSERT INTO customerBillingProducts (
//           billing_id, product_id, product_name, product_brand, product_category, product_quantity,
//           hsn_code, cgst_rate, sgst_rate, gst_total_rate,
//           cgst_amount, sgst_amount, gst_total_amount,
//           discount_percent, discount_amount,
//           \`quantity\`, \`rate\`, \`final_rate\`, \`total\`
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           billing_id,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           product.quantity,
//           hsn_code,
//           cgst_rate,
//           sgst_rate,
//           gst_total_rate,
//           cgst_amount,
//           sgst_amount,
//           gst_total_amount,
//           discount_percent,
//           discount_amount,
//           qty,
//           rate,
//           final_rate,
//           total,
//         ],
//       );

//       await connection.query(
//         `UPDATE products SET stock = stock - ? WHERE id=?`,
//         [qty, product_id],
//       );
//     }

//     await connection.query(
//       `UPDATE customerBilling SET grand_total=?, balance_due=? WHERE id=?`,
//       [grand_total, grand_total - advance_paid, billing_id],
//     );

//     // 🔄 FETCH FULL BILL DATA
//     const [[billing]] = await connection.query(
//       `
//   SELECT
//     b.*,
//     CONCAT(c.first_name, ' ', c.last_name) AS customer_master_name,
//     c.phone AS customer_master_phone,
//     cb.bank_name
//   FROM customerBilling b
//   JOIN customers c ON b.customer_id = c.id
//   JOIN company_bank_details cb ON b.bank_id = cb.id
//   WHERE b.id = ?
//   `,
//       [billing_id],
//     );

//     const [productsData] = await connection.query(
//       `
//   SELECT *
//   FROM customerBillingProducts
//   WHERE billing_id = ?
//   `,
//       [billing_id],
//     );

//     await connection.commit();

//     res.status(201).json({
//       message: "Invoice created successfully",
//       invoice: {
//         ...billing,
//         products: productsData,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error("Billing error:", err.message);
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

// export const createCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();
//   try {
//     await connection.beginTransaction();

//     const {
//       customer_id,
//       customer_name,
//       phone_number,
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
//       products,
//     } = req.body;

//     if (!customer_id || !customer_name || !staff_name || !bank_id || !Array.isArray(products) || products.length === 0) {
//       return res.status(400).json({ message: "Invalid billing data" });
//     }

//     const [[bank]] = await connection.query(
//       `SELECT id FROM company_bank_details WHERE id=? AND status='active'`,
//       [bank_id]
//     );
//     if (!bank) throw new Error("Invalid bank");

//     const invoice_number = await generateInvoiceNumber();
//     const invoice_date = new Date();

//     let subtotal = 0;
//     let grand_total = 0;

//     /* STOCK CHECK */
//     for (const item of products) {
//       const { product_id, quantity } = item;
//       const qty = Number(quantity);

//       const [[product]] = await connection.query(
//         `SELECT stock, product_name, price FROM products WHERE id=? FOR UPDATE`,
//         [product_id]
//       );

//       if (!product) throw new Error("Product not found");
//       if (product.stock < qty) throw new Error(`Stock low: ${product.product_name}`);

//       subtotal += qty * Number(product.price);
//     }

//     const advance_paid = Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);
//     const balance_due = subtotal - advance_paid;
//     if (balance_due < 0) throw new Error("Payment exceeds bill");

//     const [billResult] = await connection.query(
//       `
//       INSERT INTO customerBilling (
//         invoice_number, invoice_date, company_gst_number,
//         customer_id, customer_name, phone_number, customer_gst_number,
//         vehicle_number, eway_bill_number,
//         staff_name, staff_phone, bank_id,
//         subtotal, grand_total, advance_paid, balance_due,
//         cash_amount, upi_amount, cheque_amount, upi_reference
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         invoice_number, invoice_date, company_gst_number,
//         customer_id, customer_name, phone_number, customer_gst_number,
//         vehicle_number, eway_bill_number,
//         staff_name, staff_phone, bank_id,
//         subtotal, 0, advance_paid, balance_due,
//         cash_amount, upi_amount, cheque_amount, upi_reference
//       ]
//     );

//     const billing_id = billResult.insertId;

//     /* PRODUCTS */
//     for (const item of products) {
//       const {
//         product_id,
//         quantity,
//         final_rate,
//         hsn_code = null,
//         cgst_rate = 0,
//         sgst_rate = 0,
//         gst_total_rate = 0,
//       } = item;

//       const qty = Number(quantity);

//       const [[product]] = await connection.query(
//         `SELECT product_name, brand, category, quantity, price FROM products WHERE id=?`,
//         [product_id]
//       );

//       const rate = Number(product.price);          // DB RATE
//       const applied_rate = Number(final_rate);    // FRONTEND RATE

//       if (applied_rate > rate) throw new Error("Final rate cannot be greater than product rate");

//       const baseTotal = qty * rate;
//       const finalBaseTotal = qty * applied_rate;

//       const discount_amount = baseTotal - finalBaseTotal;
//       const discount_percent = baseTotal > 0 ? (discount_amount / baseTotal) * 100 : 0;

//       const cgst_amount = (finalBaseTotal * cgst_rate) / 100;
//       const sgst_amount = (finalBaseTotal * sgst_rate) / 100;
//       const gst_total_amount = cgst_amount + sgst_amount;

//       const total = finalBaseTotal + gst_total_amount;
//       grand_total += total;

//       await connection.query(
//         `
//         INSERT INTO customerBillingProducts (
//           billing_id, product_id, product_name, product_brand, product_category, product_quantity,
//           hsn_code, cgst_rate, sgst_rate, gst_total_rate,
//           cgst_amount, sgst_amount, gst_total_amount,
//           discount_percent, discount_amount,
//           \`quantity\`, \`rate\`, \`final_rate\`, \`total\`
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           billing_id,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           product.quantity,
//           hsn_code,
//           cgst_rate,
//           sgst_rate,
//           gst_total_rate,
//           cgst_amount,
//           sgst_amount,
//           gst_total_amount,
//           discount_percent,
//           discount_amount,
//           qty,
//           rate,
//           applied_rate,
//           total,
//         ]
//       );

//       await connection.query(
//         `UPDATE products SET stock = stock - ? WHERE id=?`,
//         [qty, product_id]
//       );
//     }

//     await connection.query(
//       `UPDATE customerBilling SET grand_total=?, balance_due=? WHERE id=?`,
//       [grand_total, grand_total - advance_paid, billing_id]
//     );

//     await connection.commit();

//     res.status(201).json({
//       message: "Invoice created successfully",
//       billing_id,
//       invoice_number
//     });

//   } catch (err) {
//     await connection.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

export const createCustomerBilling = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      customer_id,
      customer_name,
      phone_number,
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
      products,
    } = req.body;

    if (
      !customer_id ||
      !customer_name ||
      !staff_name ||
      !bank_id ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({ message: "Invalid billing data" });
    }

    const [[bank]] = await connection.query(
      `SELECT id FROM company_bank_details WHERE id=? AND status='active'`,
      [bank_id],
    );
    if (!bank) throw new Error("Invalid bank");

    const invoice_number = await generateInvoiceNumber();
    const invoice_date = new Date();

    let subtotal = 0;
    let grand_total = 0;

    /* STOCK CHECK */
    for (const item of products) {
      const { product_id, quantity } = item;
      const qty = Number(quantity);

      const [[product]] = await connection.query(
        `SELECT stock, product_name, price FROM products WHERE id=? FOR UPDATE`,
        [product_id],
      );

      if (!product) throw new Error("Product not found");
      if (product.stock < qty)
        throw new Error(`Stock low: ${product.product_name}`);

      subtotal += qty * Number(product.price);
    }

    const advance_paid =
      Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);
    const balance_due = subtotal - advance_paid;
    if (balance_due < 0) throw new Error("Payment exceeds bill");

    const [billResult] = await connection.query(
      `
      INSERT INTO customerBilling (
        invoice_number, invoice_date, company_gst_number,
        customer_id, customer_name, phone_number, customer_gst_number,
        vehicle_number, eway_bill_number,
        staff_name, staff_phone, bank_id,
        subtotal, grand_total, advance_paid, balance_due,
        cash_amount, upi_amount, cheque_amount, upi_reference
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
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
        0,
        advance_paid,
        balance_due,
        cash_amount,
        upi_amount,
        cheque_amount,
        upi_reference,
      ],
    );

    const billing_id = billResult.insertId;

    /* PRODUCTS */
    for (const item of products) {
      const {
        product_id,
        quantity,
        final_rate,
        hsn_code = null,
        cgst_rate = 0,
        sgst_rate = 0,
        // gst_total_rate = 0,
      } = item;

      const qty = Number(quantity);

      const [[product]] = await connection.query(
        `SELECT product_name, brand, category, quantity, price FROM products WHERE id=?`,
        [product_id],
      );

      const rate = Number(product.price);
      const applied_rate = Number(final_rate);

      if (applied_rate > rate)
        throw new Error("Final rate cannot be greater than product rate");

      const baseTotal = qty * rate;
      const finalBaseTotal = qty * applied_rate;

      const discount_amount = baseTotal - finalBaseTotal;
      const discount_percent =
        baseTotal > 0 ? (discount_amount / baseTotal) * 100 : 0;

      const cgst_amount = (finalBaseTotal * cgst_rate) / 100;
      const sgst_amount = (finalBaseTotal * sgst_rate) / 100;

      /* ✅ AUTO GST TOTAL RATE */
      const gst_total_rate = Number(cgst_rate) + Number(sgst_rate);

      const gst_total_amount = cgst_amount + sgst_amount;

      // const total = finalBaseTotal + gst_total_amount; // including gst total
      const total = finalBaseTotal; // excluding gst total
      grand_total += total;

      await connection.query(
        `
        INSERT INTO customerBillingProducts (
          billing_id, product_id, product_name, product_brand, product_category, product_quantity,
          hsn_code, cgst_rate, sgst_rate, gst_total_rate,
          cgst_amount, sgst_amount, gst_total_amount,
          discount_percent, discount_amount,
          \`quantity\`, \`rate\`, \`final_rate\`, \`total\`
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          billing_id,
          product_id,
          product.product_name,
          product.brand,
          product.category,
          product.quantity,
          hsn_code,
          cgst_rate,
          sgst_rate,
          gst_total_rate,
          cgst_amount,
          sgst_amount,
          gst_total_amount,
          discount_percent,
          discount_amount,
          qty,
          rate,
          applied_rate,
          total,
        ],
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id=?`,
        [qty, product_id],
      );
    }

    await connection.query(
      `UPDATE customerBilling SET grand_total=?, balance_due=? WHERE id=?`,
      [grand_total, grand_total - advance_paid, billing_id],
    );

    /* 🔥 FETCH FULL INVOICE */
    const [[billing]] = await connection.query(
      `
      SELECT 
        b.*,
        CONCAT(c.first_name,' ',c.last_name) AS customer_master_name,
        c.phone AS customer_master_phone,
        cb.bank_name
      FROM customerBilling b
      JOIN customers c ON b.customer_id = c.id
      JOIN company_bank_details cb ON b.bank_id = cb.id
      WHERE b.id = ?
      `,
      [billing_id],
    );

    const [productsData] = await connection.query(
      `SELECT * FROM customerBillingProducts WHERE billing_id = ?`,
      [billing_id],
    );

    await connection.commit();

    res.status(201).json({
      message: "Invoice created successfully",
      invoice: {
        ...billing,
        products: productsData,
      },
    });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
};

export const getAllCustomerBillings = async (req, res) => {
  try {
    const [billings] = await db.query(`
      SELECT
        cb.id,
        cb.invoice_number,
        cb.invoice_date,

        cb.customer_id,
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

export const deleteCustomerBilling = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // 1️⃣ Get products of this bill
    const [products] = await connection.query(
      `SELECT product_id, quantity FROM customerBillingProducts WHERE billing_id = ?`,
      [id],
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 2️⃣ Restore stock
    for (const item of products) {
      await connection.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [item.quantity, item.product_id],
      );
    }

    // 3️⃣ Delete products
    await connection.query(
      `DELETE FROM customerBillingProducts WHERE billing_id = ?`,
      [id],
    );

    // 4️⃣ Delete bill
    await connection.query(`DELETE FROM customerBilling WHERE id = ?`, [id]);

    await connection.commit();
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed" });
  } finally {
    connection.release();
  }
};

export const updateCustomerBilling = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { products, tax_gst_percent, advance_paid } = req.body;

    // 1️⃣ Get old products
    const [oldProducts] = await connection.query(
      `SELECT product_id, quantity FROM customerBillingProducts WHERE billing_id = ?`,
      [id],
    );

    if (!oldProducts.length) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 2️⃣ Restore old stock
    for (const item of oldProducts) {
      await connection.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [item.quantity, item.product_id],
      );
    }

    // 3️⃣ Delete old products
    await connection.query(
      `DELETE FROM customerBillingProducts WHERE billing_id = ?`,
      [id],
    );

    // 4️⃣ Insert new products & deduct stock
    let subtotal = 0;

    for (const item of products) {
      const { product_id, quantity, rate, product_quantity } = item;

      const [[product]] = await connection.query(
        `SELECT stock, product_name, brand, category FROM products WHERE id = ? FOR UPDATE`,
        [product_id],
      );

      if (!product || product.stock < quantity) {
        throw new Error(`Stock issue for ${product?.product_name}`);
      }

      const total = quantity * rate;
      subtotal += total;

      await connection.query(
        `INSERT INTO customerBillingProducts
         (billing_id, product_id, product_name, product_brand, product_category,
          product_quantity, quantity, rate, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          product_id,
          product.product_name,
          product.brand,
          product.category,
          product_quantity,
          quantity,
          rate,
          total,
        ],
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [quantity, product_id],
      );
    }

    const tax = (subtotal * tax_gst_percent) / 100;
    const grand_total = subtotal + tax;
    const balance_due = grand_total - advance_paid;

    // 5️⃣ Update bill
    await connection.query(
      `UPDATE customerBilling 
       SET subtotal=?, tax_gst_amount=?, grand_total=?, balance_due=?
       WHERE id=?`,
      [subtotal, tax, grand_total, balance_due, id],
    );

    await connection.commit();
    res.json({ message: "Invoice updated successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Update error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
};
