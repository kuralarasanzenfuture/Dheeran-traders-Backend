import db from "../../../config/db.js";
import { sendSMS } from "../../../sendSms.js";
import { AuditLog } from "../../../services/audit.service.js";
import { applyStockChange } from "../../../services/billing/inventory.service.js";

const generateInvoiceNumber = async () => {
  const now = new Date();

  let startYear = now.getFullYear();

  // Handle financial year (Apr–Mar)
  if (now.getMonth() < 3) {
    startYear = startYear - 1;
  }

  const shortStartYear = startYear.toString().slice(-2); // "26"
  const shortEndYear = (startYear + 1).toString().slice(-2); // "27"

  const financialYear = `${shortStartYear}-${shortEndYear}`;

  const [rows] = await db.query(
    `SELECT invoice_number 
     FROM customerBilling 
     WHERE invoice_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`INV/${financialYear}/%`],
  );

  let next = 1;

  if (rows.length) {
    next = parseInt(rows[0].invoice_number.split("/")[2]) + 1;
  }

  return `INV/${financialYear}/${String(next).padStart(4, "0")}`;
};

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

//     const [[bank]] = await connection.query(
//       `SELECT id FROM company_bank_details WHERE id=? AND status='active'`,
//       [bank_id],
//     );
//     if (!bank) throw new Error("Invalid bank");

//     const invoice_number = await generateInvoiceNumber();
//     const invoice_date = new Date();

//     let subtotal = 0;
//     let grand_total = 0;

//     /* 🔒 STOCK CHECK + SUBTOTAL (FROM FINAL RATE) */
//     for (const item of products) {
//       const { product_id, quantity, final_rate } = item;
//       const qty = Number(quantity);

//       const [[product]] = await connection.query(
//         `SELECT stock, product_name, price FROM products WHERE id=? FOR UPDATE`,
//         [product_id],
//       );

//       if (!product) throw new Error("Product not found");
//       if (product.stock < qty)
//         throw new Error(`Stock low: ${product.product_name}`);

//       const rate = Number(product.price);
//       const applied_rate = Number(final_rate ?? rate);

//       if (applied_rate > rate)
//         throw new Error("Final rate cannot be greater than product rate");

//       const lineTotal = qty * applied_rate;

//       subtotal += lineTotal;
//     }

//     const advance_paid =
//       Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);

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

//     /* 🧾 PRODUCTS */
//     for (const item of products) {
//       const {
//         product_id,
//         quantity,
//         final_rate,
//         hsn_code = null,
//         cgst_rate = 0,
//         sgst_rate = 0,
//       } = item;

//       const qty = Number(quantity);

//       const [[product]] = await connection.query(
//         `SELECT product_name, brand, category, quantity, price FROM products WHERE id=?`,
//         [product_id],
//       );

//       const rate = Number(product.price);
//       const applied_rate = Number(final_rate ?? rate);

//       if (applied_rate > rate)
//         throw new Error("Final rate cannot be greater than product rate");

//       const baseTotal = qty * rate;
//       const finalBaseTotal = qty * applied_rate;

//       const discount_amount = baseTotal - finalBaseTotal;
//       const discount_percent =
//         baseTotal > 0 ? (discount_amount / baseTotal) * 100 : 0;

//       const cgst_amount = (finalBaseTotal * cgst_rate) / 100;
//       const sgst_amount = (finalBaseTotal * sgst_rate) / 100;

//       const gst_total_rate = Number(cgst_rate) + Number(sgst_rate);
//       const gst_total_amount = cgst_amount + sgst_amount;

//       const total = finalBaseTotal; // excluding GST
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

//     const [[billing]] = await connection.query(
//       `
//       SELECT
//         b.*,
//         CONCAT(c.first_name,' ',c.last_name) AS customer_master_name,
//         c.phone AS customer_master_phone,
//         cb.bank_name
//       FROM customerBilling b
//       JOIN customers c ON b.customer_id = c.id
//       JOIN company_bank_details cb ON b.bank_id = cb.id
//       WHERE b.id = ?
//       `,
//       [billing_id],
//     );

//     const [productsData] = await connection.query(
//       `SELECT * FROM customerBillingProducts WHERE billing_id = ?`,
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
//       remarks,
//     } = req.body;

//     // console.log(req.body);

//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

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

//     /* =========================
//        VERIFY BANK
//     ========================= */
//     const [[bank]] = await connection.query(
//       `SELECT id FROM company_bank_details WHERE id=? AND status='active'`,
//       [bank_id],
//     );

//     if (!bank)
//       throw new Error(`Invalid bank id ${bank_id} and status is inactive`);

//     const invoice_number = await generateInvoiceNumber();
//     const invoice_date = new Date();

//     let subtotal = 0;
//     let grand_total = 0;

//     /* =========================
//        STOCK CHECK
//     ========================= */
//     for (const item of products) {
//       const { product_id, quantity, final_rate } = item;

//       const [[product]] = await connection.query(
//         `SELECT stock, product_name, price FROM products WHERE id=? FOR UPDATE`,
//         [product_id],
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < quantity) {
//         throw new Error(`Stock low: ${product.product_name}`);
//       }

//       const rate = Number(product.price);
//       const applied_rate = Number(final_rate ?? rate);

//       if (applied_rate > rate) {
//         throw new Error("Final rate cannot exceed actual price");
//       }

//       subtotal += quantity * applied_rate;
//     }

//     const advance_paid =
//       Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);

//     const balance_due = subtotal - advance_paid;

//     if (balance_due < 0) {
//       throw new Error("Payment exceeds bill");
//     }

//     /* =========================
//        CREATE BILL
//     ========================= */
//     const [billResult] = await connection.query(
//       `INSERT INTO customerBilling (
//         invoice_number, invoice_date, company_gst_number,
//         customer_id, customer_name, phone_number, customer_gst_number,
//         vehicle_number, eway_bill_number,
//         staff_name, staff_phone, bank_id,
//         subtotal, grand_total, advance_paid, balance_due,
//         cash_amount, upi_amount, cheque_amount, upi_reference,
//         created_by, remarks
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
//         userId,
//         remarks || "Billing created",
//       ],
//     );

//     const billing_id = billResult.insertId;

//     const auditProducts = [];

//     /* =========================
//        INSERT PRODUCTS + LEDGER
//     ========================= */
//     for (const item of products) {
//       const { product_id, quantity, final_rate } = item;

//       const [[product]] = await connection.query(
//         `SELECT * FROM products WHERE id=? FOR UPDATE`,
//         [product_id],
//       );

//       const rate = Number(product.price);

//       const applied_rate = Number(final_rate ?? rate);

//       // =========================
//       // BASE TOTAL
//       // =========================

//       const baseTotal = quantity * applied_rate;

//       // =========================
//       // GST FROM PRODUCT TABLE
//       // =========================

//       const cgst_rate = Number(product.cgst_rate || 0);

//       const sgst_rate = Number(product.sgst_rate || 0);

//       const gst_total_rate = cgst_rate + sgst_rate;

//       // =========================
//       // GST CALCULATION
//       // =========================

//       const cgst_amount = (baseTotal * cgst_rate) / 100;

//       const sgst_amount = (baseTotal * sgst_rate) / 100;

//       const gst_total_amount = cgst_amount + sgst_amount;

//       // =========================
//       // DISCOUNT
//       // =========================

//       const originalTotal = quantity * rate;

//       const discount_amount = originalTotal - baseTotal;

//       const discount_percent =
//         originalTotal > 0
//           ? ((discount_amount / originalTotal) * 100).toFixed(2)
//           : 0;

//       // =========================
//       // FINAL TOTAL
//       // =========================

//       const total = baseTotal + gst_total_amount;

//       grand_total += total;

//       // =========================
//       // INSERT PRODUCT
//       // =========================

//       await connection.query(
//         `INSERT INTO customerBillingProducts (

//     billing_id,
//     product_id,

//     product_name,
//     product_brand,
//     product_category,
//     product_quantity,

//     hsn_code,

//     cgst_rate,
//     sgst_rate,
//     gst_total_rate,

//     cgst_amount,
//     sgst_amount,
//     gst_total_amount,

//     discount_percent,
//     discount_amount,

//     quantity,
//     rate,
//     final_rate,
//     total

//   ) VALUES (

//     ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
//     ?, ?, ?, ?, ?, ?, ?, ?, ?

//   )`,
//         [
//           billing_id,

//           product_id,

//           product.product_name,
//           product.brand,
//           product.category,
//           product.quantity,

//           product.hsn_code,

//           cgst_rate,
//           sgst_rate,
//           gst_total_rate,

//           cgst_amount,
//           sgst_amount,
//           gst_total_amount,

//           discount_percent,
//           discount_amount,

//           quantity,
//           rate,
//           applied_rate,
//           total,
//         ],
//       );

//       /* 🔻 UPDATE STOCK */
//       // await connection.query(
//       //   `UPDATE products SET stock = stock - ? WHERE id=?`,
//       //   [quantity, product_id],
//       // );

//       /* 📘 LEDGER ENTRY */
//       // await connection.query(
//       //   `INSERT INTO billing_stock_inventory_ledger
//       //   (product_id, change_qty, balance_after, reference_type, reference_id, created_by)
//       //   VALUES (?, ?, ?, 'SALE', ?, ?)`,
//       //   [product_id, -quantity, product.stock - quantity, billing_id, userId],
//       // );

//       await applyStockChange({
//         conn: connection,
//         product_id,
//         qty_change: -quantity,
//         reference_type: "SALE",
//         reference_id: billing_id,
//         remarks: "Billing created",
//         userId,
//       });

//       auditProducts.push({
//         product_id,
//         quantity,
//         total,
//       });
//     }

//     /* =========================
//        FINAL UPDATE
//     ========================= */
//     await connection.query(
//       `UPDATE customerBilling SET grand_total=?, balance_due=? WHERE id=?`,
//       [grand_total, grand_total - advance_paid, billing_id],
//     );

//     const auditData = {
//       invoice: {
//         id: billing_id,
//         invoice_number,
//         invoice_date,
//         customer_id,
//         customer_name,
//         phone_number,
//         staff_name,
//         bank_id,

//         subtotal,
//         grand_total,
//         advance_paid,
//         balance_due,

//         cash_amount,
//         upi_amount,
//         cheque_amount,

//         return_status: "NONE",
//         payment_status: "PARTIAL",

//         remarks,
//       },

//       products: products.map((item, i) => ({
//         product_id: item.product_id,
//         product_name: item.product_name,
//         product_brand: item.product_brand,
//         product_category: item.product_category,

//         quantity: item.quantity,
//         rate: item.rate,
//         final_rate: item.final_rate,

//         cgst_rate: item.cgst_rate,
//         sgst_rate: item.sgst_rate,
//         gst_total_rate: item.gst_total_rate,

//         total: item.total,
//       })),

//       meta: {
//         created_by: userId,
//         created_at: new Date(),
//       },
//     };

//     /* =========================
//        AUDIT LOG
//     ========================= */
//     // await connection.query(
//     //   `INSERT INTO audit_logs
//     //   (table_name, record_id, action, new_data, changed_by, remarks)
//     //   VALUES (?, ?, ?, ?, ?, ?)`,
//     //   [
//     //     "customerBilling",
//     //     billing_id,
//     //     "INSERT",
//     //     // JSON.stringify({
//     //     //   invoice_number,
//     //     //   customer_id,
//     //     //   total: grand_total,
//     //     //   products: auditProducts
//     //     // }),
//     //     JSON.stringify(auditData),
//     //     userId,
//     //     remarks || "Billing created",
//     //   ],
//     // );

//     await AuditLog({
//       connection,
//       table: "customerBilling",
//       recordId: billing_id,
//       action: "INSERT",
//       newData: auditData,
//       userId: userId,
//       remarks: "Billing created",
//     });

//     await connection.commit();

//     res.status(201).json({
//       message: "Invoice created successfully",
//       // id: billing_id,
//       invoice: {
//         id: billing_id,
//       },
//       invoice_number,
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error("Billing create error:", err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

/* igst addition + audit log + stock change service refactor */
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
      remarks,
    } = req.body;

    const userId = req.user?.id;

    // ======================================================
    // ✅ AUTH CHECK
    // ======================================================

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ======================================================
    // ✅ VALIDATION
    // ======================================================

    if (
      !customer_id ||
      !customer_name ||
      !staff_name ||
      !bank_id ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({
        message: "Invalid billing data",
      });
    }

    // ======================================================
    // ✅ VERIFY BANK
    // ======================================================

    const [[bank]] = await connection.query(
      `
      SELECT id
      FROM company_bank_details
      WHERE id = ?
      AND status = 'active'
      `,
      [bank_id],
    );

    if (!bank) {
      throw new Error(`Invalid bank id ${bank_id} or inactive bank`);
    }

    // ======================================================
    // ✅ INVOICE DETAILS
    // ======================================================

    const invoice_number = await generateInvoiceNumber();

    const invoice_date = new Date();

    let subtotal = 0;

    let grand_total = 0;

    let total_gst_amount = 0;

    const processedProducts = [];

    // ======================================================
    // ✅ STOCK CHECK + GST CALCULATION
    // ======================================================

    for (const item of products) {
      const { product_id, quantity, final_rate } = item;

      const qty = Number(quantity);

      if (!product_id || qty <= 0) {
        throw new Error("Invalid product quantity");
      }

      // ✅ LOCK PRODUCT
      const [[product]] = await connection.query(
        `
        SELECT *
        FROM products
        WHERE id = ?
        FOR UPDATE
        `,
        [product_id],
      );

      if (!product) {
        throw new Error("Product not found");
      }

      // ✅ STOCK CHECK
      if (Number(product.stock) < qty) {
        throw new Error(`Stock low: ${product.product_name}`);
      }

      const rate = Number(product.price);

      const applied_rate = Number(final_rate ?? rate);

      // ✅ VALIDATE FINAL RATE
      if (applied_rate > rate) {
        throw new Error(
          `Final rate cannot exceed actual price for ${product.product_name}`,
        );
      }

      // ======================================================
      // ✅ BASE TOTAL
      // ======================================================

      const baseTotal = qty * applied_rate;

      // ======================================================
      // ✅ GST
      // ======================================================

      const hsn_code = product.hsn_code;

      const cgst_rate = Number(product.cgst_rate || 0);

      const sgst_rate = Number(product.sgst_rate || 0);

      const igst_rate = Number(product.igst_rate || 0);

      const cgst_amount = (baseTotal * cgst_rate) / 100;

      const sgst_amount = (baseTotal * sgst_rate) / 100;

      const igst_amount = (baseTotal * igst_rate) / 100;

      const gst_total_rate = cgst_rate + sgst_rate + igst_rate;

      const gst_total_amount = cgst_amount + sgst_amount + igst_amount;

      // ======================================================
      // ✅ ORIGINAL TOTAL
      // ======================================================

      const originalTotal = qty * rate;

      // ======================================================
      // ✅ DISCOUNT
      // ======================================================

      const discount_amount = originalTotal - baseTotal;

      const discount_percent =
        originalTotal > 0
          ? Number(((discount_amount / originalTotal) * 100).toFixed(2))
          : 0;

      // ======================================================
      // ✅ TOTAL INCLUDING GST
      // ======================================================

      const total = baseTotal + gst_total_amount;

      subtotal += baseTotal;

      total_gst_amount += gst_total_amount;

      grand_total += total;

      // ======================================================
      // ✅ STORE PROCESSED PRODUCT
      // ======================================================

      processedProducts.push({
        product_id,

        product_name: product.product_name,

        product_brand: product.brand,

        product_category: product.category,

        product_quantity: product.quantity,

        quantity: qty,

        rate,

        final_rate: applied_rate,

        hsn_code,

        cgst_rate,
        sgst_rate,
        igst_rate,

        gst_total_rate,

        cgst_amount,
        sgst_amount,
        igst_amount,

        gst_total_amount,
        discount_percent,
        discount_amount,
        total,
      });
    }

    // ======================================================
    // ✅ PAYMENT
    // ======================================================

    const advance_paid =
      Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);

    const balance_due = grand_total - advance_paid;

    if (balance_due < 0) {
      throw new Error("Payment exceeds bill amount");
    }

    // ======================================================
    // ✅ CREATE BILL
    // ======================================================

    const [billResult] = await connection.query(
      `
        INSERT INTO customerBilling (
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

          created_by,
          remarks
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
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
        grand_total,
        advance_paid,
        balance_due,

        cash_amount,
        upi_amount,
        cheque_amount,
        upi_reference,

        userId,
        remarks || "Billing created",
      ],
    );

    const billing_id = billResult.insertId;

    // ======================================================
    // ✅ INSERT PRODUCTS
    // ======================================================

    for (const item of processedProducts) {
      await connection.query(
        `
        INSERT INTO customerBillingProducts (
          billing_id,

          product_id,

          product_name,
          product_brand,
          product_category,
          product_quantity,

          hsn_code,

          cgst_rate,
          sgst_rate,
          igst_rate,
          gst_total_rate,

          cgst_amount,
          sgst_amount,
          igst_amount,
          gst_total_amount,

          discount_percent,
          discount_amount,

          quantity,
          rate,
          final_rate,
          total
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ? ,?, ?
        )
        `,
        [
          billing_id,

          item.product_id,

          item.product_name,
          item.product_brand,
          item.product_category,
          item.product_quantity,

          item.hsn_code,

          item.cgst_rate,
          item.sgst_rate,
          item.igst_rate,
          item.gst_total_rate,

          item.cgst_amount,
          item.sgst_amount,
          item.igst_amount,
          item.gst_total_amount,

          item.discount_percent,
          item.discount_amount,

          item.quantity,
          item.rate,
          item.final_rate,
          item.total,
        ],
      );

      // ======================================================
      // ✅ STOCK UPDATE
      // ======================================================

      await applyStockChange({
        conn: connection,

        product_id: item.product_id,

        qty_change: -item.quantity,

        reference_type: "SALE",

        reference_id: billing_id,

        remarks: "Billing created",

        userId,
      });
    }

    // ======================================================
    // ✅ AUDIT DATA
    // ======================================================

    const auditData = {
      invoice: {
        id: billing_id,

        invoice_number,

        customer_id,
        customer_name,

        subtotal,
        grand_total,

        total_gst_amount,

        advance_paid,
        balance_due,

        remarks,
      },

      products: processedProducts,

      meta: {
        created_by: userId,
        created_at: new Date(),
      },
    };

    // ======================================================
    // ✅ AUDIT LOG
    // ======================================================

    await AuditLog({
      connection,

      table: "customerBilling",

      recordId: billing_id,

      action: "INSERT",

      newData: auditData,

      userId,

      remarks: remarks || "Billing created",
    });

    await connection.commit();

    await sendSMS({
  phone: phone_number,
  message:
    `Invoice ${invoice_number} generated. Amount ₹${grand_total}`
});

    // ======================================================
    // ✅ RESPONSE
    // ======================================================

    res.status(201).json({
      message: "Invoice created successfully",

      invoice: {
        id: billing_id,
      },

      invoice_number,
    });
  } catch (err) {
    await connection.rollback();

    console.error("Billing create error:", err);

    res.status(400).json({
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
