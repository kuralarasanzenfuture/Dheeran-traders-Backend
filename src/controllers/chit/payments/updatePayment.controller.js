import db from "../../../config/db.js";

// export const updatePayment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { payment_id } = req.params;

//     const {
//       installments,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     if (!payment_id) throw new Error("payment_id required");
//     if (!installments || !installments.length) {
//       throw new Error("installments required");
//     }

//     // 🔹 1. LOCK PAYMENT
//     const [paymentRows] = await connection.query(
//       `SELECT * FROM chit_collections_payments 
//        WHERE id=? FOR UPDATE`,
//       [payment_id]
//     );

//     if (!paymentRows.length) throw new Error("Payment not found");

//     // 🔹 2. LOCK INSTALLMENTS (🔥 FIX HERE)
//     const ids = installments.map(i => i.installment_id);

//     const [dbInstallments] = await connection.query(
//       `SELECT 
//         i.id,
//         i.subscription_id,
//         i.installment_amount,
//         s.customer_id,

//         -- 🔥 EXCLUDE CURRENT PAYMENT
//         COALESCE(SUM(a.allocated_amount),0) AS paid_other

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s 
//         ON s.id = i.subscription_id

//       LEFT JOIN chit_payment_allocations a 
//         ON a.installment_id = i.id
//         AND a.payment_id != ?

//       WHERE i.id IN (?)

//       GROUP BY i.id
//       FOR UPDATE`,
//       [payment_id, ids]
//     );

//     if (dbInstallments.length !== installments.length) {
//       throw new Error("Invalid installment IDs");
//     }

//     let total_amount = 0;
//     let customer_id = null;
//     let subscription_id = null;

//     const allocations = [];

//     for (const input of installments) {
//       const dbInst = dbInstallments.find(d => d.id === input.installment_id);

//       if (!dbInst) throw new Error("Invalid installment");

//       if (!customer_id) customer_id = dbInst.customer_id;
//       if (customer_id !== dbInst.customer_id) {
//         throw new Error("Different customers not allowed");
//       }

//       if (!subscription_id) subscription_id = dbInst.subscription_id;
//       if (subscription_id !== dbInst.subscription_id) {
//         throw new Error("Different subscriptions not allowed");
//       }

//       // 🔥 CORRECT PENDING
//       const pending = dbInst.installment_amount - dbInst.paid_other;

//       if (input.amount > pending) {
//         throw new Error(
//           `Installment ${dbInst.id} exceeds pending amount`
//         );
//       }

//       total_amount += Number(input.amount);

//       allocations.push({
//         installment_id: dbInst.id,
//         amount: input.amount,
//       });
//     }

//     // 🔹 PAYMENT MODE VALIDATION
//     const mode_total =
//       Number(pay_cash) + Number(pay_upi) + Number(pay_cheque);

//     if (mode_total !== total_amount) {
//       throw new Error("Payment mode total mismatch");
//     }

//     // 🔹 DELETE OLD ALLOCATIONS
//     await connection.query(
//       `DELETE FROM chit_payment_allocations WHERE payment_id=?`,
//       [payment_id]
//     );

//     // 🔹 UPDATE PAYMENT
//     await connection.query(
//       `UPDATE chit_collections_payments
//        SET 
//          subscription_id=?,
//          customer_id=?,
//          pay_upi=?,
//          pay_cheque=?,
//          pay_cash=?,
//          pay_upi_reference=?,
//          total_amount=?,
//          remarks=?
//        WHERE id=?`,
//       [
//         subscription_id,
//         customer_id,
//         pay_upi,
//         pay_cheque,
//         pay_cash,
//         pay_upi_reference || null,
//         total_amount,
//         remarks || null,
//         payment_id,
//       ]
//     );

//     // 🔹 INSERT NEW ALLOCATIONS
//     for (const item of allocations) {
//       await connection.query(
//         `INSERT INTO chit_payment_allocations
//          (payment_id, installment_id, allocated_amount)
//          VALUES (?,?,?)`,
//         [payment_id, item.installment_id, item.amount]
//       );
//     }

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: "Payment updated successfully",
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

export const updatePayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { payment_id } = req.params;

    const {
      installments,
      pay_upi = 0,
      pay_cheque = 0,
      pay_cash = 0,
      pay_upi_reference,
      remarks,
    } = req.body;

    if (!payment_id) throw new Error("payment_id required");
    if (!installments || !installments.length) {
      throw new Error("installments required");
    }

    // 🔹 1. LOCK PAYMENT
    const [paymentRows] = await connection.query(
      `SELECT * FROM chit_collections_payments 
       WHERE id=? FOR UPDATE`,
      [payment_id]
    );

    if (!paymentRows.length) throw new Error("Payment not found");

    const oldPayment = paymentRows[0];

    // 🔹 2. VALIDATE UPI (exclude current payment)
    if (pay_upi > 0 && pay_upi_reference) {
      const [dup] = await connection.query(
        `SELECT id FROM chit_collections_payments 
         WHERE pay_upi_reference=? AND id != ?`,
        [pay_upi_reference, payment_id]
      );

      if (dup.length) throw new Error("Duplicate UPI reference");
    }

    // 🔹 3. LOCK INSTALLMENTS (🔥 EXCLUDE CURRENT PAYMENT IN SUM)
    const ids = installments.map(i => i.installment_id);

    const [dbInstallments] = await connection.query(
      `SELECT 
        i.id,
        i.subscription_id,
        i.installment_amount,
        s.customer_id,

        COALESCE(SUM(a.allocated_amount),0) AS paid_other

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      LEFT JOIN chit_payment_allocations a 
        ON a.installment_id = i.id
        AND a.payment_id != ?

      WHERE i.id IN (?)

      GROUP BY i.id
      FOR UPDATE`,
      [payment_id, ids]
    );

    if (dbInstallments.length !== installments.length) {
      throw new Error("One or more installment IDs are invalid");
    }

    // 🔹 4. VALIDATION + CALCULATION
    let total_amount = 0;
    const allocations = [];

    for (const input of installments) {
      const dbInst = dbInstallments.find(d => d.id === input.installment_id);

      if (!dbInst) {
        throw new Error(`Invalid installment_id: ${input.installment_id}`);
      }

      // 🔥 CHECK SUBSCRIPTION MATCH
      if (dbInst.subscription_id !== oldPayment.subscription_id) {
        throw new Error(
          `Installment ${dbInst.id} does not belong to this payment's subscription`
        );
      }

      // 🔥 CHECK CUSTOMER MATCH
      if (dbInst.customer_id !== oldPayment.customer_id) {
        throw new Error(
          `Installment ${dbInst.id} does not belong to this customer`
        );
      }

      const pending =
        dbInst.installment_amount - dbInst.paid_other;

      if (input.amount > pending) {
        throw new Error(
          `Installment ${dbInst.id} amount exceeds pending (${pending})`
        );
      }

      total_amount += Number(input.amount);

      allocations.push({
        installment_id: dbInst.id,
        amount: Number(input.amount),
      });
    }

    // 🔹 5. PAYMENT MODE VALIDATION
    const mode_total =
      Number(pay_cash) + Number(pay_upi) + Number(pay_cheque);

    if (mode_total !== total_amount) {
      throw new Error(
        `Payment mode total (${mode_total}) does not match installment total (${total_amount})`
      );
    }

    // 🔹 6. DELETE OLD ALLOCATIONS
    await connection.query(
      `DELETE FROM chit_payment_allocations WHERE payment_id=?`,
      [payment_id]
    );

    // 🔹 7. UPDATE PAYMENT
    await connection.query(
      `UPDATE chit_collections_payments
       SET 
         pay_upi=?,
         pay_cheque=?,
         pay_cash=?,
         pay_upi_reference=?,
         total_amount=?,
         remarks=?
       WHERE id=?`,
      [
        pay_upi,
        pay_cheque,
        pay_cash,
        pay_upi_reference || null,
        total_amount,
        remarks || null,
        payment_id,
      ]
    );

    // 🔹 8. INSERT NEW ALLOCATIONS
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
      message: "Payment updated successfully",
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
