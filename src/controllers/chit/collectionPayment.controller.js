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

export const collectPayment = async (req, res) => {
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

    /* 1️⃣ BASIC VALIDATION */

    if (!subscription_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    if (!collected_by) {
      await connection.rollback();
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* 2️⃣ GET CUSTOMER */

    const [sub] = await connection.query(
      `SELECT customer_id 
       FROM chit_customer_subscriptions 
       WHERE id = ? 
       FOR UPDATE`,
      [subscription_id],
    );

    if (sub.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Invalid subscription_id",
      });
    }

    const customer_id = sub[0].customer_id;

    /* 3️⃣ FULL PAYMENT CHECK */

    const [summary] = await connection.query(
      `SELECT 
        SUM(installment_amount) AS total_amount,
        SUM(paid_amount) AS total_paid
       FROM chit_customer_installments
       WHERE subscription_id = ?`,
      [subscription_id],
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

    /* 4️⃣ SANITIZE */

    const upi = Number(pay_upi) || 0;
    const cheque = Number(pay_cheque) || 0;
    const cash = Number(pay_cash) || 0;

    if (upi < 0 || cheque < 0 || cash < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid payment values",
      });
    }

    const total_amount = upi + cheque + cash;

    if (total_amount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Enter payment amount",
      });
    }

    /* 5️⃣ UPI VALIDATION */

    if (upi > 0) {
      if (!pay_upi_reference) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "UPI reference required",
        });
      }

      const [dup] = await connection.query(
        `SELECT id FROM chit_collections_payments 
         WHERE pay_upi_reference = ? LIMIT 1`,
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

    /* 6️⃣ GET PENDING INSTALLMENTS */

    const [installments] = await connection.query(
      `SELECT * FROM chit_customer_installments
       WHERE subscription_id = ?
       AND (installment_amount - paid_amount) > 0
       ORDER BY id ASC
       FOR UPDATE`,
      [subscription_id],
    );

    if (installments.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No pending installments",
      });
    }

    /* 7️⃣ DISTRIBUTE PAYMENT */

    let remainingAmount = total_amount;
    let distribution = [];

    for (const inst of installments) {
      if (remainingAmount <= 0) break;

      const pending =
        Number(inst.installment_amount) - Number(inst.paid_amount);

      const payAmount = Math.min(remainingAmount, pending);
      const newPaid = Number(inst.paid_amount) + payAmount;

      const status = newPaid === inst.installment_amount ? "PAID" : "PARTIAL";

      await connection.query(
        `UPDATE chit_customer_installments
         SET paid_amount=?, status=?
         WHERE id=?`,
        [newPaid, status, inst.id],
      );

      distribution.push({
        installment_id: inst.id,
        paid: payAmount,
        status,
      });

      remainingAmount -= payAmount;
    }

    /* 8️⃣ INSERT PAYMENT */

    await connection.query(
      `INSERT INTO chit_collections_payments
      (
        subscription_id,
        customer_id,
        collected_by,
        pay_upi,
        pay_upi_reference,
        pay_cheque,
        pay_cash,
        total_amount,
        remarks
      )
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
      ],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Payment applied successfully",
      data: {
        total_paid: total_amount,
        remaining_unused: remainingAmount,
        distribution,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  } finally {
    connection.release();
  }
};

/* =========================================================
   🔥 1. SUBSCRIPTION BASED PAYMENT (AUTO DISTRIBUTE)
   ========================================================= */
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

    /* VALIDATION */

    if (!subscription_id) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID is required",
      });
    }

    if (!collected_by) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* GET CUSTOMER */

    const [sub] = await connection.query(
      `SELECT customer_id 
       FROM chit_customer_subscriptions 
       WHERE id=? FOR UPDATE`,
      [subscription_id],
    );

    if (!sub.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Invalid subscription",
      });
    }

    const customer_id = sub[0].customer_id;

    /* TOTAL CHECK */

    const [summary] = await connection.query(
      `SELECT 
        SUM(installment_amount) total_amount,
        SUM(paid_amount) total_paid
       FROM chit_customer_installments
       WHERE subscription_id=?`,
      [subscription_id],
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

    /* PAYMENT CALC */

    const upi = Number(pay_upi) || 0;
    const cheque = Number(pay_cheque) || 0;
    const cash = Number(pay_cash) || 0;

    const total_amount = upi + cheque + cash;

    if (total_amount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    /* UPI VALIDATION */

    if (upi > 0) {
      if (!pay_upi_reference) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "UPI reference required",
        });
      }

      const [dup] = await connection.query(
        `SELECT id FROM chit_collections_payments 
         WHERE pay_upi_reference=?`,
        [pay_upi_reference],
      );

      if (dup.length) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Duplicate UPI reference",
        });
      }
    }

    /* GET PENDING INSTALLMENTS */

    const [installments] = await connection.query(
      `SELECT * FROM chit_customer_installments
       WHERE subscription_id=?
       AND (installment_amount - paid_amount) > 0
       ORDER BY id ASC
       FOR UPDATE`,
      [subscription_id],
    );

    if (!installments.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No pending installments",
      });
    }

    /* INSERT MAIN PAYMENT FIRST */

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
      ],
    );

    const payment_id = paymentResult.insertId;

    /* DISTRIBUTE + SAVE BREAKDOWN */

    let remaining = total_amount;
    let distribution = [];

    for (const inst of installments) {
      if (remaining <= 0) break;

      const pending =
        Number(inst.installment_amount) - Number(inst.paid_amount);

      const payAmount = Math.min(remaining, pending);
      const newPaid = Number(inst.paid_amount) + payAmount;

      const status = newPaid === inst.installment_amount ? "PAID" : "PARTIAL";

      /* UPDATE INSTALLMENT */
      await connection.query(
        `UPDATE chit_customer_installments
         SET paid_amount=?, status=?
         WHERE id=?`,
        [newPaid, status, inst.id],
      );

      /* SAVE BREAKDOWN */
      await connection.query(
        `INSERT INTO chit_payment_breakdowns
         (payment_id, installment_id, paid_amount)
         VALUES (?,?,?)`,
        [payment_id, inst.id, payAmount],
      );

      distribution.push({
        installment_id: inst.id,
        paid: payAmount,
        status,
      });

      remaining -= payAmount;
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Payment successful",
      data: {
        payment_id,
        subscription_id,
        customer_id,
        total_paid: total_amount,
        remaining_unused: remaining,
        distribution,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server error",
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


