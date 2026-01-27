import db from "../config/db.js";

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

/* 🟢 CREATE BILL / INVOICE */
// export const createCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();
//   try {
//     await connection.beginTransaction();

//     const {
//       customer_id,
//       customer_name,
//       phone_number,
//       gst_number,
//       tax_gst_percent,
//       advance_paid = 0,
//       cash_amount = 0,
//       upi_amount = 0,
//       products,
//     } = req.body;

//     /* 🔴 VALIDATION */
//     if (
//       !customer_id ||
//       !customer_name ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       return res.status(400).json({ message: "Invalid billing data" });
//     }

//     if (isNaN(tax_gst_percent)) {
//       return res.status(400).json({ message: "Invalid GST percent" });
//     }

//     /* 🔢 Invoice */
//     const invoice_number = await generateInvoiceNumber(connection);
//     const invoice_date = new Date();

//     let subtotal = 0;

//     /* 🔒 VALIDATE + LOCK PRODUCTS */
//     for (const item of products) {
//       const { product_id, quantity, rate } = item;

//       if (!product_id || quantity <= 0 || rate <= 0) {
//         throw new Error("Invalid product line");
//       }

//       const [[product]] = await connection.query(
//         `
//         SELECT stock, product_name, brand, category
//         FROM products
//         WHERE id = ?
//         FOR UPDATE
//         `,
//         [product_id],
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < quantity) {
//         throw new Error(`Insufficient stock for ${product.product_name}`);
//       }

//       subtotal += quantity * rate;
//     }

//     /* 🧮 CALCULATIONS */
//     const tax_gst_amount = (subtotal * tax_gst_percent) / 100;
//     const grand_total = subtotal + tax_gst_amount;
//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) {
//       throw new Error("Advance exceeds bill amount");
//     }

//     /* 🧾 INSERT BILL */
//     const [billResult] = await connection.query(
//       `
//       INSERT INTO customerBilling (
//         invoice_number, invoice_date,
//         customer_id, customer_name, phone_number, gst_number,
//         subtotal, tax_gst_percent, tax_gst_amount,
//         grand_total, advance_paid, balance_due,
//         cash_amount, upi_amount
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         invoice_number,
//         invoice_date,
//         customer_id,
//         customer_name,
//         phone_number,
//         gst_number,
//         subtotal,
//         tax_gst_percent,
//         tax_gst_amount,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//       ],
//     );

//     const billing_id = billResult.insertId;

//     /* 📦 INSERT ITEMS + DEDUCT STOCK */
//     for (const item of products) {
//       const { product_id, quantity, rate } = item;

//       const [[product]] = await connection.query(
//         "SELECT product_name, brand, category FROM products WHERE id = ?",
//         [product_id],
//       );

//       const total = quantity * rate;

//       await connection.query(
//         `
//         INSERT INTO customerBillingProducts (
//           billing_id, product_id,
//           product_name, product_brand, product_category,
//           quantity, rate, total
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           billing_id,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           quantity,
//           rate,
//           total,
//         ],
//       );

//       await connection.query(
//         `UPDATE products SET stock = stock - ? WHERE id = ?`,
//         [quantity, product_id],
//       );
//     }

//     await connection.commit();

//     /* 🔁 FETCH FULL BILLING DATA */
//     const [[billing]] = await connection.query(
//       "SELECT * FROM customerBilling WHERE id = ?",
//       [billing_id],
//     );

//     const [billingProducts] = await connection.query(
//       "SELECT * FROM customerBillingProducts WHERE billing_id = ?",
//       [billing_id],
//     );

//     res.status(201).json({
//       message: "customer billing Invoice created successfully",
//       invoice_number,
//       billing_id,
//       billing,
//       products: billingProducts,
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
//       gst_number,

//       /* 👤 NEW STAFF FIELDS */
//       staff_name,
//       staff_phone,

//       tax_gst_percent,
//       advance_paid = 0,
//       cash_amount = 0,
//       upi_amount = 0,
//       products,
//     } = req.body;

//     /* 🔴 VALIDATION */
//     if (
//       !customer_id ||
//       !customer_name ||
//       !staff_name ||
//       !staff_phone ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       return res.status(400).json({ message: "Invalid billing data" });
//     }

//     if (!/^\d{10}$/.test(staff_phone)) {
//       return res.status(400).json({ message: "Invalid staff phone number" });
//     }

//     if (isNaN(tax_gst_percent)) {
//       return res.status(400).json({ message: "Invalid GST percent" });
//     }

//     /* 🔢 Invoice */
//     const invoice_number = await generateInvoiceNumber(connection);
//     const invoice_date = new Date();

//     let subtotal = 0;

//     /* 🔒 PRODUCT VALIDATION + LOCK */
//     for (const item of products) {
//       const { product_id, quantity, rate } = item;

//       if (!product_id || quantity <= 0 || rate <= 0) {
//         throw new Error("Invalid product line");
//       }

//       const [[product]] = await connection.query(
//         `
//         SELECT stock, product_name, brand, category
//         FROM products
//         WHERE id = ?
//         FOR UPDATE
//         `,
//         [product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < quantity) {
//         throw new Error(`Insufficient stock for ${product.product_name}`);
//       }

//       subtotal += quantity * rate;
//     }

//     /* 🧮 CALCULATIONS */
//     const tax_gst_amount = (subtotal * tax_gst_percent) / 100;
//     const grand_total = subtotal + tax_gst_amount;
//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) {
//       throw new Error("Advance exceeds bill amount");
//     }

//     /* 🧾 INSERT BILL (UPDATED) */
//     const [billResult] = await connection.query(
//       `
//       INSERT INTO customerBilling (
//         invoice_number, invoice_date,
//         customer_id, customer_name, phone_number, gst_number,
//         staff_name, staff_phone,
//         subtotal, tax_gst_percent, tax_gst_amount,
//         grand_total, advance_paid, balance_due,
//         cash_amount, upi_amount
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         invoice_number,
//         invoice_date,
//         customer_id,
//         customer_name,
//         phone_number,
//         gst_number,
//         staff_name,
//         staff_phone,
//         subtotal,
//         tax_gst_percent,
//         tax_gst_amount,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//       ]
//     );

//     const billing_id = billResult.insertId;

//     /* 📦 INSERT PRODUCTS + UPDATE STOCK */
//     for (const item of products) {
//       const { product_id, quantity, rate } = item;

//       const [[product]] = await connection.query(
//         "SELECT product_name, brand, category FROM products WHERE id = ?",
//         [product_id]
//       );

//       const total = quantity * rate;

//       await connection.query(
//         `
//         INSERT INTO customerBillingProducts (
//           billing_id, product_id,
//           product_name, product_brand, product_category,
//           quantity, rate, total
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           billing_id,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           quantity,
//           rate,
//           total,
//         ]
//       );

//       await connection.query(
//         `UPDATE products SET stock = stock - ? WHERE id = ?`,
//         [quantity, product_id]
//       );
//     }

//     await connection.commit();

//     /* 🔁 FETCH FULL DATA */
//     const [[billing]] = await connection.query(
//       "SELECT * FROM customerBilling WHERE id = ?",
//       [billing_id]
//     );

//     const [billingProducts] = await connection.query(
//       "SELECT * FROM customerBillingProducts WHERE billing_id = ?",
//       [billing_id]
//     );

//     res.status(201).json({
//       message: "Customer billing invoice created successfully",
//       invoice_number,
//       billing,
//       products: billingProducts,
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
//       gst_number,

//       staff_name,
//       staff_phone,

//       bank_id, // 🏦 REQUIRED

//       tax_gst_percent,
//       advance_paid = 0,
//       cash_amount = 0,
//       upi_amount = 0,
//       products,
//     } = req.body;

//     /* 🔴 HARD VALIDATION */
//     if (
//       !customer_id ||
//       !customer_name ||
//       !staff_name ||
//       !staff_phone ||
//       !bank_id ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       return res.status(400).json({ message: "Invalid billing data" });
//     }

//     if (!/^\d{10}$/.test(staff_phone)) {
//       return res.status(400).json({ message: "Invalid staff phone number" });
//     }

//     if (isNaN(tax_gst_percent)) {
//       return res.status(400).json({ message: "Invalid GST percent" });
//     }

//     /* 🏦 VALIDATE BANK */
//     const [[bank]] = await connection.query(
//       `
//       SELECT id, bank_name, account_name, account_number, ifsc_code, qr_code_image
//       FROM company_bank_details
//       WHERE id = ? AND status = 'active'
//       `,
//       [bank_id]
//     );

//     if (!bank) {
//       return res.status(400).json({ message: "Invalid or inactive bank selected" });
//     }

//     /* 🔢 INVOICE */
//     const invoice_number = await generateInvoiceNumber(connection);
//     const invoice_date = new Date();

//     let subtotal = 0;

//     /* 🔒 PRODUCT VALIDATION + LOCK */
//     for (const item of products) {
//       const { product_id, quantity, rate } = item;

//       if (!product_id || quantity <= 0 || rate <= 0) {
//         throw new Error("Invalid product line");
//       }

//       const [[product]] = await connection.query(
//         `
//         SELECT stock, product_name
//         FROM products
//         WHERE id = ?
//         FOR UPDATE
//         `,
//         [product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < quantity) {
//         throw new Error(`Insufficient stock for ${product.product_name}`);
//       }

//       subtotal += quantity * rate;
//     }

//     /* 🧮 CALCULATIONS */
//     const tax_gst_amount = (subtotal * tax_gst_percent) / 100;
//     const grand_total = subtotal + tax_gst_amount;
//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) {
//       throw new Error("Advance exceeds bill amount");
//     }

//     /* 🧾 INSERT BILL */
//     const [billResult] = await connection.query(
//       `
//       INSERT INTO customerBilling (
//         invoice_number, invoice_date,
//         customer_id, customer_name, phone_number, gst_number,
//         staff_name, staff_phone,
//         bank_id,
//         subtotal, tax_gst_percent, tax_gst_amount,
//         grand_total, advance_paid, balance_due,
//         cash_amount, upi_amount
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         invoice_number,
//         invoice_date,
//         customer_id,
//         customer_name,
//         phone_number,
//         gst_number,
//         staff_name,
//         staff_phone,
//         bank_id,
//         subtotal,
//         tax_gst_percent,
//         tax_gst_amount,
//         grand_total,
//         advance_paid,
//         balance_due,
//         cash_amount,
//         upi_amount,
//       ]
//     );

//     const billing_id = billResult.insertId;

//     /* 📦 INSERT PRODUCTS + UPDATE STOCK */
//     for (const item of products) {
//       const { product_id, quantity, rate } = item;

//       const [[product]] = await connection.query(
//         `SELECT product_name, brand, category FROM products WHERE id = ?`,
//         [product_id]
//       );

//       const total = quantity * rate;

//       await connection.query(
//         `
//         INSERT INTO customerBillingProducts (
//           billing_id, product_id,
//           product_name, product_brand, product_category,
//           quantity, rate, total
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           billing_id,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           quantity,
//           rate,
//           total,
//         ]
//       );

//       await connection.query(
//         `UPDATE products SET stock = stock - ? WHERE id = ?`,
//         [quantity, product_id]
//       );
//     }

//     await connection.commit();

//         /* 🔁 FETCH FULL DATA */
//     const [[billing]] = await connection.query(
//       "SELECT * FROM customerBilling WHERE id = ?",
//       [billing_id]
//     );

//     const [billingProducts] = await connection.query(
//       "SELECT * FROM customerBillingProducts WHERE billing_id = ?",
//       [billing_id]
//     );

//     /* 🔁 FINAL RESPONSE (WITH BANK) */
//     res.status(201).json({
//       message: "Customer billing invoice created successfully",
//       invoice_number,
//       billing_id,
//       billing,
//       products: billingProducts,
//       bank,
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error("Billing error:", err.message);
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
      gst_number,

      staff_name,
      staff_phone,

      bank_id,

      tax_gst_percent,
      advance_paid = 0,
      cash_amount = 0,
      upi_amount = 0,
      products,
    } = req.body;

    if (
      !customer_id ||
      !customer_name ||
      !staff_name ||
      !staff_phone ||
      !bank_id ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({ message: "Invalid billing data" });
    }

    if (!/^\d{10}$/.test(staff_phone)) {
      return res.status(400).json({ message: "Invalid staff phone number" });
    }

    if (isNaN(tax_gst_percent)) {
      return res.status(400).json({ message: "Invalid GST percent" });
    }

    /* 🏦 VALIDATE BANK */
    const [[bank]] = await connection.query(
      `SELECT * FROM company_bank_details WHERE id = ? AND status = 'active'`,
      [bank_id]
    );

    if (!bank) {
      return res.status(400).json({ message: "Invalid or inactive bank selected" });
    }

    const invoice_number = await generateInvoiceNumber(connection);
    const invoice_date = new Date();

    let subtotal = 0;

    /* 🔒 STOCK CHECK */
    for (const item of products) {
      const { product_id, quantity, rate } = item;

      if (!product_id || quantity <= 0 || rate <= 0) {
        throw new Error("Invalid product line");
      }

      const [[product]] = await connection.query(
        `SELECT stock, product_name FROM products WHERE id = ? FOR UPDATE`,
        [product_id]
      );

      if (!product) throw new Error("Product not found");
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for ${product.product_name}`);
      }

      subtotal += quantity * rate;
    }

    /* 🧮 GST SPLIT LOGIC */
    const gstPercent = Number(tax_gst_percent);

    const tax_cgst_percent = gstPercent / 2;
    const tax_sgst_percent = gstPercent / 2;

    const tax_cgst_amount = (subtotal * tax_cgst_percent) / 100;
    const tax_sgst_amount = (subtotal * tax_sgst_percent) / 100;

    const tax_gst_amount = tax_cgst_amount + tax_sgst_amount;

    const grand_total = subtotal + tax_gst_amount;
    const balance_due = grand_total - advance_paid;

    if (balance_due < 0) {
      throw new Error("Advance exceeds bill amount");
    }

    /* 🧾 INSERT BILL */
    const [billResult] = await connection.query(
      `
      INSERT INTO customerBilling (
        invoice_number, invoice_date,
        customer_id, customer_name, phone_number, gst_number,
        staff_name, staff_phone,
        bank_id,
        subtotal,
        tax_gst_percent, tax_gst_amount,
        tax_cgst_percent, tax_cgst_amount,
        tax_sgst_percent, tax_sgst_amount,
        grand_total, advance_paid, balance_due,
        cash_amount, upi_amount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        invoice_number,
        invoice_date,
        customer_id,
        customer_name,
        phone_number,
        gst_number,
        staff_name,
        staff_phone,
        bank_id,
        subtotal,
        gstPercent,
        tax_gst_amount,
        tax_cgst_percent,
        tax_cgst_amount,
        tax_sgst_percent,
        tax_sgst_amount,
        grand_total,
        advance_paid,
        balance_due,
        cash_amount,
        upi_amount,
      ]
    );

    const billing_id = billResult.insertId;

    /* 📦 PRODUCTS */
    for (const item of products) {
      const { product_id, quantity, rate } = item;

      const [[product]] = await connection.query(
        `SELECT product_name, brand, category FROM products WHERE id = ?`,
        [product_id]
      );

      const total = quantity * rate;

      await connection.query(
        `
        INSERT INTO customerBillingProducts (
          billing_id, product_id,
          product_name, product_brand, product_category,
          quantity, rate, total
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          billing_id,
          product_id,
          product.product_name,
          product.brand,
          product.category,
          quantity,
          rate,
          total,
        ]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [quantity, product_id]
      );
    }

    await connection.commit();

        /* 🔁 FETCH FULL DATA */
    const [[billing]] = await connection.query(
      "SELECT * FROM customerBilling WHERE id = ?",
      [billing_id]
    );

    const [billingProducts] = await connection.query(
      "SELECT * FROM customerBillingProducts WHERE billing_id = ?",
      [billing_id]
    );

    res.status(201).json({
      message: "Customer billing invoice created successfully",
      invoice_number,
      billing_id,
      billing,
      products: billingProducts,
      bank,
    });

  } catch (err) {
    await connection.rollback();
    console.error("Billing error:", err.message);
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
};


/* 📄 GET ALL INVOICES */
// export const getAllCustomerBillings = async (req, res) => {
//   const [rows] = await db.query(
//     "SELECT * FROM customerBilling ORDER BY created_at DESC",
//   );
//   res.json(rows);
// };

// export const getAllCustomerBillings = async (req, res) => {
//   const [rows] = await db.query(`
//     SELECT
//       cb.id,
//       cb.invoice_number,
//       cb.invoice_date,

//       cb.customer_id,
//       CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
//       c.address,
//       c.phone AS phone_number,

//       cb.staff_name,
//       cb.staff_phone,

//       cb.subtotal,
//       cb.tax_gst_percent,
//       cb.tax_gst_amount,
//       cb.grand_total,
//       cb.advance_paid,
//       cb.balance_due,
//       cb.cash_amount,
//       cb.upi_amount,

//       cb.created_at
//     FROM customerBilling cb
//     JOIN customers c ON c.id = cb.customer_id
//     ORDER BY cb.created_at DESC
//   `);

//   res.json(rows);
// };

export const getAllCustomerBillings = async (req, res) => {
  try {
    /* 1️⃣ Get all billing headers */
    const [billings] = await db.query(`
      SELECT
        cb.id,
        cb.invoice_number,
        cb.invoice_date,

        cb.customer_id,
        CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
        c.address,
        c.phone AS phone_number,

        cb.staff_name,
        cb.staff_phone,

        cb.subtotal,
        cb.tax_gst_percent,
        cb.tax_gst_amount,
        cb.grand_total,
        cb.advance_paid,
        cb.balance_due,
        cb.cash_amount,
        cb.upi_amount,

        cb.created_at
      FROM customerBilling cb
      JOIN customers c ON c.id = cb.customer_id
      ORDER BY cb.created_at DESC
    `);

    if (billings.length === 0) {
      return res.json([]);
    }

    /* 2️⃣ Get all products for those billings */
    const billingIds = billings.map(b => b.id);

    const [products] = await db.query(`
      SELECT
        cbp.billing_id,

        cbp.product_id,
        cbp.product_name,
        cbp.product_brand,
        cbp.product_category,

        cbp.quantity,
        cbp.rate,
        cbp.total
      FROM customerBillingProducts cbp
      WHERE cbp.billing_id IN (?)
    `, [billingIds]);

    /* 3️⃣ Attach products to each billing */
    const result = billings.map(billing => ({
      ...billing,
      products: products.filter(p => p.billing_id === billing.id)
    }));

    res.json(result);

  } catch (err) {
    console.error("Billing fetch error:", err);
    res.status(500).json({ message: "Failed to fetch billing data" });
  }
};




/* 🔍 GET INVOICE DETAILS */
export const getCustomerBillingById = async (req, res) => {
  const { id } = req.params;

  const [[billing]] = await db.query(
    "SELECT * FROM customerBilling WHERE id = ?",
    [id],
  );

  if (!billing) return res.status(404).json({ message: "Invoice not found" });

  const [products] = await db.query(
    "SELECT * FROM customerBillingProducts WHERE billing_id = ?",
    [id],
  );

  res.json({ billing, products });
};
