import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

/* ➕ ADD PAYMENT */

// export const addCustomerPayment = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const {
//       billing_id,
//       payment_date,
//       cash_amount,
//       upi_amount,
//       cheque_amount,
//       reference_no,
//       remarks,
//     } = req.body;

//     if (!billing_id || !payment_date) {
//       return res
//         .status(400)
//         .json({ message: "billing_id and payment_date required" });
//     }

//     const cash = Number(cash_amount) || 0;
//     const upi = Number(upi_amount) || 0;
//     const cheque = Number(cheque_amount) || 0;

//     const totalPaid = cash + upi + cheque;

//     if (totalPaid <= 0) {
//       return res
//         .status(400)
//         .json({ message: "Payment amount must be greater than 0" });
//     }

//     await conn.beginTransaction();

//     // 🔐 Lock invoice row (prevents double payments)
//     const [bill] = await conn.query(
//       "SELECT balance_due FROM customerBilling WHERE id = ? FOR UPDATE",
//       [billing_id]
//     );

//     if (!bill.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     if (totalPaid > bill[0].balance_due) {
//       await conn.rollback();
//       return res.status(400).json({ message: "Payment exceeds balance" });
//     }

//     // ✅ Insert payment (NO total_amount needed)
//     await conn.query(
//       `INSERT INTO customerBillingPayment
//        (billing_id, payment_date, cash_amount, upi_amount, cheque_amount, reference_no, remarks)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [billing_id, payment_date, cash, upi, cheque, reference_no, remarks]
//     );

//     // ✅ Update balance
//     await conn.query(
//       `UPDATE customerBilling
//        SET balance_due = balance_due - ?
//        WHERE id = ?`,
//       [totalPaid, billing_id]
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Payment added successfully",
//     });

//   } catch (err) {
//     await conn.rollback();
//     console.error("Payment error:", err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

/* 📜 GET PAYMENT HISTORY BY BILL */
export const getPaymentsByBillingId = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [rows] = await db.query(
      `SELECT id, payment_date, cash_amount, upi_amount, cheque_amount, total_amount, reference_no, remarks, created_at
       FROM customerBillingPayment
       WHERE billing_id = ?
       ORDER BY payment_date`,
      [billing_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 📊 GET INVOICE WITH PAYMENT SUMMARY */
export const getInvoiceWithPayments = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        cb.invoice_number,
        cb.customer_name,
        cb.phone_number,
        cb.grand_total,
        cb.balance_due,
        IFNULL(SUM(cp.cash_amount + cp.upi_amount + cp.cheque_amount),0) AS total_paid
      FROM customerBilling cb
      LEFT JOIN customerBillingPayment cp ON cb.id = cp.billing_id
      WHERE cb.id = ?
      GROUP BY cb.id`,
      [billing_id],
    );

    if (!rows.length)
      return res.status(404).json({ message: "Invoice not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📊 GET ALL PAYMENTS (For Daily Sales Report)
export const getAllPayments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM customerBillingPayment
       ORDER BY payment_date`,
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------hard delete-------------------------------------- */

export const addCustomerPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const {
      billing_id,
      payment_date,
      cash_amount,
      upi_amount,
      cheque_amount,
      reference_no,
      remarks,
    } = req.body;

    if (!billing_id || !payment_date) {
      throw new Error("billing_id and payment_date required");
    }

    const cash = Number(cash_amount) || 0;
    const upi = Number(upi_amount) || 0;
    const cheque = Number(cheque_amount) || 0;

    const totalPaid = Number((cash + upi + cheque).toFixed(2));

    if (totalPaid <= 0) {
      throw new Error("Payment must be > 0");
    }

    /* =========================
       1️⃣ LOCK BILL
    ========================= */
    const [[bill]] = await conn.query(
      `SELECT id, balance_due, payment_status 
       FROM customerBilling 
       WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    if (!bill) throw new Error("Invoice not found");

    const oldBalance = Number(bill.balance_due);

    if (totalPaid > oldBalance) {
      throw new Error("Payment exceeds balance");
    }

    /* =========================
       2️⃣ INSERT PAYMENT
    ========================= */
    const [paymentResult] = await conn.query(
      `INSERT INTO customerBillingPayment
      (billing_id, payment_date, cash_amount, upi_amount, cheque_amount, reference_no, remarks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billing_id,
        payment_date,
        cash,
        upi,
        cheque,
        reference_no,
        remarks,
        userId,
      ]
    );

    const payment_id = paymentResult.insertId;

    /* =========================
       3️⃣ UPDATE BILL
    ========================= */
    const newBalance = Number((oldBalance - totalPaid).toFixed(2));

    let paymentStatus = "PARTIAL";

    if (newBalance === 0) paymentStatus = "PAID";
    else if (newBalance === oldBalance) paymentStatus = "UNPAID";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, payment_status=?, updated_by=?
       WHERE id=?`,
      [newBalance, paymentStatus, userId, billing_id]
    );

    /* =========================
       4️⃣ AUDIT LOG
    ========================= */
    await AuditLog({
      connection: conn,
      table: "customerBillingPayment",
      recordId: payment_id,
      action: "INSERT",
      oldData: null,
      newData: {
        billing_id,
        payment_date,
        totalPaid,
        cash,
        upi,
        cheque,
        reference_no,
      },
      userId,
      remarks: remarks || "Payment added",
    });

    await AuditLog({
      connection: conn,
      table: "customerBilling",
      recordId: billing_id,
      action: "UPDATE",
      oldData: {
        balance_due: oldBalance,
        payment_status: bill.payment_status,
      },
      newData: {
        balance_due: newBalance,
        payment_status: paymentStatus,
      },
      userId,
      remarks: "Payment applied to invoice",
    });

    await conn.commit();

    /* =========================
       5️⃣ RESPONSE
    ========================= */
    res.status(201).json({
      message: "Payment added successfully",
      data: {
        payment_id,
        billing_id,
        paid_amount: totalPaid,
        balance_before: oldBalance,
        balance_after: newBalance,
        payment_status: paymentStatus,
      },
    });

  } catch (err) {
    await conn.rollback();
    console.error("Payment error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const updateCustomerPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    const {
      payment_date,
      cash_amount,
      upi_amount,
      cheque_amount,
      reference_no,
      remarks,
    } = req.body;

    /* =========================
       1️⃣ GET OLD PAYMENT
    ========================= */
    const [[oldPayment]] = await conn.query(
      `SELECT * FROM customerBillingPayment WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!oldPayment) throw new Error("Payment not found");

    const billing_id = oldPayment.billing_id;

    const oldTotal =
      Number(oldPayment.cash_amount) +
      Number(oldPayment.upi_amount) +
      Number(oldPayment.cheque_amount);

    /* =========================
       2️⃣ LOCK BILL
    ========================= */
    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    if (!bill) throw new Error("Invoice not found");

    let currentBalance = Number(bill.balance_due);

    /* =========================
       3️⃣ REVERSE OLD PAYMENT
    ========================= */
    currentBalance = Number((currentBalance + oldTotal).toFixed(2));

    /* =========================
       4️⃣ NEW PAYMENT CALC
    ========================= */
    const cash = Number(cash_amount) || 0;
    const upi = Number(upi_amount) || 0;
    const cheque = Number(cheque_amount) || 0;

    const newTotal = Number((cash + upi + cheque).toFixed(2));

    if (newTotal <= 0) throw new Error("Invalid payment");

    if (newTotal > currentBalance) {
      throw new Error("Payment exceeds balance");
    }

    const newBalance = Number((currentBalance - newTotal).toFixed(2));

    /* =========================
       5️⃣ UPDATE PAYMENT
    ========================= */
    await conn.query(
      `UPDATE customerBillingPayment SET
        payment_date=?,
        cash_amount=?,
        upi_amount=?,
        cheque_amount=?,
        reference_no=?,
        remarks=?,
        updated_by=?
      WHERE id=?`,
      [
        payment_date,
        cash,
        upi,
        cheque,
        reference_no,
        remarks,
        userId,
        id,
      ]
    );

    /* =========================
       6️⃣ UPDATE BILL
    ========================= */
    let status = "PARTIAL";
    if (newBalance === 0) status = "PAID";
    if (newBalance === bill.grand_total) status = "UNPAID";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, payment_status=?, updated_by=?
       WHERE id=?`,
      [newBalance, status, userId, billing_id]
    );

    /* =========================
       7️⃣ AUDIT
    ========================= */
    await AuditLog({
      connection: conn,
      table: "customerBillingPayment",
      recordId: id,
      action: "UPDATE",
      oldData: oldPayment,
      newData: {
        payment_date,
        cash,
        upi,
        cheque,
      },
      userId,
      remarks: remarks || "Payment updated",
    });

    await conn.commit();

    res.json({
      message: "Payment updated successfully",
      data: {
        payment_id: id,
        old_total: oldTotal,
        new_total: newTotal,
        balance_after: newBalance,
      },
    });

  } catch (err) {
    await conn.rollback();
    console.error("Update Payment Error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteCustomerPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new Error("Unauthorized");

    /* =========================
       1️⃣ GET PAYMENT
    ========================= */
    const [[payment]] = await conn.query(
      `SELECT * FROM customerBillingPayment WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!payment) throw new Error("Payment not found");

    const billing_id = payment.billing_id;

    const total =
      Number(payment.cash_amount) +
      Number(payment.upi_amount) +
      Number(payment.cheque_amount);

    /* =========================
       2️⃣ LOCK BILL
    ========================= */
    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    if (!bill) throw new Error("Invoice not found");

    let newBalance = Number((Number(bill.balance_due) + total).toFixed(2));

    /* =========================
       3️⃣ UPDATE BILL
    ========================= */
    let status = "PARTIAL";
    if (newBalance === bill.grand_total) status = "UNPAID";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, payment_status=?, updated_by=?
       WHERE id=?`,
      [newBalance, status, userId, billing_id]
    );

    /* =========================
       4️⃣ AUDIT BEFORE DELETE
    ========================= */
    await AuditLog({
      connection: conn,
      table: "customerBillingPayment",
      recordId: id,
      action: "DELETE",
      oldData: payment,
      userId,
      remarks: "Payment deleted",
    });

    /* =========================
       5️⃣ DELETE PAYMENT
    ========================= */
    await conn.query(
      `DELETE FROM customerBillingPayment WHERE id=?`,
      [id]
    );

    await conn.commit();

    res.json({
      message: "Payment deleted successfully",
      data: {
        payment_id: id,
        restored_amount: total,
        balance_after: newBalance,
      },
    });

  } catch (err) {
    await conn.rollback();
    console.error("Delete Payment Error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
