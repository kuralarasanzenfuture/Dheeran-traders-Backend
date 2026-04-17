import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";
import { applyStockChange } from "../../../services/billing/inventory.service.js";

// export const deleteCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();
//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;

//     // 1️⃣ Get products of this bill
//     const [products] = await connection.query(
//       `SELECT product_id, quantity FROM customerBillingProducts WHERE billing_id = ?`,
//       [id],
//     );

//     if (products.length === 0) {
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     // 2️⃣ Restore stock
//     for (const item of products) {
//       await connection.query(
//         `UPDATE products SET stock = stock + ? WHERE id = ?`,
//         [item.quantity, item.product_id],
//       );
//     }

//     // 3️⃣ Delete products
//     await connection.query(
//       `DELETE FROM customerBillingProducts WHERE billing_id = ?`,
//       [id],
//     );

//     // 4️⃣ Delete bill
//     await connection.query(`DELETE FROM customerBilling WHERE id = ?`, [id]);

//     await connection.commit();
//     res.json({ message: "Invoice deleted successfully" });
//   } catch (err) {
//     await connection.rollback();
//     console.error("Delete error:", err);
//     res.status(500).json({ message: "Delete failed" });
//   } finally {
//     connection.release();
//   }
// };
/* without use service */
// export const deleteCustomerBilling = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const userId = req.user?.id;

//     if (!userId) throw new Error("Unauthorized");

//     /* =========================
//        1️⃣ GET BILL (LOCK)
//     ========================= */
//     const [[bill]] = await connection.query(
//       `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
//       [id]
//     );

//     if (!bill) throw new Error("Invoice not found");

//     /* =========================
//        2️⃣ GET PRODUCTS
//     ========================= */
//     const [products] = await connection.query(
//       `SELECT * FROM customerBillingProducts WHERE billing_id=?`,
//       [id]
//     );

//     if (products.length === 0) {
//       throw new Error("No products found for this invoice");
//     }

//     /* =========================
//        3️⃣ RESTORE STOCK + LEDGER
//     ========================= */
//     for (const item of products) {
//       const [[p]] = await connection.query(
//         `SELECT stock FROM products WHERE id=? FOR UPDATE`,
//         [item.product_id]
//       );

//       const newStock = p.stock + item.quantity;

//       /* 🔥 stock update */
//       await connection.query(
//         `UPDATE products SET stock=? WHERE id=?`,
//         [newStock, item.product_id]
//       );

//       /* 🔥 IMPORTANT: ledger entry */
//       await connection.query(
//         `INSERT INTO billing_stock_inventory_ledger
//         (product_id, change_qty, balance_after, reference_type, reference_id, remarks, created_by)
//         VALUES (?, ?, ?, 'DELETE_REVERT', ?, ?, ?)`,
//         [item.product_id, item.quantity, newStock, id, "Deleted invoice", userId]
//       );
//     }

//     /* =========================
//        4️⃣ AUDIT BEFORE DELETE
//     ========================= */
//     await connection.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, changed_by, remarks)
//       VALUES (?, ?, ?, ?, ?, ?)`,
//       [
//         "customerBilling",
//         id,
//         "DELETE",
//         JSON.stringify({
//           invoice: bill,
//           products,
//         }),
//         userId,
//         "Invoice hard deleted",
//       ]
//     );

//     /* =========================
//        5️⃣ DELETE CHILD FIRST
//     ========================= */
//     await connection.query(
//       `DELETE FROM customerBillingProducts WHERE billing_id=?`,
//       [id]
//     );

//     /* =========================
//        6️⃣ DELETE PARENT
//     ========================= */
//     await connection.query(
//       `DELETE FROM customerBilling WHERE id=?`,
//       [id]
//     );

//     await connection.commit();

//     res.json({
//       message: "Invoice hard deleted successfully",
//       deleted_invoice_id: id,
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error("Delete Billing Error:", err);
//     res.status(400).json({ message: err.message });
//   } finally {
//     connection.release();
//   }
// };

export const deleteCustomerBilling = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    /* =========================
       1️⃣ GET BILL (LOCK)
    ========================= */
    const [[bill]] = await connection.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!bill) throw new Error("Invoice not found");

    /* 🔴 BUSINESS RULE */
    if (bill.payment_status === "PAID") {
      throw new Error("Cannot delete paid invoice");
    }

    /* =========================
       2️⃣ GET PRODUCTS
    ========================= */
    const [products] = await connection.query(
      `SELECT * FROM customerBillingProducts WHERE billing_id=?`,
      [id],
    );

    if (products.length === 0) {
      throw new Error("No products found for this invoice");
    }

    /* =========================
       3️⃣ RESTORE STOCK (SAFE)
    ========================= */
    for (const item of products) {
      await applyStockChange({
        conn: connection,
        product_id: item.product_id,
        qty_change: Number(item.quantity),
        reference_type: "DELETE_REVERT",
        reference_id: id,
        remarks: remarks || "Deleted invoice",
        userId,
      });
    }

    /* =========================
       4️⃣ AUDIT BEFORE DELETE
    ========================= */
    await AuditLog({
      connection: connection,
      table: "customerBilling",
      recordId: id,
      action: "DELETE",
      oldData: {
        invoice: bill,
        products,
      },
      userId: userId,
      remarks: remarks || "Invoice hard deleted",
    });

    /* =========================
       5️⃣ DELETE CHILD
    ========================= */
    await connection.query(
      `DELETE FROM customerBillingProducts WHERE billing_id=?`,
      [id],
    );

    /* =========================
       6️⃣ DELETE PARENT
    ========================= */
    await connection.query(`DELETE FROM customerBilling WHERE id=?`, [id]);

    await connection.commit();

    /* =========================
       7️⃣ RESPONSE (USEFUL)
    ========================= */
    res.json({
      message: "Invoice hard deleted successfully",
      data: {
        deleted_invoice: bill,
        deleted_products: products,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error("Delete Billing Error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
};
