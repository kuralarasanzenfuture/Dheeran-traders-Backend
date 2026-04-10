import db from "../../../config/db.js";

export const getPaymentById = async (req, res) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) throw new Error("payment_id required");

    // 🔹 PAYMENT INFO
    const [payments] = await db.query(
      `SELECT 
        p.*,
        c.name AS customer_name
      FROM chit_collections_payments p
      LEFT JOIN chit_customers c 
        ON c.id = p.customer_id
      WHERE p.id = ?`,
      [payment_id]
    );

    if (!payments.length) {
      throw new Error("Payment not found");
    }

    const payment = payments[0];

    // 🔥 CORRECT INSTALLMENT DATA
    const [allocations] = await db.query(
      `SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.installment_amount,

        -- paid in this payment
        a.allocated_amount AS paid_now,

        -- total paid so far
        COALESCE(SUM(a2.allocated_amount), 0) AS total_paid,

        -- pending
        (i.installment_amount - COALESCE(SUM(a2.allocated_amount), 0)) AS pending_amount,

        -- status
        CASE 
          WHEN SUM(a2.allocated_amount) >= i.installment_amount THEN 'PAID'
          WHEN SUM(a2.allocated_amount) > 0 THEN 'PARTIAL'
          ELSE 'PENDING'
        END AS status

      FROM chit_payment_allocations a

      JOIN chit_customer_installments i 
        ON i.id = a.installment_id

      LEFT JOIN chit_payment_allocations a2 
        ON a2.installment_id = i.id

      WHERE a.payment_id = ?

      GROUP BY i.id, a.allocated_amount`,
      [payment_id]
    );

    return res.json({
      success: true,
      data: {
        payment,
        installments: allocations,
      },
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    // 🔹 1. GET ALL PAYMENTS
    const [payments] = await db.query(
      `SELECT 
        p.id,
        p.customer_id,
        c.name AS customer_name,
        p.subscription_id,
        p.payment_type,
        p.total_amount,
        p.pay_cash,
        p.pay_upi,
        p.pay_cheque,
        p.payment_datetime
      FROM chit_collections_payments p
      LEFT JOIN chit_customers c 
        ON c.id = p.customer_id
      ORDER BY p.id DESC`
    );

    if (!payments.length) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const paymentIds = payments.map(p => p.id);

    // 🔹 2. GET ALL INSTALLMENT ALLOCATIONS
    const [rows] = await db.query(
      `SELECT 
        a.payment_id,
        i.installment_number,
        i.installment_amount,
        a.allocated_amount AS paid_now
      FROM chit_payment_allocations a
      JOIN chit_customer_installments i 
        ON i.id = a.installment_id
      WHERE a.payment_id IN (?)`,
      [paymentIds]
    );

    // 🔹 3. MAP INSTALLMENTS
    const map = {};

    for (let row of rows) {
      if (!map[row.payment_id]) {
        map[row.payment_id] = [];
      }

      map[row.payment_id].push({
        installment_number: row.installment_number,
        installment_amount: row.installment_amount,
        paid_now: row.paid_now,
      });
    }

    // 🔹 4. ATTACH TO PAYMENTS
    for (let payment of payments) {
      payment.installments = map[payment.id] || [];
    }

    return res.json({
      success: true,
      data: payments,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getPaymentWithInstallments = async (req, res) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) throw new Error("payment_id required");

    // 🔹 PAYMENT INFO
    const [paymentRows] = await db.query(
      `SELECT p.*, c.name AS customer_name
       FROM chit_collections_payments p
       LEFT JOIN chit_customers c ON c.id = p.customer_id
       WHERE p.id = ?`,
      [payment_id]
    );

    if (!paymentRows.length) {
      throw new Error("Payment not found");
    }

    const payment = paymentRows[0];

    // 🔥 INSTALLMENT DETAILS (IMPORTANT QUERY)
    const [installments] = await db.query(
      `SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.installment_amount,

        -- amount paid in THIS payment
        COALESCE(a.allocated_amount, 0) AS paid_in_this_payment,

        -- total paid across ALL payments
        COALESCE(SUM(a2.allocated_amount), 0) AS total_paid,

        -- remaining balance
        (i.installment_amount - COALESCE(SUM(a2.allocated_amount), 0)) AS pending_amount,

        -- status
        CASE 
          WHEN SUM(a2.allocated_amount) >= i.installment_amount THEN 'PAID'
          WHEN SUM(a2.allocated_amount) > 0 THEN 'PARTIAL'
          ELSE 'PENDING'
        END AS status

      FROM chit_payment_allocations a

      JOIN chit_customer_installments i 
        ON i.id = a.installment_id

      LEFT JOIN chit_payment_allocations a2 
        ON a2.installment_id = i.id

      WHERE a.payment_id = ?

      GROUP BY i.id`,
      [payment_id]
    );

    return res.json({
      success: true,
      data: {
        payment,
        installments,
      },
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
