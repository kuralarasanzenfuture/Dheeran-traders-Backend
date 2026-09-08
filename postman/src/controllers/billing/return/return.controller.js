import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";
import { applyStockChange } from "../../../services/billing/inventory.service.js";

const getFinancialYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 4) {
    return `${year.toString().slice(2)}-${(year + 1).toString().slice(2)}`;
  } else {
    return `${(year - 1).toString().slice(2)}-${year.toString().slice(2)}`;
  }
};

const generateReturnNumber = async (conn) => {
  const fy = getFinancialYear();

  const [[row]] = await conn.query(
    `SELECT return_number 
     FROM customerBillingReturns 
     WHERE return_number LIKE ? 
     ORDER BY id DESC 
     LIMIT 1 FOR UPDATE`,
    [`RTN/${fy}/%`],
  );

  let nextNumber = 1;

  if (row) {
    const last = row.return_number.split("/")[2];
    nextNumber = parseInt(last, 10) + 1;
  }

  const padded = String(nextNumber).padStart(4, "0");

  return `RTN/${fy}/${padded}`;
};

// export const createCustomerReturn = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     const { billing_id, products, remarks } = req.body;

//     const return_date = new Date().toISOString().slice(0, 10);

//     if (
//       !billing_id ||
//       !return_date ||
//       !Array.isArray(products) ||
//       products.length === 0
//     ) {
//       throw new Error("Invalid return data");
//     }

//     /* =========================
//        1️⃣ LOCK BILL
//     ========================= */
//     const [[bill]] = await conn.query(
//       `SELECT id, balance_due FROM customerBilling WHERE id=? FOR UPDATE`,
//       [billing_id],
//     );

//     if (!bill) throw new Error("Invoice not found");

//     let totalReturnAmount = 0;

//     const return_number = await generateReturnNumber(conn);

//     /* =========================
//        2️⃣ CREATE RETURN ENTRY
//     ========================= */
//     const [returnResult] = await conn.query(
//       `INSERT INTO customerBillingReturns
//       (billing_id,return_number, return_date, total_return_amount, created_by, remarks)
//       VALUES (?, ?, ?, 0, ?, ?)`,
//       [billing_id, return_number, return_date, userId, remarks],
//     );

//     const return_id = returnResult.insertId;

//     /* =========================
//        3️⃣ PROCESS PRODUCTS
//     ========================= */
//     for (const item of products) {
//       const { billing_product_id, return_quantity } = item;

//       if (!billing_product_id || !return_quantity) {
//         throw new Error("Invalid product return data");
//       }

//       /* 🔒 lock billing product */
//       const [[bp]] = await conn.query(
//         `SELECT * FROM customerBillingProducts WHERE id=? FOR UPDATE`,
//         [billing_product_id],
//       );

//       if (!bp) throw new Error("Billing product not found");

//       const allowedReturn = bp.quantity - (bp.returned_quantity || 0);

//       if (return_quantity > allowedReturn) {
//         throw new Error(
//           `Return exceeds allowed for product ${bp.product_name}`,
//         );
//       }

//       const rate = Number(bp.final_rate);
//       const amount = Number((return_quantity * rate).toFixed(2));

//       totalReturnAmount += amount;

//       /* =========================
//          INSERT RETURN PRODUCT
//       ========================= */
//       await conn.query(
//         `INSERT INTO customerBillingReturnsProducts
//         (return_id, billing_product_id, product_id, return_quantity, return_rate, return_amount)
//         VALUES (?, ?, ?, ?, ?, ?)`,
//         [
//           return_id,
//           billing_product_id,
//           bp.product_id,
//           return_quantity,
//           rate,
//           amount,
//         ],
//       );

//       /* =========================
//          UPDATE RETURNED QTY
//       ========================= */
//       await conn.query(
//         `UPDATE customerBillingProducts
//          SET returned_quantity = returned_quantity + ?
//          WHERE id=?`,
//         [return_quantity, billing_product_id],
//       );

//       /* =========================
//          STOCK RESTORE
//       ========================= */
//       await applyStockChange({
//         conn,
//         product_id: bp.product_id,
//         qty_change: return_quantity,
//         reference_type: "RETURN",
//         reference_id: return_id,
//         remarks: "Product return",
//         userId,
//       });
//     }

//     /* =========================
//        4️⃣ UPDATE RETURN TOTAL
//     ========================= */
//     await conn.query(
//       `UPDATE customerBillingReturns
//        SET total_return_amount=?
//        WHERE id=?`,
//       [totalReturnAmount, return_id],
//     );

//     /* =========================
//        5️⃣ UPDATE BILL
//     ========================= */
//     const newBalance = Number(
//       (Number(bill.balance_due) - totalReturnAmount).toFixed(2),
//     );

//     await conn.query(
//       `UPDATE customerBilling
//        SET balance_due=?, updated_by=?
//        WHERE id=?`,
//       [newBalance, userId, billing_id],
//     );

//     /* =========================
//        6️⃣ AUDIT
//     ========================= */
//     await AuditLog({
//       connection: conn,
//       table: "customerBillingReturns",
//       recordId: return_id,
//       action: "INSERT",
//       newData: {
//         billing_id,
//         totalReturnAmount,
//         products,
//       },
//       userId,
//       remarks: remarks || "Return created",
//     });

//     await conn.commit();

//     res.status(201).json({
//       message: "Return created successfully",
//       data: {
//         return_id,
//         total_return_amount: totalReturnAmount,
//         balance_after: newBalance,
//       },
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error("Return Error:", err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

/*------------- error in full return status ------------------------------ */

// export const createCustomerReturn = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     const { billing_id, products, remarks } = req.body;
//     const return_date = new Date().toISOString().slice(0, 10);

//     if (!billing_id || !Array.isArray(products) || products.length === 0) {
//       throw new Error("Invalid return data");
//     }

//     /* =========================
//        1️⃣ LOCK BILL
//     ========================= */
//     const [[bill]] = await conn.query(
//       `SELECT id, balance_due FROM customerBilling WHERE id=? FOR UPDATE`,
//       [billing_id]
//     );

//     if (!bill) throw new Error("Invoice not found");

//     /* =========================
//        2️⃣ VALIDATE FIRST (CRITICAL)
//     ========================= */
//     for (const item of products) {
//       const { billing_product_id, return_quantity } = item;

//       if (!billing_product_id || !return_quantity) {
//         throw new Error("Invalid product return data");
//       }

//       const qty = Number(return_quantity);
//       if (qty <= 0) throw new Error("Return qty must be > 0");

//       const [[bp]] = await conn.query(
//         `SELECT quantity, COALESCE(returned_quantity,0) as returned_quantity, product_name
//          FROM customerBillingProducts
//          WHERE id=? FOR UPDATE`,
//         [billing_product_id]
//       );

//       if (!bp) throw new Error("Billing product not found");

//       const allowed = bp.quantity - bp.returned_quantity;

//       if (qty > allowed) {
//         throw new Error(
//           `Return exceeds allowed for ${bp.product_name}. Allowed: ${allowed}`
//         );
//       }
//     }

//     let totalReturnAmount = 0;

//     const return_number = await generateReturnNumber(conn);

//     /* =========================
//        3️⃣ CREATE RETURN
//     ========================= */
//     const [returnResult] = await conn.query(
//       `INSERT INTO customerBillingReturns
//       (billing_id, return_number, return_date, total_return_amount, created_by, remarks)
//       VALUES (?, ?, ?, 0, ?, ?)`,
//       [billing_id, return_number, return_date, userId, remarks || null]
//     );

//     const return_id = returnResult.insertId;

//     /* =========================
//        4️⃣ PROCESS PRODUCTS
//     ========================= */
//     for (const item of products) {
//       const { billing_product_id, return_quantity } = item;
//       const qty = Number(return_quantity);

//       const [[bp]] = await conn.query(
//         `SELECT * FROM customerBillingProducts WHERE id=? FOR UPDATE`,
//         [billing_product_id]
//       );

//       const rate = Number(bp.final_rate);
//       const amount = Number((qty * rate).toFixed(2));

//       totalReturnAmount += amount;

//       /* INSERT RETURN PRODUCT */
//       await conn.query(
//         `INSERT INTO customerBillingReturnsProducts
//         (return_id, billing_product_id, product_id, return_quantity, return_rate, return_amount)
//         VALUES (?, ?, ?, ?, ?, ?)`,
//         [return_id, billing_product_id, bp.product_id, qty, rate, amount]
//       );

//       /* UPDATE RETURNED QTY */
//       await conn.query(
//         `UPDATE customerBillingProducts
//          SET returned_quantity = COALESCE(returned_quantity,0) + ?
//          WHERE id=?`,
//         [qty, billing_product_id]
//       );

//       /* STOCK RESTORE */
//       await applyStockChange({
//         conn,
//         product_id: bp.product_id,
//         qty_change: qty,
//         reference_type: "RETURN",
//         reference_id: return_id,
//         remarks: remarks ?? "Product return",
//         userId,
//       });
//     }

//     /* =========================
//        5️⃣ UPDATE RETURN TOTAL
//     ========================= */
//     await conn.query(
//       `UPDATE customerBillingReturns
//        SET total_return_amount=?
//        WHERE id=?`,
//       [totalReturnAmount, return_id]
//     );

//     /* =========================
//        6️⃣ UPDATE BILL
//     ========================= */
//     const newBalance = Number(
//       (Number(bill.balance_due) - totalReturnAmount).toFixed(2)
//     );

//     if (newBalance < 0) {
//       throw new Error("Return exceeds remaining balance");
//     }

//     /* =========================
//        7️⃣ RETURN STATUS (SAFE)
//     ========================= */
//     const [[summary]] = await conn.query(
//       `SELECT 
//         SUM(quantity) AS total_sold,
//         SUM(COALESCE(returned_quantity,0)) AS total_returned
//        FROM customerBillingProducts
//        WHERE billing_id=?`,
//       [billing_id]
//     );

//     let returnStatus = "NONE";

//     if (summary.total_returned == 0) {
//       returnStatus = "NONE";
//     } else if (summary.total_returned < summary.total_sold) {
//       returnStatus = "PARTIAL";
//     } else {
//       returnStatus = "FULL";
//     }

//     await conn.query(
//       `UPDATE customerBilling
//        SET balance_due=?, return_status=?, updated_by=?
//        WHERE id=?`,
//       [newBalance, returnStatus, userId, billing_id]
//     );

//     /* =========================
//        8️⃣ AUDIT
//     ========================= */
//     await AuditLog({
//       connection: conn,
//       table: "customerBillingReturns",
//       recordId: return_id,
//       action: "INSERT",
//       newData: {
//         billing_id,
//         return_number,
//         totalReturnAmount,
//         products,
//       },
//       userId,
//       remarks: remarks || "Return created",
//     });

//     await conn.commit();

//     res.status(201).json({
//       message: "Return created successfully",
//       data: {
//         return_id,
//         return_number,
//         total_return_amount: totalReturnAmount,
//         balance_after: newBalance,
//         return_status: returnStatus,
//       },
//     });

//   } catch (err) {
//     await conn.rollback();
//     console.error("Return Error:", err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const createCustomerReturn = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { billing_id, products, remarks } = req.body;
    const return_date = new Date().toISOString().slice(0, 10);

    if (!billing_id || !Array.isArray(products) || products.length === 0) {
      throw new Error("Invalid return data");
    }

    /* =========================
       1️⃣ LOCK BILL
    ========================= */
    const [[bill]] = await conn.query(
      `SELECT id, balance_due FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    if (!bill) throw new Error("Invoice not found");

    let totalReturnAmount = 0;

    const return_number = await generateReturnNumber(conn);

    /* =========================
       2️⃣ CREATE RETURN ENTRY
    ========================= */
    const [returnResult] = await conn.query(
      `INSERT INTO customerBillingReturns
      (billing_id, return_number, return_date, total_return_amount, created_by, remarks)
      VALUES (?, ?, ?, 0, ?, ?)`,
      [billing_id, return_number, return_date, userId, remarks || null]
    );

    const return_id = returnResult.insertId;

    /* =========================
       3️⃣ PROCESS PRODUCTS
    ========================= */
    for (const item of products) {
      const { billing_product_id, return_quantity } = item;

      if (!billing_product_id || !return_quantity) {
        throw new Error("Invalid product return data");
      }

      const qty = Number(return_quantity);
      if (qty <= 0) {
        throw new Error("Return quantity must be greater than 0");
      }

      /* 🔒 LOCK PRODUCT ROW */
      const [[bp]] = await conn.query(
        `SELECT * FROM customerBillingProducts WHERE id=? FOR UPDATE`,
        [billing_product_id]
      );

      if (!bp) throw new Error("Billing product not found");

      const soldQty = Number(bp.quantity);
      const alreadyReturned = Number(bp.returned_quantity || 0);

      const allowedReturn = soldQty - alreadyReturned;

      if (qty > allowedReturn) {
        throw new Error(
          `Return exceeds allowed for ${bp.product_name}. Allowed: ${allowedReturn}`
        );
      }

      const rate = Number(bp.final_rate);
      const amount = Number((qty * rate).toFixed(2));

      totalReturnAmount += amount;

      /* INSERT RETURN PRODUCT */
      await conn.query(
        `INSERT INTO customerBillingReturnsProducts
        (return_id, billing_product_id, product_id, return_quantity, return_rate, return_amount)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [return_id, billing_product_id, bp.product_id, qty, rate, amount]
      );

      /* UPDATE RETURNED QTY */
      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = COALESCE(returned_quantity, 0) + ?
         WHERE id=?`,
        [qty, billing_product_id]
      );

      /* STOCK RESTORE */
      await applyStockChange({
        conn,
        product_id: bp.product_id,
        qty_change: qty,
        reference_type: "RETURN",
        reference_id: return_id,
        remarks: remarks ?? "Product return",
        userId,
      });
    }

    /* =========================
       4️⃣ UPDATE RETURN TOTAL
    ========================= */
    await conn.query(
      `UPDATE customerBillingReturns
       SET total_return_amount=?
       WHERE id=?`,
      [totalReturnAmount, return_id]
    );

    /* =========================
       5️⃣ UPDATE BILL BALANCE
    ========================= */
    const newBalance = Number(
      (Number(bill.balance_due) - totalReturnAmount).toFixed(2)
    );

    if (newBalance < 0) {
      throw new Error("Return exceeds remaining balance");
    }

    /* =========================
       6️⃣ CORRECT RETURN STATUS (FIXED LOGIC)
    ========================= */
    const [rows] = await conn.query(
      `SELECT quantity, returned_quantity
       FROM customerBillingProducts
       WHERE billing_id=?`,
      [billing_id]
    );

    let allReturned = true;
    let anyReturned = false;

    for (const r of rows) {
      const sold = Number(r.quantity);
      const returned = Number(r.returned_quantity || 0);

      if (returned > 0) anyReturned = true;
      if (returned < sold) allReturned = false;

      /* HARD SAFETY CHECK */
      if (returned > sold) {
        throw new Error("Data corruption detected: returned > sold");
      }
    }

    let returnStatus = "NONE";

    if (!anyReturned) {
      returnStatus = "NONE";
    } else if (!allReturned) {
      returnStatus = "PARTIAL";
    } else {
      returnStatus = "FULL";
    }

    /* UPDATE BILL */
    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, return_status=?, updated_by=?
       WHERE id=?`,
      [newBalance, returnStatus, userId, billing_id]
    );

    /* =========================
       7️⃣ AUDIT
    ========================= */
    await AuditLog({
      connection: conn,
      table: "customerBillingReturns",
      recordId: return_id,
      action: "INSERT",
      newData: {
        billing_id,
        return_number,
        totalReturnAmount,
        products,
      },
      userId,
      remarks: remarks || "Return created",
    });

    await conn.commit();

    res.status(201).json({
      message: "Return created successfully",
      data: {
        return_id,
        return_number,
        total_return_amount: totalReturnAmount,
        balance_after: newBalance,
        return_status: returnStatus,
      },
    });

  } catch (err) {
    await conn.rollback();
    console.error("Return creation Error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const updateCustomerReturn = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { products, remarks } = req.body;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");
    if (!id || !Array.isArray(products) || products.length === 0) {
      throw new Error("Invalid data");
    }

    /* =========================
       1️⃣ GET RETURN + BILL
    ========================= */
    const [[ret]] = await conn.query(
      `SELECT * FROM customerBillingReturns WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!ret) throw new Error("Return not found");

    const billing_id = ret.billing_id;

    /* LOCK BILL */
    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    /* =========================
       2️⃣ GET OLD PRODUCTS
    ========================= */
    const [oldProducts] = await conn.query(
      `SELECT * FROM customerBillingReturnsProducts WHERE return_id=?`,
      [id]
    );

    /* =========================
       3️⃣ REVERT OLD EFFECT
    ========================= */
    let oldTotal = 0;

    for (const item of oldProducts) {
      oldTotal += Number(item.return_amount);

      // revert returned qty (SAFE)
      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = GREATEST(returned_quantity - ?, 0)
         WHERE id=?`,
        [item.return_quantity, item.billing_product_id]
      );

      // revert stock
      await applyStockChange({
        conn,
        product_id: item.product_id,
        qty_change: -item.return_quantity,
        reference_type: "RETURN_UPDATE_REVERT",
        reference_id: id,
        userId,
      });
    }

    /* DELETE OLD */
    await conn.query(
      `DELETE FROM customerBillingReturnsProducts WHERE return_id=?`,
      [id]
    );

    /* =========================
       4️⃣ APPLY NEW
    ========================= */
    let newTotal = 0;

    for (const item of products) {
      const qty = Number(item.return_quantity);
      if (!item.billing_product_id || qty <= 0) {
        throw new Error("Invalid return quantity");
      }

      const [[bp]] = await conn.query(
        `SELECT * FROM customerBillingProducts WHERE id=? FOR UPDATE`,
        [item.billing_product_id]
      );

      if (!bp) throw new Error("Product not found");

      const allowed = bp.quantity - (bp.returned_quantity || 0);

      if (qty > allowed) {
        throw new Error(`Allowed only ${allowed} for ${bp.product_name}`);
      }

      const amount = Number((qty * bp.final_rate).toFixed(2));
      newTotal += amount;

      await conn.query(
        `INSERT INTO customerBillingReturnsProducts
        (return_id, billing_product_id, product_id, return_quantity, return_rate, return_amount)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [id, item.billing_product_id, bp.product_id, qty, bp.final_rate, amount]
      );

      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = returned_quantity + ?
         WHERE id=?`,
        [qty, item.billing_product_id]
      );

      await applyStockChange({
        conn,
        product_id: bp.product_id,
        qty_change: qty,
        reference_type: "RETURN_UPDATE",
        reference_id: id,
        userId,
      });
    }

    /* =========================
       5️⃣ UPDATE RETURN
    ========================= */
    await conn.query(
      `UPDATE customerBillingReturns
       SET total_return_amount=?, updated_by=?, remarks=?
       WHERE id=?`,
      [newTotal, userId, remarks || null, id]
    );

    /* =========================
       6️⃣ FIX BILL BALANCE
    ========================= */
    const newBalance = Number(
      (Number(bill.balance_due) + oldTotal - newTotal).toFixed(2)
    );

    if (newBalance < 0) {
      throw new Error("Invalid balance after update");
    }

    /* =========================
       7️⃣ FIX RETURN STATUS (CORRECT LOGIC)
    ========================= */
    const [rows] = await conn.query(
      `SELECT quantity, returned_quantity
       FROM customerBillingProducts
       WHERE billing_id=?`,
      [billing_id]
    );

    let allReturned = true;
    let anyReturned = false;

    for (const r of rows) {
      const sold = Number(r.quantity);
      const returned = Number(r.returned_quantity || 0);

      if (returned > 0) anyReturned = true;
      if (returned < sold) allReturned = false;

      if (returned > sold) {
        throw new Error("Data corruption detected");
      }
    }

    let returnStatus = "NONE";
    if (!anyReturned) returnStatus = "NONE";
    else if (!allReturned) returnStatus = "PARTIAL";
    else returnStatus = "FULL";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, return_status=?, updated_by=?
       WHERE id=?`,
      [newBalance, returnStatus, userId, billing_id]
    );

    /* =========================
       8️⃣ AUDIT
    ========================= */
    await AuditLog({
      connection: conn,
      table: "customerBillingReturns",
      recordId: id,
      action: "UPDATE",
      newData: { products, newTotal },
      userId,
      remarks: "Return updated",
    });

    await conn.commit();

    res.json({
      message: "Return updated successfully",
      total_return_amount: newTotal,
      balance_after: newBalance,
      return_status: returnStatus,
    });

  } catch (err) {
    console.error("Return Update Error:", err);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteCustomerReturn = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const {remarks} = req.body || {};
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    /* =========================
       1️⃣ GET RETURN + BILL
    ========================= */
    const [[ret]] = await conn.query(
      `SELECT * FROM customerBillingReturns WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!ret) throw new Error("Return not found");

    const billing_id = ret.billing_id;

    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    /* =========================
       2️⃣ GET PRODUCTS
    ========================= */
    const [products] = await conn.query(
      `SELECT * FROM customerBillingReturnsProducts WHERE return_id=?`,
      [id]
    );

    let totalReturnAmount = 0;

    /* =========================
       3️⃣ REVERT EVERYTHING
    ========================= */
    for (const item of products) {
      totalReturnAmount += Number(item.return_amount);

      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = GREATEST(returned_quantity - ?, 0)
         WHERE id=?`,
        [item.return_quantity, item.billing_product_id]
      );

      await applyStockChange({
        conn,
        product_id: item.product_id,
        qty_change: -item.return_quantity,
        reference_type: "RETURN_DELETE",
        reference_id: id,
        userId,
      });
    }

    /* =========================
       4️⃣ DELETE
    ========================= */
    await conn.query(
      `DELETE FROM customerBillingReturns WHERE id=?`,
      [id]
    );

    /* =========================
       5️⃣ FIX BALANCE
    ========================= */
    const newBalance = Number(
      (Number(bill.balance_due) + totalReturnAmount).toFixed(2)
    );

    /* =========================
       6️⃣ FIX STATUS
    ========================= */
    const [rows] = await conn.query(
      `SELECT quantity, returned_quantity
       FROM customerBillingProducts
       WHERE billing_id=?`,
      [billing_id]
    );

    let allReturned = true;
    let anyReturned = false;

    for (const r of rows) {
      const sold = Number(r.quantity);
      const returned = Number(r.returned_quantity || 0);

      if (returned > 0) anyReturned = true;
      if (returned < sold) allReturned = false;
    }

    let returnStatus = "NONE";
    if (!anyReturned) returnStatus = "NONE";
    else if (!allReturned) returnStatus = "PARTIAL";
    else returnStatus = "FULL";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, return_status=?, updated_by=?
       WHERE id=?`,
      [newBalance, returnStatus, userId, billing_id]
    );

    /* =========================
       7️⃣ AUDIT
    ========================= */
    await AuditLog({
      connection: conn,
      table: "customerBillingReturns",
      recordId: id,
      action: "DELETE",
      oldData: products,
      userId,
      remarks: remarks || "Return deleted",
    });

    await conn.commit();

    res.json({
      message: "Return deleted successfully",
      balance_after: newBalance,
      return_status: returnStatus,
    });

  } catch (err) {
    console.error("Return Delete Error:", err);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
