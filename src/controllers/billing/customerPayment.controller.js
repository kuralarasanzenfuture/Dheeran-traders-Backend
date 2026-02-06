import db from "../../config/db.js";

/* ➕ ADD PAYMENT */
export const addCustomerPayment = async (req, res) => {
  try {
    const {
      billing_id,
      payment_date,
      cash_amount,
      upi_amount,
      reference_no,
      remarks,
    } = req.body;

    if (!billing_id || !payment_date) {
      return res
        .status(400)
        .json({ message: "billing_id and payment_date required" });
    }

    const cash = Number(cash_amount) || 0;
    const upi = Number(upi_amount) || 0;

    const totalPaid = cash + upi;

    if (totalPaid <= 0) {
      return res
        .status(400)
        .json({ message: "Payment amount must be greater than 0" });
    }

    /* Check invoice */
    const [bill] = await db.query(
      "SELECT balance_due FROM customerBilling WHERE id = ?",
      [billing_id],
    );

    if (!bill.length) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (totalPaid > bill[0].balance_due) {
      return res.status(400).json({ message: "Payment exceeds balance" });
    }

    /* Insert payment */
    await db.query(
      `INSERT INTO customerBillingPayment
       (billing_id, payment_date, cash_amount, upi_amount, reference_no, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [billing_id, payment_date, cash, upi, reference_no, remarks],
    );

    /* Update balance */
    await db.query(
      `UPDATE customerBilling
       SET balance_due = balance_due - ?
       WHERE id = ?`,
      [totalPaid, billing_id],
    );

    res.status(201).json({ message: "Payment added successfully" });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 📜 GET PAYMENT HISTORY BY BILL */
export const getPaymentsByBillingId = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [rows] = await db.query(
      `SELECT id, payment_date, cash_amount, upi_amount, reference_no, remarks, created_at
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
        IFNULL(SUM(cp.cash_amount + cp.upi_amount),0) AS total_paid
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
