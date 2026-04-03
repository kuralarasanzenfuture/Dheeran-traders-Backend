import db from "../../config/db.js";

// POST: collect payment pay only what is due only
// export const collectPayment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       installment_id,

//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,

//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* 1️⃣ VALIDATION */

//     if (!installment_id) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "installment_id is required",
//       });
//     }

//     if (!collected_by) {
//       await connection.rollback();
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: collector not found",
//       });
//     }

//     /* 2️⃣ FETCH INSTALLMENT WITH RELATIONS */

//     const [inst] = await connection.query(
//       `SELECT
//           i.*,
//           s.id AS subscription_id,
//           s.customer_id
//        FROM chit_customer_installments i
//        JOIN chit_customer_subscriptions s
//          ON i.subscription_id = s.id
//        WHERE i.id = ?
//        FOR UPDATE`,
//       [installment_id]
//     );

//     if (inst.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Invalid installment_id",
//       });
//     }

//     const installment = inst[0];

//     // 🔥 auto-derived (NO TRUST FROM CLIENT)
//     const subscription_id = installment.subscription_id;
//     const customer_id = installment.customer_id;

//     /* 3️⃣ PAYMENT VALIDATION */

//     const total_amount =
//       Number(pay_upi) + Number(pay_cheque) + Number(pay_cash);

//     if (total_amount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "At least one payment method required",
//       });
//     }

//     /* 4️⃣ OVERPAYMENT CHECK */

//     const pendingAmount =
//       Number(installment.installment_amount) -
//       Number(installment.paid_amount);

//     if (pendingAmount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Installment already fully paid",
//       });
//     }

//     if (total_amount > pendingAmount) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: `Payment exceeds pending amount (${pendingAmount})`,
//       });
//     }

//     /* 5️⃣ UPDATE INSTALLMENT */

//     const newPaidAmount =
//       Number(installment.paid_amount) + total_amount;

//     const status =
//       newPaidAmount >= installment.installment_amount
//         ? "PAID"
//         : "PARTIAL";

//     await connection.query(
//       `UPDATE chit_customer_installments
//        SET paid_amount=?, status=?
//        WHERE id=?`,
//       [newPaidAmount, status, installment_id]
//     );

//     /* 6️⃣ INSERT PAYMENT */

//     await connection.query(
//       `INSERT INTO chit_collections_payments
//       (
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks
//       )
//       VALUES (?,?,?,?,?,?,?,?,?,?)`,
//       [
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference || null,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks || null,
//       ]
//     );

//     await connection.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Payment collected successfully",
//       data: {
//         installment_id,
//         subscription_id,
//         customer_id,
//         paid: total_amount,
//         status,
//       },
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// valid upi reference
// export const collectPayment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       installment_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* 1️⃣ BASIC VALIDATION */

//     if (!installment_id) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "installment_id is required",
//       });
//     }

//     if (!collected_by) {
//       await connection.rollback();
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: collector not found",
//       });
//     }

//     /* 2️⃣ FETCH INSTALLMENT */

//     const [inst] = await connection.query(
//       `SELECT
//           i.*,
//           s.id AS subscription_id,
//           s.customer_id
//        FROM chit_customer_installments i
//        JOIN chit_customer_subscriptions s
//          ON i.subscription_id = s.id
//        WHERE i.id = ?
//        FOR UPDATE`,
//       [installment_id]
//     );

//     if (inst.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Invalid installment_id",
//       });
//     }

//     const installment = inst[0];
//     const { subscription_id, customer_id } = installment;

//     /* 3️⃣ BLOCK IF ALREADY PAID */

//     if (installment.status === "PAID") {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "This installment is already fully paid",
//       });
//     }

//     /* 4️⃣ SANITIZE INPUT */

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     if (upi < 0 || cheque < 0 || cash < 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Payment amounts cannot be negative",
//       });
//     }

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "At least one payment method required",
//       });
//     }

//     /* 5️⃣ UPI VALIDATION */

//     if (upi > 0) {
//       if (!pay_upi_reference) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "UPI reference is required when UPI is used",
//         });
//       }

//       const [dup] = await connection.query(
//         `SELECT id FROM chit_collections_payments
//          WHERE pay_upi_reference = ? LIMIT 1`,
//         [pay_upi_reference]
//       );

//       if (dup.length > 0) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "Duplicate UPI reference detected",
//         });
//       }
//     }

//     /* 6️⃣ PENDING CHECK */

//     const pendingAmount =
//       Number(installment.installment_amount) -
//       Number(installment.paid_amount);

//     if (pendingAmount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Installment already fully paid",
//       });
//     }

//     if (total_amount > pendingAmount) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: `Payment exceeds pending amount (${pendingAmount})`,
//       });
//     }

//     /* 7️⃣ UPDATE INSTALLMENT */

//     const newPaidAmount =
//       Number(installment.paid_amount) + total_amount;

//     let status = "PENDING";

//     if (newPaidAmount === 0) {
//       status = "PENDING";
//     } else if (newPaidAmount < installment.installment_amount) {
//       status = "PARTIAL";
//     } else {
//       status = "PAID";
//     }

//     await connection.query(
//       `UPDATE chit_customer_installments
//        SET paid_amount=?, status=?
//        WHERE id=?`,
//       [newPaidAmount, status, installment_id]
//     );

//     /* 8️⃣ INSERT PAYMENT */

//     await connection.query(
//       `INSERT INTO chit_collections_payments
//       (
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks
//       )
//       VALUES (?,?,?,?,?,?,?,?,?,?)`,
//       [
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//       ]
//     );

//     await connection.commit();

//     const progress =
//       (newPaidAmount / installment.installment_amount) * 100;

//     return res.status(200).json({
//       success: true,
//       message: "Payment collected successfully",
//       data: {
//         installment_id,
//         subscription_id,
//         customer_id,
//         paid_now: total_amount,
//         total_paid: newPaidAmount,
//         pending: pendingAmount - total_amount,
//         status,
//         progress: Math.round(progress),
//       },
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error(error);

//     // 🔥 HANDLE DB UNIQUE ERROR
//     if (error.code === "ER_DUP_ENTRY") {
//       return res.status(400).json({
//         success: false,
//         message: "UPI reference must be unique",
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// export const collectPayment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       installment_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* 1️⃣ BASIC VALIDATION */

//     if (!installment_id) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "installment_id is required",
//       });
//     }

//     if (!collected_by) {
//       await connection.rollback();
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: collector not found",
//       });
//     }

//     /* 2️⃣ FETCH BASE INSTALLMENT */

//     const [base] = await connection.query(
//       `SELECT
//           i.*,
//           s.id AS subscription_id,
//           s.customer_id
//        FROM chit_customer_installments i
//        JOIN chit_customer_subscriptions s
//          ON i.subscription_id = s.id
//        WHERE i.id = ?
//        FOR UPDATE`,
//       [installment_id]
//     );

//     if (base.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Invalid installment_id",
//       });
//     }

//     const { subscription_id, customer_id } = base[0];

//     /* 3️⃣ FULL SUBSCRIPTION CHECK (CRITICAL) */

//     const [summary] = await connection.query(
//       `SELECT
//           SUM(installment_amount) AS total_amount,
//           SUM(paid_amount) AS total_paid
//        FROM chit_customer_installments
//        WHERE subscription_id = ?`,
//       [subscription_id]
//     );

//     const totalAmount = Number(summary[0].total_amount || 0);
//     const totalPaid = Number(summary[0].total_paid || 0);

//     if (totalPaid >= totalAmount) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Full due already completed. No further payment allowed.",
//       });
//     }

//     /* 4️⃣ SANITIZE INPUT */

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     if (upi < 0 || cheque < 0 || cash < 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Payment amounts cannot be negative",
//       });
//     }

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "At least one payment method required",
//       });
//     }

//     /* 5️⃣ UPI VALIDATION */

//     if (upi > 0) {
//       if (!pay_upi_reference) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "UPI reference is required when UPI is used",
//         });
//       }

//       const [dup] = await connection.query(
//         `SELECT id FROM chit_collections_payments
//          WHERE pay_upi_reference = ? LIMIT 1`,
//         [pay_upi_reference]
//       );

//       if (dup.length > 0) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "Duplicate UPI reference detected",
//         });
//       }
//     }

//     /* 6️⃣ FETCH ONLY TRUE PENDING INSTALLMENTS */

//     const [installments] = await connection.query(
//       `SELECT * FROM chit_customer_installments
//        WHERE subscription_id = ?
//        AND (installment_amount - paid_amount) > 0
//        ORDER BY id ASC
//        FOR UPDATE`,
//       [subscription_id]
//     );

//     if (installments.length === 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "No pending installments found",
//       });
//     }

//     /* 7️⃣ APPLY PAYMENT (CARRY FORWARD) */

//     let remainingAmount = total_amount;
//     let updatedInstallments = [];

//     for (const inst of installments) {
//       if (remainingAmount <= 0) break;

//       const pending =
//         Number(inst.installment_amount) - Number(inst.paid_amount);

//       if (pending <= 0) continue;

//       const payAmount = Math.min(remainingAmount, pending);
//       const newPaid = Number(inst.paid_amount) + payAmount;

//       let status = "PARTIAL";
//       if (newPaid === inst.installment_amount) {
//         status = "PAID";
//       }

//       await connection.query(
//         `UPDATE chit_customer_installments
//          SET paid_amount=?, status=?
//          WHERE id=?`,
//         [newPaid, status, inst.id]
//       );

//       updatedInstallments.push({
//         installment_id: inst.id,
//         paid: payAmount,
//         status,
//       });

//       remainingAmount -= payAmount;
//     }

//     /* 8️⃣ INSERT PAYMENT */

//     await connection.query(
//       `INSERT INTO chit_collections_payments
//       (
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks
//       )
//       VALUES (?,?,?,?,?,?,?,?,?,?)`,
//       [
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//       ]
//     );

//     await connection.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Payment distributed successfully",
//       data: {
//         total_paid: total_amount,
//         remaining_unused: remainingAmount,
//         distribution: updatedInstallments,
//       },
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error(error);

//     if (error.code === "ER_DUP_ENTRY") {
//       return res.status(400).json({
//         success: false,
//         message: "UPI reference must be unique",
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// export const collectPayment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       subscription_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* 1️⃣ BASIC VALIDATION */

//     if (!subscription_id) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "subscription_id is required",
//       });
//     }

//     if (!collected_by) {
//       await connection.rollback();
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     /* 2️⃣ GET CUSTOMER */

//     const [sub] = await connection.query(
//       `SELECT customer_id
//        FROM chit_customer_subscriptions
//        WHERE id = ?
//        FOR UPDATE`,
//       [subscription_id],
//     );

//     if (sub.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Invalid subscription_id",
//       });
//     }

//     const customer_id = sub[0].customer_id;

//     /* 3️⃣ FULL PAYMENT CHECK */

//     const [summary] = await connection.query(
//       `SELECT
//         SUM(installment_amount) AS total_amount,
//         SUM(paid_amount) AS total_paid
//        FROM chit_customer_installments
//        WHERE subscription_id = ?`,
//       [subscription_id],
//     );

//     const totalAmount = Number(summary[0].total_amount || 0);
//     const totalPaid = Number(summary[0].total_paid || 0);

//     if (totalPaid >= totalAmount) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Full due already completed",
//       });
//     }

//     /* 4️⃣ SANITIZE */

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     if (upi < 0 || cheque < 0 || cash < 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment values",
//       });
//     }

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Enter payment amount",
//       });
//     }

//     /* 5️⃣ UPI VALIDATION */

//     if (upi > 0) {
//       if (!pay_upi_reference) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "UPI reference required",
//         });
//       }

//       const [dup] = await connection.query(
//         `SELECT id FROM chit_collections_payments
//          WHERE pay_upi_reference = ? LIMIT 1`,
//         [pay_upi_reference],
//       );

//       if (dup.length > 0) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "Duplicate UPI reference",
//         });
//       }
//     }

//     /* 6️⃣ GET PENDING INSTALLMENTS */

//     const [installments] = await connection.query(
//       `SELECT * FROM chit_customer_installments
//        WHERE subscription_id = ?
//        AND (installment_amount - paid_amount) > 0
//        ORDER BY id ASC
//        FOR UPDATE`,
//       [subscription_id],
//     );

//     if (installments.length === 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "No pending installments",
//       });
//     }

//     /* 7️⃣ DISTRIBUTE PAYMENT */

//     let remainingAmount = total_amount;
//     let distribution = [];

//     for (const inst of installments) {
//       if (remainingAmount <= 0) break;

//       const pending =
//         Number(inst.installment_amount) - Number(inst.paid_amount);

//       const payAmount = Math.min(remainingAmount, pending);
//       const newPaid = Number(inst.paid_amount) + payAmount;

//       const status = newPaid === inst.installment_amount ? "PAID" : "PARTIAL";

//       await connection.query(
//         `UPDATE chit_customer_installments
//          SET paid_amount=?, status=?
//          WHERE id=?`,
//         [newPaid, status, inst.id],
//       );

//       distribution.push({
//         installment_id: inst.id,
//         paid: payAmount,
//         status,
//       });

//       remainingAmount -= payAmount;
//     }

//     /* 8️⃣ INSERT PAYMENT */

//     await connection.query(
//       `INSERT INTO chit_collections_payments
//       (
//         subscription_id,
//         customer_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks
//       )
//       VALUES (?,?,?,?,?,?,?,?,?)`,
//       [
//         subscription_id,
//         customer_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//       ],
//     );

//     await connection.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Payment applied successfully",
//       data: {
//         total_paid: total_amount,
//         remaining_unused: remainingAmount,
//         distribution,
//       },
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// ----------------------------------------------------------------
export const collectPayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      subscription_id,
      installment_id,
      pay_upi = 0,
      pay_cheque = 0,
      pay_cash = 0,
      pay_upi_reference,
      remarks,
    } = req.body;

    const collected_by = req.user?.id;

    // ✅ BASIC VALIDATION
    if (!subscription_id || !installment_id) {
      throw new Error("subscription_id and installment_id required");
    }


    if (!collected_by) {
      throw new Error("Unauthorized");
    }

    const upi = Number(pay_upi) || 0;
    const cheque = Number(pay_cheque) || 0;
    const cash = Number(pay_cash) || 0;

    if (upi < 0 || cheque < 0 || cash < 0) {
      throw new Error("Invalid payment values");
    }

    const total_amount = upi + cheque + cash;

    if (total_amount <= 0) {
      throw new Error("Payment must be greater than zero");
    }

    // ✅ LOCK INSTALLMENT
    const [instRows] = await connection.query(
      `SELECT * FROM chit_customer_installments
       WHERE id = ? AND subscription_id = ?
       FOR UPDATE`,
      [installment_id, subscription_id],
    );

    if (!instRows.length) {
      throw new Error("Invalid installment");
    }

    const inst = instRows[0];

    // ✅ GET CURRENT PAID (REAL SOURCE)
    const [paidRows] = await connection.query(
      `SELECT COALESCE(SUM(allocated_amount),0) AS paid
       FROM chit_payment_allocations
       WHERE installment_id = ?`,
      [installment_id],
    );

    const alreadyPaid = Number(paidRows[0].paid);
    const pending = Number(inst.installment_amount) - alreadyPaid;

    if (pending <= 0) {
      throw new Error("Already fully paid");
    }

    if (total_amount > pending) {
      throw new Error(`Exceeds pending amount (${pending})`);
    }

    // ✅ UPI VALIDATION
    if (upi > 0 && !pay_upi_reference) {
      throw new Error("UPI reference required");
    }

    if (upi > 0) {
      const [dup] = await connection.query(
        `SELECT id FROM chit_collections_payments
         WHERE pay_upi_reference = ? LIMIT 1`,
        [pay_upi_reference],
      );

      if (dup.length) {
        throw new Error("Duplicate UPI reference");
      }
    }

    // ✅ GET CUSTOMER FROM SUBSCRIPTION
const [subRows] = await connection.query(
  `SELECT customer_id 
   FROM chit_customer_subscriptions
   WHERE id = ?
   FOR UPDATE`,
  [subscription_id]
);

if (!subRows.length) {
  throw new Error("Invalid subscription");
}

const customer_id = subRows[0].customer_id;


    // ✅ INSERT PAYMENT
    const [paymentResult] = await connection.query(
      `INSERT INTO chit_collections_payments
      (subscription_id, customer_id, collected_by,
       pay_upi, pay_upi_reference, pay_cheque, pay_cash,
       total_amount, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscription_id,
        // req.user.customer_id || null, // adjust if needed
        customer_id,
        collected_by,
        upi,
        pay_upi_reference || null,
        cheque,
        cash,
        total_amount,
        remarks || null,
      ],
    );

    const payment_id = paymentResult.insertId;

    // ✅ ALLOCATION
    await connection.query(
      `INSERT INTO chit_payment_allocations
       (payment_id, installment_id, allocated_amount)
       VALUES (?, ?, ?)`,
      [payment_id, installment_id, total_amount],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Payment successful",
      data: {
        payment_id,
        installment_id,
        paid_now: total_amount,
        total_paid: alreadyPaid + total_amount,
        pending: pending - total_amount,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(400).json({
      success: false,
      message: err.message || "Payment failed",
    });
  } finally {
    connection.release();
  }
};
// business supports wallet/advance payments.
// export const collectPaymentAutoAllocate = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       subscription_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     if (!subscription_id) throw new Error("subscription_id required");
//     if (!collected_by) throw new Error("Unauthorized");

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) throw new Error("Invalid payment");

//     // ✅ UPI validation
//     if (upi > 0 && !pay_upi_reference) {
//       throw new Error("UPI reference required");
//     }

//     // ✅ LOCK INSTALLMENTS (important)
//     const [installments] = await connection.query(
//       `SELECT i.*
//        FROM chit_customer_installments i
//        WHERE i.subscription_id = ?
//        ORDER BY i.installment_number
//        FOR UPDATE`,
//       [subscription_id],
//     );

//     if (!installments.length) {
//       throw new Error("No installments found");
//     }

//     // ✅ Get already paid per installment
//     const [paidMapRows] = await connection.query(
//       `SELECT installment_id, SUM(allocated_amount) AS paid
//        FROM chit_payment_allocations
//        WHERE installment_id IN (?)
//        GROUP BY installment_id`,
//       [installments.map((i) => i.id)],
//     );

//     const paidMap = {};
//     paidMapRows.forEach((r) => {
//       paidMap[r.installment_id] = Number(r.paid);
//     });

//     let remaining = total_amount;
//     const allocations = [];

//     // 🔥 AUTO ALLOCATION LOOP
//     for (const inst of installments) {
//       if (remaining <= 0) break;

//       const alreadyPaid = paidMap[inst.id] || 0;
//       const pending = inst.installment_amount - alreadyPaid;

//       if (pending <= 0) continue;

//       const allocate = Math.min(pending, remaining);

//       allocations.push({
//         installment_id: inst.id,
//         amount: allocate,
//       });

//       remaining -= allocate;
//     }

//     if (allocations.length === 0) {
//       throw new Error("All installments already paid");
//     }

//     // ✅ GET CUSTOMER FROM SUBSCRIPTION
//     const [subRows] = await connection.query(
//       `SELECT customer_id 
//    FROM chit_customer_subscriptions
//    WHERE id = ?
//    FOR UPDATE`,
//       [subscription_id],
//     );

//     if (!subRows.length) {
//       throw new Error("Invalid subscription");
//     }

//     const customer_id = subRows[0].customer_id;

//     // ✅ INSERT PAYMENT
//     const [paymentResult] = await connection.query(
//       `INSERT INTO chit_collections_payments
//       (subscription_id, customer_id, collected_by,
//        pay_upi, pay_upi_reference, pay_cheque, pay_cash,
//        total_amount, remarks)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         subscription_id,
//         // req.user.customer_id || null,
//         customer_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//       ],
//     );

//     const payment_id = paymentResult.insertId;

//     // ✅ INSERT ALLOCATIONS
//     for (const item of allocations) {
//       await connection.query(
//         `INSERT INTO chit_payment_allocations
//          (payment_id, installment_id, allocated_amount)
//          VALUES (?, ?, ?)`,
//         [payment_id, item.installment_id, item.amount],
//       );
//     }

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: "Payment allocated successfully",
//       data: {
//         payment_id,
//         total_paid: total_amount,
//         allocations,
//         remaining_unallocated: remaining,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();

//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const collectPaymentAutoAllocate = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      subscription_id,
      pay_upi = 0,
      pay_cheque = 0,
      pay_cash = 0,
      pay_upi_reference,
      remarks,
    } = req.body;

    const collected_by = req.user?.id;

    if (!subscription_id) throw new Error("subscription_id required");
    if (!collected_by) throw new Error("Unauthorized");

    const upi = Number(pay_upi) || 0;
    const cheque = Number(pay_cheque) || 0;
    const cash = Number(pay_cash) || 0;

    const total_amount = upi + cheque + cash;

    if (total_amount <= 0) throw new Error("Invalid payment");

    if (upi > 0 && !pay_upi_reference) {
      throw new Error("UPI reference required");
    }

    // 🔒 Lock subscription
    const [subRows] = await connection.query(
      `SELECT customer_id, investment_amount AS total_amount 
       FROM chit_customer_subscriptions
       WHERE id = ?
       FOR UPDATE`,
      [subscription_id]
    );

    if (!subRows.length) throw new Error("Invalid subscription");

    const { customer_id, total_amount: subscription_total } = subRows[0];

    // 🔒 Get total already paid
    const [paidRows] = await connection.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_paid
       FROM chit_collections_payments
       WHERE subscription_id = ?`,
      [subscription_id]
    );

    const already_paid = Number(paidRows[0].total_paid);
    const allowed_remaining = subscription_total - already_paid;

    if (allowed_remaining <= 0) {
      throw new Error("Subscription already fully paid");
    }

    // ❌ STRICT: block overpayment
    if (total_amount > allowed_remaining) {
      throw new Error(
        `Payment exceeds remaining balance. Max allowed: ${allowed_remaining}`
      );
    }

    // 🔒 Lock installments
    const [installments] = await connection.query(
      `SELECT id, installment_amount
       FROM chit_customer_installments
       WHERE subscription_id = ?
       ORDER BY installment_number
       FOR UPDATE`,
      [subscription_id]
    );

    if (!installments.length) {
      throw new Error("No installments found");
    }

    // 🔒 Already paid per installment
    const [paidMapRows] = await connection.query(
      `SELECT installment_id, SUM(allocated_amount) AS paid
       FROM chit_payment_allocations
       WHERE installment_id IN (?)
       GROUP BY installment_id`,
      [installments.map((i) => i.id)]
    );

    const paidMap = {};
    paidMapRows.forEach((r) => {
      paidMap[r.installment_id] = Number(r.paid);
    });

    let remaining = total_amount;
    const allocations = [];

    // 🔥 AUTO ALLOCATION
    for (const inst of installments) {
      if (remaining <= 0) break;

      const alreadyPaidInst = paidMap[inst.id] || 0;
      const pending = inst.installment_amount - alreadyPaidInst;

      if (pending <= 0) continue;

      const allocate = Math.min(pending, remaining);

      allocations.push({
        installment_id: inst.id,
        amount: allocate,
      });

      remaining -= allocate;
    }

    if (allocations.length === 0) {
      throw new Error("All installments already paid");
    }

    // ❌ STRICT: no leftover allowed
    if (remaining > 0) {
      throw new Error(
        `Payment exceeds pending installments. Extra: ${remaining}`
      );
    }

    // ✅ INSERT PAYMENT
    const [paymentResult] = await connection.query(
      `INSERT INTO chit_collections_payments
      (subscription_id, customer_id, collected_by,
       pay_upi, pay_upi_reference, pay_cheque, pay_cash,
       total_amount, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscription_id,
        customer_id,
        collected_by,
        upi,
        pay_upi_reference || null,
        cheque,
        cash,
        total_amount,
        remarks || null,
      ]
    );

    const payment_id = paymentResult.insertId;

    // ✅ INSERT ALLOCATIONS
    for (const item of allocations) {
      await connection.query(
        `INSERT INTO chit_payment_allocations
         (payment_id, installment_id, allocated_amount)
         VALUES (?, ?, ?)`,
        [payment_id, item.installment_id, item.amount]
      );
    }

    await connection.commit();


    const [paymentDetails] = await connection.query(
  `SELECT 
      p.id AS payment_id,
      p.subscription_id,
      p.total_amount,
      p.pay_cash,
      p.pay_upi,
      p.pay_cheque,
      p.pay_upi_reference,
      p.remarks,
      p.created_at,

      u.id AS collected_by_id,
      u.username AS collected_by_name,
      u.email AS collected_by_email,
      u.phone AS collected_by_phone

   FROM chit_collections_payments p
   LEFT JOIN users_roles u ON u.id = p.collected_by
   WHERE p.id = ?`,
  [payment_id]
);


    return res.json({
      success: true,
      message: "Payment allocated successfully",
      data: {
        payment_id,
        total_paid: total_amount,
        allocations,
        collected_by: {...paymentDetails[0]},
      },
    });

  } catch (err) {
    await connection.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

/* =========================================================
   🔥 1. SUBSCRIPTION BASED PAYMENT (AUTO DISTRIBUTE)
   ========================================================= */
// export const collectPaymentBySubscription = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       subscription_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* VALIDATION */

//     if (!subscription_id) {
//       return res.status(400).json({
//         success: false,
//         message: "Subscription ID is required",
//       });
//     }

//     if (!collected_by) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     /* GET CUSTOMER */

//     const [sub] = await connection.query(
//       `SELECT customer_id 
//        FROM chit_customer_subscriptions 
//        WHERE id=? FOR UPDATE`,
//       [subscription_id],
//     );

//     if (!sub.length) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Invalid subscription",
//       });
//     }

//     const customer_id = sub[0].customer_id;

//     /* TOTAL CHECK */

//     const [summary] = await connection.query(
//       `SELECT 
//         SUM(installment_amount) total_amount,
//         SUM(paid_amount) total_paid
//        FROM chit_customer_installments
//        WHERE subscription_id=?`,
//       [subscription_id],
//     );

//     const totalAmount = Number(summary[0].total_amount || 0);
//     const totalPaid = Number(summary[0].total_paid || 0);

//     if (totalPaid >= totalAmount) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Full due already completed",
//       });
//     }

//     /* PAYMENT CALC */

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment amount",
//       });
//     }

//     /* UPI VALIDATION */

//     if (upi > 0) {
//       if (!pay_upi_reference) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "UPI reference required",
//         });
//       }

//       const [dup] = await connection.query(
//         `SELECT id FROM chit_collections_payments 
//          WHERE pay_upi_reference=?`,
//         [pay_upi_reference],
//       );

//       if (dup.length) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "Duplicate UPI reference",
//         });
//       }
//     }

//     /* GET PENDING INSTALLMENTS */

//     const [installments] = await connection.query(
//       `SELECT * FROM chit_customer_installments
//        WHERE subscription_id=?
//        AND (installment_amount - paid_amount) > 0
//        ORDER BY id ASC
//        FOR UPDATE`,
//       [subscription_id],
//     );

//     if (!installments.length) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "No pending installments",
//       });
//     }

//     /* INSERT MAIN PAYMENT FIRST */

//     const [paymentResult] = await connection.query(
//       `INSERT INTO chit_collections_payments
//       (subscription_id, customer_id, collected_by,
//        pay_upi, pay_upi_reference, pay_cheque, pay_cash,
//        total_amount, remarks)
//       VALUES (?,?,?,?,?,?,?,?,?)`,
//       [
//         subscription_id,
//         customer_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//       ],
//     );

//     const payment_id = paymentResult.insertId;

//     /* DISTRIBUTE + SAVE BREAKDOWN */

//     let remaining = total_amount;
//     let distribution = [];

//     for (const inst of installments) {
//       if (remaining <= 0) break;

//       const pending =
//         Number(inst.installment_amount) - Number(inst.paid_amount);

//       const payAmount = Math.min(remaining, pending);
//       const newPaid = Number(inst.paid_amount) + payAmount;

//       const status = newPaid === inst.installment_amount ? "PAID" : "PARTIAL";

//       /* UPDATE INSTALLMENT */
//       await connection.query(
//         `UPDATE chit_customer_installments
//          SET paid_amount=?, status=?
//          WHERE id=?`,
//         [newPaid, status, inst.id],
//       );

//       /* SAVE BREAKDOWN */
//       await connection.query(
//         `INSERT INTO chit_payment_breakdowns
//          (payment_id, installment_id, paid_amount)
//          VALUES (?,?,?)`,
//         [payment_id, inst.id, payAmount],
//       );

//       distribution.push({
//         installment_id: inst.id,
//         paid: payAmount,
//         status,
//       });

//       remaining -= payAmount;
//     }

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: "Payment successful",
//       data: {
//         payment_id,
//         subscription_id,
//         customer_id,
//         total_paid: total_amount,
//         remaining_unused: remaining,
//         distribution,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error(err);

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

export const collectPaymentBySubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      subscription_id,
      pay_upi = 0,
      pay_cheque = 0,
      pay_cash = 0,
      pay_upi_reference,
      remarks,
    } = req.body;

    const collected_by = req.user?.id;

    if (!subscription_id) throw new Error("Subscription ID required");
    if (!collected_by) throw new Error("Unauthorized");

    /* GET CUSTOMER */
    const [sub] = await connection.query(
      `SELECT customer_id 
       FROM chit_customer_subscriptions 
       WHERE id=? FOR UPDATE`,
      [subscription_id]
    );

    if (!sub.length) throw new Error("Invalid subscription");

    const customer_id = sub[0].customer_id;

    /* PAYMENT CALC */
    const upi = Number(pay_upi) || 0;
    const cheque = Number(pay_cheque) || 0;
    const cash = Number(pay_cash) || 0;
    const total_amount = upi + cheque + cash;

    if (total_amount <= 0) throw new Error("Invalid payment");

    /* UPI CHECK */
    if (upi > 0) {
      if (!pay_upi_reference) throw new Error("UPI ref required");

      const [dup] = await connection.query(
        `SELECT id FROM chit_collections_payments 
         WHERE pay_upi_reference=? LIMIT 1`,
        [pay_upi_reference]
      );

      if (dup.length) throw new Error("Duplicate UPI ref");
    }

    /* GET INSTALLMENTS WITH REAL PENDING */
    const [installments] = await connection.query(
      `SELECT 
        i.id,
        i.installment_amount,
        COALESCE(SUM(a.allocated_amount),0) AS paid
      FROM chit_customer_installments i
      LEFT JOIN chit_payment_allocations a 
        ON i.id = a.installment_id
      WHERE i.subscription_id = ?
      GROUP BY i.id
      HAVING (i.installment_amount - paid) > 0
      ORDER BY i.installment_number ASC
      FOR UPDATE`,
      [subscription_id]
    );

    if (!installments.length) throw new Error("No pending installments");

    /* INSERT PAYMENT */
    const [paymentResult] = await connection.query(
      `INSERT INTO chit_collections_payments
      (subscription_id, customer_id, collected_by,
       pay_upi, pay_upi_reference, pay_cheque, pay_cash,
       total_amount, remarks)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        subscription_id,
        customer_id,
        collected_by,
        upi,
        pay_upi_reference || null,
        cheque,
        cash,
        total_amount,
        remarks || null,
      ]
    );

    const payment_id = paymentResult.insertId;

    /* DISTRIBUTE USING ALLOCATION TABLE */
    let remaining = total_amount;
    let distribution = [];

    for (const inst of installments) {
      if (remaining <= 0) break;

      const pending = inst.installment_amount - inst.paid;
      const allocate = Math.min(remaining, pending);

      await connection.query(
        `INSERT INTO chit_payment_allocations
         (payment_id, installment_id, allocated_amount)
         VALUES (?,?,?)`,
        [payment_id, inst.id, allocate]
      );

      distribution.push({
        installment_id: inst.id,
        allocated: allocate,
        pending_after: pending - allocate,
      });

      remaining -= allocate;
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Payment successful",
      data: {
        payment_id,
        total_paid: total_amount,
        remaining_unused: remaining,
        distribution,
      },
    });

  } catch (err) {
    await connection.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};


/* =========================================================
   🔧 2. INSTALLMENT BASED PAYMENT (STRICT) 
   ========================================================= */
export const collectPaymentByInstallment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      installment_id,
      pay_upi = 0,
      pay_cheque = 0,
      pay_cash = 0,
      pay_upi_reference,
      remarks,
    } = req.body;

    const collected_by = req.user?.id;

    /* 1️⃣ BASIC VALIDATION */

    if (!installment_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "installment_id is required",
      });
    }

    if (!collected_by) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* 2️⃣ FETCH INSTALLMENT + LOCK */

    const [rows] = await connection.query(
      `SELECT 
          i.*,
          s.customer_id
       FROM chit_customer_installments i
       JOIN chit_customer_subscriptions s 
         ON i.subscription_id = s.id
       WHERE i.id = ?
       FOR UPDATE`,
      [installment_id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Invalid installment_id",
      });
    }

    const inst = rows[0];

    /* 3️⃣ FULL SUBSCRIPTION CHECK (IMPORTANT) */

    const [summary] = await connection.query(
      `SELECT 
          SUM(installment_amount) AS total_amount,
          SUM(paid_amount) AS total_paid
       FROM chit_customer_installments
       WHERE subscription_id = ?`,
      [inst.subscription_id],
    );

    const totalAmount = Number(summary[0].total_amount || 0);
    const totalPaid = Number(summary[0].total_paid || 0);

    if (totalPaid >= totalAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Full due already completed",
      });
    }

    /* 4️⃣ SANITIZE INPUT */

    const upi = Number(pay_upi) || 0;
    const cheque = Number(pay_cheque) || 0;
    const cash = Number(pay_cash) || 0;

    if (upi < 0 || cheque < 0 || cash < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment cannot be negative",
      });
    }

    const total_amount = upi + cheque + cash;

    if (total_amount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Enter valid payment amount",
      });
    }

    /* 5️⃣ PENDING CHECK */

    const pending = Number(inst.installment_amount) - Number(inst.paid_amount);

    if (pending <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Installment already fully paid",
      });
    }

    if (total_amount > pending) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment exceeds pending amount (${pending})`,
      });
    }

    /* 6️⃣ UPI VALIDATION */

    if (upi > 0) {
      if (!pay_upi_reference) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "UPI reference is required",
        });
      }

      const [dup] = await connection.query(
        `SELECT id FROM chit_collections_payments
         WHERE pay_upi_reference = ?
         LIMIT 1`,
        [pay_upi_reference],
      );

      if (dup.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Duplicate UPI reference",
        });
      }
    }

    /* 7️⃣ UPDATE INSTALLMENT */

    const newPaid = Number(inst.paid_amount) + total_amount;

    // const installmentAmount = Number(inst.installment_amount);
    // const updatedPaid = Number(inst.paid_amount) + total_amount;

    // const safePaid = Math.min(updatedPaid, installmentAmount);

    // let status = "PARTIAL";
    // if (safePaid >= installmentAmount) {
    //   status = "PAID";
    // }

    const installmentAmount = Number(inst.installment_amount);
    const previousPaid = Number(inst.paid_amount);
    const updatedPaid = previousPaid + total_amount;

    const safePaid = Math.min(updatedPaid, installmentAmount);
    const pendingAfter = installmentAmount - safePaid;

    // normalize date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(inst.due_date); // MUST exist
    dueDate.setHours(0, 0, 0, 0);

    let status;

    // ✅ FULLY PAID
    if (safePaid >= installmentAmount) {
      if (today < dueDate) {
        status = "BEFOREPAID"; // early payment
      } else {
        status = "PAID";
      }
    }

    // ❌ NOT FULLY PAID
    else {
      if (today > dueDate) {
        status = "OVERDUE";
      } else {
        if (safePaid === 0) {
          status = "PENDING";
        } else {
          status = "PARTIAL";
        }
      }
    }

    await connection.query(
      `UPDATE chit_customer_installments
   SET paid_amount = ?, status = ?
   WHERE id = ?`,
      [safePaid, status, installment_id],
    );

    /* 8️⃣ INSERT PAYMENT */

    await connection.query(
      `INSERT INTO chit_collections_payments
      (
        subscription_id,
        installment_id,
        customer_id,
        collected_by,
        pay_upi,
        pay_upi_reference,
        pay_cheque,
        pay_cash,
        total_amount,
        remarks
      )
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        inst.subscription_id,
        installment_id,
        inst.customer_id,
        collected_by,
        upi,
        pay_upi_reference || null,
        cheque,
        cash,
        total_amount,
        remarks || null,
      ],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Installment payment successful",
      data: {
        installment_id,
        paid_now: total_amount,
        total_paid: newPaid,
        pending: pending - total_amount,
        pending: pendingAfter,
        status,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "UPI reference must be unique",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};


export const collectPaymentByCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customer_id,
      pay_upi = 0,
      pay_cheque = 0,
      pay_cash = 0,
      pay_upi_reference,
      remarks,
    } = req.body;

    const collected_by = req.user?.id;

    if (!customer_id) throw new Error("customer_id required");
    if (!collected_by) throw new Error("Unauthorized");

    const total_amount =
      Number(pay_upi) + Number(pay_cheque) + Number(pay_cash);

    if (total_amount <= 0) throw new Error("Invalid payment");

    // 🔴 SECURITY (CRITICAL — YOU MISSED THIS EVERYWHERE)
    // const [access] = await connection.query(
    //   `SELECT id FROM user_chit_customer_assignments
    //    WHERE user_id = ? AND customer_id = ? AND is_active = TRUE`,
    //   [collected_by, customer_id]
    // );

    // if (!access.length) {
    //   throw new Error("You are not assigned to this customer");
    // }

    // 🔒 GET ALL PENDING INSTALLMENTS ACROSS ALL SUBSCRIPTIONS
    const [installments] = await connection.query(
      `SELECT 
          i.id,
          i.subscription_id,
          i.installment_amount,
          COALESCE(SUM(a.allocated_amount),0) AS paid
       FROM chit_customer_installments i
       JOIN chit_customer_subscriptions s 
         ON s.id = i.subscription_id
       LEFT JOIN chit_payment_allocations a 
         ON a.installment_id = i.id
       WHERE s.customer_id = ?
       GROUP BY i.id
       HAVING (i.installment_amount - paid) > 0
       ORDER BY i.due_date ASC
       FOR UPDATE`,
      [customer_id]
    );

    if (!installments.length) {
      throw new Error("No pending dues");
    }

    let remaining = total_amount;
    const allocations = [];

    // 🔥 ALLOCATION LOGIC (oldest due first)
    for (const inst of installments) {
      if (remaining <= 0) break;

      const pending = inst.installment_amount - inst.paid;
      const allocate = Math.min(pending, remaining);

      allocations.push({
        installment_id: inst.id,
        subscription_id: inst.subscription_id,
        amount: allocate,
      });

      remaining -= allocate;
    }

    if (allocations.length === 0) {
      throw new Error("Nothing to allocate");
    }

    // ❌ STRICT MODE (recommended)
    if (remaining > 0) {
      throw new Error(`Excess amount ${remaining} not allowed`);
    }

    // 🔴 INSERT PAYMENT (NO subscription_id here!)
    const [paymentResult] = await connection.query(
      `INSERT INTO chit_collections_payments
       (customer_id, collected_by,
        pay_upi, pay_upi_reference, pay_cheque, pay_cash,
        total_amount, remarks)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        collected_by,
        pay_upi,
        pay_upi_reference || null,
        pay_cheque,
        pay_cash,
        total_amount,
        remarks || null,
      ]
    );

    const payment_id = paymentResult.insertId;

    // 🔴 INSERT ALLOCATIONS
    for (const item of allocations) {
      await connection.query(
        `INSERT INTO chit_payment_allocations
         (payment_id, installment_id, allocated_amount)
         VALUES (?,?,?)`,
        [payment_id, item.installment_id, item.amount]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Customer payment allocated successfully",
      data: {
        payment_id,
        total_paid: total_amount,
        allocations,
      },
    });

  } catch (err) {
    await connection.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

