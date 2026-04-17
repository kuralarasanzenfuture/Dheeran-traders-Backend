import db from "../../../config/db.js";
import { applyStockChange } from "../../../services/billing/inventory.service.js";

// export const updateCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;

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

//     if (!id || !Array.isArray(products) || products.length === 0) {
//       throw new Error("Invalid update data");
//     }

//     /* 1️⃣ CHECK BILL EXISTS */
//     const [[bill]] = await connection.query(
//       `SELECT * FROM customerBilling WHERE id=?`,
//       [id]
//     );

//     if (!bill) throw new Error("Invoice not found");

//     /* 2️⃣ GET OLD PRODUCTS */
//     const [oldProducts] = await connection.query(
//       `SELECT product_id, quantity FROM customerBillingProducts WHERE billing_id=?`,
//       [id]
//     );

//     /* 3️⃣ RESTORE STOCK */
//     for (const item of oldProducts) {
//       await connection.query(
//         `UPDATE products SET stock = stock + ? WHERE id=?`,
//         [item.quantity, item.product_id]
//       );
//     }

//     /* 4️⃣ DELETE OLD PRODUCTS */
//     await connection.query(
//       `DELETE FROM customerBillingProducts WHERE billing_id=?`,
//       [id]
//     );

//     let subtotal = 0;
//     let grand_total = 0;

//     /* 5️⃣ RE-INSERT PRODUCTS */
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
//         `SELECT stock, product_name, brand, category, quantity, price
//          FROM products WHERE id=? FOR UPDATE`,
//         [product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < qty)
//         throw new Error(`Stock low: ${product.product_name}`);

//       const rate = Number(product.price);
//       const applied_rate = Number(final_rate ?? rate);

//       if (applied_rate > rate)
//         throw new Error("Final rate cannot exceed product price");

//       const baseTotal = qty * rate;
//       const finalBaseTotal = qty * applied_rate;

//       const discount_amount = baseTotal - finalBaseTotal;
//       const discount_percent =
//         baseTotal > 0 ? (discount_amount / baseTotal) * 100 : 0;

//       const cgst_amount = (finalBaseTotal * cgst_rate) / 100;
//       const sgst_amount = (finalBaseTotal * sgst_rate) / 100;

//       const gst_total_rate = Number(cgst_rate) + Number(sgst_rate);
//       const gst_total_amount = cgst_amount + sgst_amount;

//       const total = finalBaseTotal;

//       subtotal += total;
//       grand_total += total;

//       await connection.query(
//         `INSERT INTO customerBillingProducts (
//           billing_id, product_id, product_name, product_brand, product_category, product_quantity,
//           hsn_code, cgst_rate, sgst_rate, gst_total_rate,
//           cgst_amount, sgst_amount, gst_total_amount,
//           discount_percent, discount_amount,
//           quantity, rate, final_rate, total
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           id,
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

//       /* STOCK DEDUCT */
//       await connection.query(
//         `UPDATE products SET stock = stock - ? WHERE id=?`,
//         [qty, product_id]
//       );
//     }

//     /* 6️⃣ PAYMENT CALCULATION */
//     const advance_paid =
//       Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);

//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) throw new Error("Payment exceeds bill");

//     /* 7️⃣ UPDATE BILL */
//     await connection.query(
//       `UPDATE customerBilling SET
//         customer_id=?,
//         customer_name=?,
//         phone_number=?,
//         customer_gst_number=?,
//         company_gst_number=?,
//         vehicle_number=?,
//         eway_bill_number=?,
//         staff_name=?,
//         staff_phone=?,
//         bank_id=?,
//         subtotal=?,
//         grand_total=?,
//         advance_paid=?,
//         balance_due=?,
//         cash_amount=?,
//         upi_amount=?,
//         cheque_amount=?,
//         upi_reference=?
//       WHERE id=?`,
//       [
//         customer_id,
//         customer_name,
//         phone_number,
//         customer_gst_number,
//         company_gst_number,
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
//         id,
//       ]
//     );

//     await connection.commit();

//     res.json({ message: "Invoice updated successfully" });

//   } catch (err) {
//     await connection.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

/* implementation for audit and stocks */
// export const updateCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const userId = req.user?.id;

//     if (!userId) throw new Error("Unauthorized");

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

//     if (!id || !Array.isArray(products) || products.length === 0) {
//       throw new Error("Invalid update data");
//     }

//     /* =========================
//        1️⃣ OLD DATA
//     ========================= */
//     const [[oldBill]] = await connection.query(
//       `SELECT * FROM customerBilling WHERE id=?`,
//       [id]
//     );

//     if (!oldBill) throw new Error("Invoice not found");

//     const [oldProducts] = await connection.query(
//       `SELECT * FROM customerBillingProducts WHERE billing_id=?`,
//       [id]
//     );

//     /* =========================
//        2️⃣ RESTORE STOCK + LEDGER
//     ========================= */
//     for (const item of oldProducts) {
//       const [[p]] = await connection.query(
//         `SELECT stock FROM products WHERE id=? FOR UPDATE`,
//         [item.product_id]
//       );

//       const newStock = p.stock + item.quantity;

//       await connection.query(
//         `UPDATE products SET stock=? WHERE id=?`,
//         [newStock, item.product_id]
//       );

//       await connection.query(
//         `INSERT INTO billing_stock_inventory_ledger
//         (product_id, change_qty, balance_after, reference_type, reference_id, created_by)
//         VALUES (?, ?, ?, 'UPDATE_REVERT', ?, ?)`,
//         [item.product_id, item.quantity, newStock, id, userId]
//       );
//     }

//     /* =========================
//        3️⃣ DELETE OLD PRODUCTS
//     ========================= */
//     await connection.query(
//       `DELETE FROM customerBillingProducts WHERE billing_id=?`,
//       [id]
//     );

//     let subtotal = 0;
//     let grand_total = 0;

//     /* =========================
//        4️⃣ INSERT NEW PRODUCTS
//     ========================= */
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
//         `SELECT * FROM products WHERE id=? FOR UPDATE`,
//         [product_id]
//       );

//       if (!product) throw new Error("Product not found");

//       if (product.stock < qty) {
//         throw new Error(`Stock low: ${product.product_name}`);
//       }

//       const rate = Number(product.price);
//       const applied_rate = Number(final_rate ?? rate);

//       if (applied_rate > rate) {
//         throw new Error("Final rate cannot exceed price");
//       }

//       const total = qty * applied_rate;

//       subtotal += total;
//       grand_total += total;

//       await connection.query(
//         `INSERT INTO customerBillingProducts (
//           billing_id, product_id, product_name, product_brand, product_category, product_quantity,
//           hsn_code, cgst_rate, sgst_rate, gst_total_rate,
//           cgst_amount, sgst_amount, gst_total_amount,
//           discount_percent, discount_amount,
//           quantity, rate, final_rate, total
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           id,
//           product_id,
//           product.product_name,
//           product.brand,
//           product.category,
//           product.quantity,
//           hsn_code,
//           cgst_rate,
//           sgst_rate,
//           cgst_rate + sgst_rate,
//           0,
//           0,
//           0,
//           0,
//           0,
//           qty,
//           rate,
//           applied_rate,
//           total,
//         ]
//       );

//       /* 🔻 CORRECT STOCK UPDATE */
//       const newStock = product.stock - qty;

//       if (newStock < 0) {
//         throw new Error("Insufficient stock");
//       }
//       // UPDATE STOCK
//       // await connection.query(
//       //   `UPDATE products SET stock=? WHERE id=?`,
//       //   [newStock, product_id]
//       // );

//       /* 📘 LEDGER */
//       // await connection.query(
//       //   `INSERT INTO billing_stock_inventory_ledger
//       //   (product_id, change_qty, balance_after, reference_type, reference_id, created_by)
//       //   VALUES (?, ?, ?, 'UPDATE_SALE', ?, ?)`,
//       //   [product_id, -qty, newStock, id, userId]
//       // );

//       applyStockChange({
//         conn: connection,
//         product_id: product_id,
//         qty_change: -qty,
//         reference_type: "UPDATE_SALE",
//         reference_id: id,
//         remarks: remarks ?? "Update billing sale",
//         userId: userId,
//       })

//     }

//     /* =========================
//        5️⃣ PAYMENT
//     ========================= */
//     const advance_paid =
//       Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);

//     const balance_due = grand_total - advance_paid;

//     if (balance_due < 0) {
//       throw new Error("Payment exceeds bill");
//     }

//     /* =========================
//        6️⃣ UPDATE BILL
//     ========================= */
//     await connection.query(
//       `UPDATE customerBilling SET
//         customer_id=?, customer_name=?, phone_number=?, customer_gst_number=?,
//         company_gst_number=?, vehicle_number=?, eway_bill_number=?,
//         staff_name=?, staff_phone=?, bank_id=?,
//         subtotal=?, grand_total=?, advance_paid=?, balance_due=?,
//         cash_amount=?, upi_amount=?, cheque_amount=?, upi_reference=?, remarks=?
//       WHERE id=?`,
//       [
//         customer_id,
//         customer_name,
//         phone_number,
//         customer_gst_number,
//         company_gst_number,
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
//         remarks || "Billing updated",
//         id,
//       ]
//     );

//     /* =========================
//        7️⃣ AUDIT
//     ========================= */
//     await connection.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//       VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [
//         "customerBilling",
//         id,
//         "UPDATE",
//         JSON.stringify({ invoice: oldBill, products: oldProducts }),
//         JSON.stringify({ products }),
//         userId,
//         remarks || "Billing updated",
//       ]
//     );

//     await connection.commit();

//     res.json({
//       message: "Invoice updated successfully",
//      });

//   } catch (err) {
//     await connection.rollback();
//     console.error("Update Billing Error:", err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

const diff = (oldProducts, newProducts) => {
  const changes = [];

  const oldMap = new Map();
  const newMap = new Map();

  oldProducts.forEach((p) => oldMap.set(p.product_id, p));
  newProducts.forEach((p) => newMap.set(p.product_id, p));

  /* 🔹 Check ADDED + MODIFIED */
  for (const [product_id, newItem] of newMap.entries()) {
    const oldItem = oldMap.get(product_id);

    if (!oldItem) {
      changes.push({
        type: "ADDED",
        product: newItem,
      });
      continue;
    }

    // Compare important fields
    if (
      oldItem.quantity !== newItem.quantity ||
      oldItem.final_rate !== newItem.final_rate ||
      oldItem.cgst_rate !== newItem.cgst_rate ||
      oldItem.sgst_rate !== newItem.sgst_rate ||
      oldItem.discount_amount !== newItem.discount_amount
    ) {
      changes.push({
        type: "MODIFIED",
        before: oldItem,
        after: newItem,
      });
    }
  }

  /* 🔹 Check REMOVED */
  for (const [product_id, oldItem] of oldMap.entries()) {
    if (!newMap.has(product_id)) {
      changes.push({
        type: "REMOVED",
        product: oldItem,
      });
    }
  }

  return changes;
};

const buildSideBySideDiff = (oldProducts, newProducts) => {
  const result = [];

  const oldMap = new Map();
  const newMap = new Map();

  oldProducts.forEach((p) => oldMap.set(p.product_id, p));
  newProducts.forEach((p) => newMap.set(p.product_id, p));

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

  for (const product_id of allKeys) {
    const oldItem = oldMap.get(product_id) || null;
    const newItem = newMap.get(product_id) || null;

    let type = "UNCHANGED";

    if (!oldItem) type = "ADDED";
    else if (!newItem) type = "REMOVED";
    else {
      if (
        Number(oldItem.quantity) !== Number(newItem.quantity) ||
        Number(oldItem.final_rate) !== Number(newItem.final_rate) ||
        Number(oldItem.cgst_rate) !== Number(newItem.cgst_rate) ||
        Number(oldItem.sgst_rate) !== Number(newItem.sgst_rate) ||
        Number(oldItem.discount_amount) !== Number(newItem.discount_amount)
      ) {
        type = "MODIFIED";
      }
    }

    result.push({
      product_id,
      type,
      old: oldItem,
      new: newItem,
    });
  }

  return result;
};

const buildFullFlatDiff = (oldProducts, newProducts) => {
  const result = [];

  const oldMap = new Map();
  const newMap = new Map();

  oldProducts.forEach((p) => oldMap.set(p.product_id, p));
  newProducts.forEach((p) => newMap.set(p.product_id, p));

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

  for (const product_id of allKeys) {
    const oldItem = oldMap.get(product_id) || {};
    const newItem = newMap.get(product_id) || {};

    const row = {
      product_id,
      type: !oldMap.has(product_id)
        ? "ADDED"
        : !newMap.has(product_id)
          ? "REMOVED"
          : "UPDATED",
    };

    // 🔥 Collect ALL fields dynamically
    const allFields = new Set([
      ...Object.keys(oldItem),
      ...Object.keys(newItem),
    ]);

    for (const field of allFields) {
      row[`${field}_old`] =
        oldItem[field] !== undefined ? oldItem[field] : null;

      row[`${field}_new`] =
        newItem[field] !== undefined ? newItem[field] : null;
    }

    result.push(row);
  }

  return result;
};

const buildInvoiceFlatDiff = (oldBill, newBill) => {
  const row = {};

  const allFields = new Set([...Object.keys(oldBill), ...Object.keys(newBill)]);

  for (const field of allFields) {
    row[`${field}_old`] = oldBill[field] ?? null;
    row[`${field}_new`] = newBill[field] ?? null;
  }

  return row;
};

export const updateCustomerBilling = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

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

    if (!id || !Array.isArray(products) || products.length === 0) {
      throw new Error("Invalid update data");
    }

    /* =========================
       1️⃣ OLD DATA
    ========================= */
    const [[oldBill]] = await connection.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!oldBill) throw new Error("Invoice not found");

    const [oldProducts] = await connection.query(
      `SELECT * FROM customerBillingProducts WHERE billing_id=?`,
      [id],
    );

    /* =========================
       2️⃣ RESTORE STOCK
    ========================= */
    for (const item of oldProducts) {
      await applyStockChange({
        conn: connection,
        product_id: item.product_id,
        qty_change: item.quantity,
        reference_type: "UPDATE_REVERT",
        reference_id: id,
        remarks: "Revert old billing",
        userId,
      });
    }

    /* =========================
       3️⃣ DELETE OLD PRODUCTS
    ========================= */
    await connection.query(
      `DELETE FROM customerBillingProducts WHERE billing_id=?`,
      [id],
    );

    let subtotal = 0;
    let grand_total = 0;

    /* =========================
       4️⃣ INSERT NEW PRODUCTS
    ========================= */
    for (const item of products) {
      const {
        product_id,
        quantity,
        final_rate,
        hsn_code = null,
        cgst_rate = 0,
        sgst_rate = 0,
      } = item;

      const qty = Number(quantity);

      if (qty <= 0) throw new Error("Invalid quantity");

      const [[product]] = await connection.query(
        `SELECT * FROM products WHERE id=? FOR UPDATE`,
        [product_id],
      );

      if (!product) throw new Error("Product not found");

      if (product.stock < qty) {
        throw new Error(`Stock low: ${product.product_name}`);
      }

      const rate = Number(product.price);
      const applied_rate = Number(final_rate ?? rate);

      if (applied_rate > rate) {
        throw new Error("Final rate cannot exceed price");
      }

      const total = Number((qty * applied_rate).toFixed(2));

      subtotal += total;
      grand_total += total;

      await connection.query(
        `INSERT INTO customerBillingProducts (
          billing_id, product_id, product_name, product_brand, product_category, product_quantity,
          hsn_code, cgst_rate, sgst_rate, gst_total_rate,
          cgst_amount, sgst_amount, gst_total_amount,
          discount_percent, discount_amount,
          quantity, rate, final_rate, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          product_id,
          product.product_name,
          product.brand,
          product.category,
          product.quantity,
          hsn_code,
          cgst_rate,
          sgst_rate,
          cgst_rate + sgst_rate,
          0,
          0,
          0,
          0,
          0,
          qty,
          rate,
          applied_rate,
          total,
        ],
      );

      /* STOCK DEDUCT (IMPORTANT: await) */
      await applyStockChange({
        conn: connection,
        product_id,
        qty_change: -qty,
        reference_type: "UPDATE_SALE",
        reference_id: id,
        remarks: "Update billing sale",
        userId,
      });
    }

    /* =========================
       5️⃣ PAYMENT
    ========================= */
    const advance_paid =
      Number(cash_amount) + Number(upi_amount) + Number(cheque_amount);

    if (advance_paid < 0) throw new Error("Invalid payment");

    const balance_due = Number((grand_total - advance_paid).toFixed(2));

    if (balance_due < 0) {
      throw new Error("Payment exceeds bill");
    }

    /* =========================
       6️⃣ UPDATE BILL
    ========================= */
    await connection.query(
      `UPDATE customerBilling SET
        customer_id=?, customer_name=?, phone_number=?, customer_gst_number=?,
        company_gst_number=?, vehicle_number=?, eway_bill_number=?,
        staff_name=?, staff_phone=?, bank_id=?,
        subtotal=?, grand_total=?, advance_paid=?, balance_due=?,
        cash_amount=?, upi_amount=?, cheque_amount=?, upi_reference=?, remarks=?
      WHERE id=?`,
      [
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
        subtotal,
        grand_total,
        advance_paid,
        balance_due,
        cash_amount,
        upi_amount,
        cheque_amount,
        upi_reference,
        remarks || "Billing updated",
        id,
      ],
    );

    /* =========================
       7️⃣ FETCH NEW DATA (INSIDE TX)
    ========================= */
    const [[newBill]] = await connection.query(
      `SELECT * FROM customerBilling WHERE id=?`,
      [id],
    );

    const [newProducts] = await connection.query(
      `SELECT * FROM customerBillingProducts WHERE billing_id=?`,
      [id],
    );

    /* =========================
       8️⃣ DIFF
    ========================= */
    // const changes = diff(oldProducts, newProducts);

    const changes = buildSideBySideDiff(oldProducts, newProducts);

    const productChanges = buildFullFlatDiff(oldProducts, newProducts);
    const invoiceChanges = buildInvoiceFlatDiff(oldBill, newBill);

    /* =========================
       9️⃣ AUDIT (REAL DATA)
    ========================= */
    await connection.query(
      `INSERT INTO audit_logs
      (table_name, record_id, action, old_data, new_data, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "customerBilling",
        id,
        "UPDATE",
        JSON.stringify({ invoice: oldBill, products: oldProducts }),
        JSON.stringify({
          invoice: newBill,
          products: newProducts,
          changes,
        }),
        userId,
        remarks || "Billing updated",
      ],
    );

    await connection.commit();

    /* =========================
       🔟 RESPONSE
    ========================= */
    // res.json({
    //   message: "Invoice updated successfully",
    //   data: {
    //     before: {
    //       invoice: oldBill,
    //       products: oldProducts,
    //     },
    //     after: {
    //       invoice: newBill,
    //       products: newProducts,
    //     },
    //     changes,
    //     summary: {
    //       total_items_before: oldProducts.length,
    //       total_items_after: newProducts.length,
    //       total_changes: changes.length,
    //       grand_total_before: oldBill.grand_total,
    //       grand_total_after: newBill.grand_total,
    //     },
    //   },
    // });

    res.json({
      message: "Invoice updated successfully",
      data: {
        invoice: invoiceChanges, // 🔥 full column diff
        products: productChanges, // 🔥 full column diff

        summary: {
          total_products: productChanges.length,
          modified_products: productChanges.filter((p) => p.type === "UPDATED")
            .length,
          added_products: productChanges.filter((p) => p.type === "ADDED")
            .length,
          removed_products: productChanges.filter((p) => p.type === "REMOVED")
            .length,
        },
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error("Update Billing Error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
};
