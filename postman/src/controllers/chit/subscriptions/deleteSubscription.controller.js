import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";

// export const deleteCustomerSubscription = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;

//     /* 1️⃣ CHECK SUBSCRIPTION */

//     const [[subscription]] = await connection.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [id],
//     );

//     if (!subscription) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Subscription not found",
//       });
//     }

//     const agent_staff_id = subscription.agent_staff_id;

//     /* 2️⃣ CHECK INSTALLMENTS */

//     const [[installments]] = await connection.query(
//       `SELECT COUNT(*) as total,
//               SUM(CASE WHEN paid_amount > 0 THEN 1 ELSE 0 END) as paid_count
//        FROM chit_customer_installments
//        WHERE subscription_id=?`,
//       [id],
//     );

//     /* 🚨 BLOCK DELETE IF ANY INSTALLMENT PAID */

//     if (installments.paid_count > 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message:
//           "Cannot delete subscription. Some installments are already paid.",
//       });
//     }

//     /* 3️⃣ CHECK PAYMENTS TABLE */

//     let paymentCount = 0;

//     try {
//       const [[payments]] = await connection.query(
//         "SELECT COUNT(*) as count FROM chit_collections WHERE subscription_id=?",
//         [id],
//       );
//       paymentCount = payments.count;
//     } catch (err) {
//       paymentCount = 0;
//     }

//     /* 🚨 BLOCK DELETE IF PAYMENTS EXIST */

//     if (paymentCount > 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message:
//           "Cannot delete subscription. Payments already exist. Use deactivate instead.",
//       });
//     }

//     /* 4️⃣ DELETE SUBSCRIPTION (CASCADE INSTALLMENTS) */

//     await connection.query(
//       "DELETE FROM chit_customer_subscriptions WHERE id=?",
//       [id],
//     );

//     /* 5️⃣ UPDATE REFERRAL COUNT */

//     if (agent_staff_id) {
//       await connection.query(
//         `UPDATE chit_agent_and_staff 
//          SET no_of_referals = (
//            SELECT COUNT(*) 
//            FROM chit_customer_subscriptions 
//            WHERE agent_staff_id = ?
//          )
//          WHERE id = ?`,
//         [agent_staff_id, agent_staff_id],
//       );
//     }

//     await connection.commit();

//     res.status(200).json({
//       success: true,
//       message: "Subscription deleted successfully",
//       deleted_data: subscription,
//       total_installments: installments.total,
//       paid_installments: installments.paid_count,
//       payment_records: paymentCount,
//     });
//   } catch (error) {
//     await connection.rollback();

//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: error.message || "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// ----------------------------- hard delete----------------------------------------------------------

// export const deleteCustomerSubscription = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const userId = req.user?.id || null;

//     /* =========================
//        1️⃣ LOCK SUBSCRIPTION ROW
//     ========================= */

//     const [[subscription]] = await connection.query(
//       `SELECT * FROM chit_customer_subscriptions WHERE id = ? FOR UPDATE`,
//       [id]
//     );

//     if (!subscription) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Subscription not found",
//       });
//     }

//     const agent_staff_id = subscription.agent_staff_id;

//     /* =========================
//        2️⃣ CHECK INSTALLMENTS
//     ========================= */

//     const [[installments]] = await connection.query(
//       `SELECT 
//           COUNT(*) AS total,
//           SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid_count
//        FROM chit_customer_installments
//        WHERE subscription_id = ?`,
//       [id]
//     );

//     if (installments.paid_count > 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Cannot delete. Some installments are already paid.",
//       });
//     }

//     /* =========================
//        3️⃣ CHECK PAYMENTS (STRICT)
//     ========================= */

//     const [[payments]] = await connection.query(
//       `SELECT COUNT(*) AS count 
//        FROM chit_collections 
//        WHERE subscription_id = ?`,
//       [id]
//     );

//     if (payments.count > 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Cannot delete. Payments already exist.",
//       });
//     }

//     /* =========================
//        4️⃣ DELETE (CASCADE)
//     ========================= */

//     await connection.query(
//       `DELETE FROM chit_customer_subscriptions WHERE id = ?`,
//       [id]
//     );

//     /* =========================
//        5️⃣ UPDATE REFERRAL COUNT
//     ========================= */

//     if (agent_staff_id) {
//       await connection.query(
//         `UPDATE chit_agent_and_staff 
//          SET no_of_referals = (
//            SELECT COUNT(*) 
//            FROM chit_customer_subscriptions 
//            WHERE agent_staff_id = ?
//          )
//          WHERE id = ?`,
//         [agent_staff_id, agent_staff_id]
//       );
//     }

//     /* =========================
//        6️⃣ AUDIT LOG (MANDATORY)
//     ========================= */

//     await AuditLog({
//       connection,
//       table: "chit_customer_subscriptions",
//       recordId: id,
//       action: "DELETE",
//       oldData: subscription,
//       userId,
//       remarks: "Hard delete subscription",
//     });

//     await AuditLog({
//       connection,
//       table: "chit_customer_installments",
//       recordId: id,
//       action: "DELETE",
//       oldData: {
//         subscription_id: id,
//         total_installments: installments.total,
//       },
//       userId,
//       remarks: "Cascade delete installments",
//     });

//     await connection.commit();

//     res.status(200).json({
//       success: true,
//       message: "Subscription deleted successfully",
//       deleted_data: subscription,
//       total_installments: installments.total,
//       paid_installments: installments.paid_count,
//       payment_records: payments.count,
//     });

//   } catch (error) {
//     await connection.rollback();

//     console.error("Delete subscription error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message || "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };


export const deleteCustomerSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    /* =========================
       1️⃣ LOCK SUBSCRIPTION
    ========================= */

    const [[subscription]] = await connection.query(
      `SELECT * 
       FROM chit_customer_subscriptions 
       WHERE id = ? 
       FOR UPDATE`,
      [id]
    );

    if (!subscription) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const agent_staff_id = subscription.agent_staff_id;

    /* =========================
       2️⃣ CHECK PAYMENT ALLOCATIONS (REAL SOURCE OF TRUTH)
    ========================= */

    const [[allocations]] = await connection.query(
      `
      SELECT COUNT(*) AS count
      FROM chit_payment_allocations pa
      INNER JOIN chit_customer_installments i 
        ON i.id = pa.installment_id
      WHERE i.subscription_id = ?
      `,
      [id]
    );

    if (allocations.count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete. Payments already allocated to installments.",
      });
    }

    /* =========================
       3️⃣ CHECK PAYMENTS (EXTRA SAFETY)
    ========================= */

    const [[payments]] = await connection.query(
      `
      SELECT COUNT(*) AS count
      FROM chit_collections_payments
      WHERE subscription_id = ?
      `,
      [id]
    );

    if (payments.count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete. Payment records exist.",
      });
    }

    /* =========================
       4️⃣ GET INSTALLMENT COUNT (FOR AUDIT)
    ========================= */

    const [[installmentStats]] = await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM chit_customer_installments
      WHERE subscription_id = ?
      `,
      [id]
    );

    /* =========================
       5️⃣ DELETE SUBSCRIPTION
       (CASCADE WILL DELETE INSTALLMENTS)
    ========================= */

    await connection.query(
      `DELETE FROM chit_customer_subscriptions WHERE id = ?`,
      [id]
    );

    /* =========================
       6️⃣ UPDATE REFERRAL COUNT
    ========================= */

    if (agent_staff_id) {
      await connection.query(
        `
        UPDATE chit_agent_and_staff 
        SET no_of_referals = (
          SELECT COUNT(*) 
          FROM chit_customer_subscriptions 
          WHERE agent_staff_id = ?
        )
        WHERE id = ?
        `,
        [agent_staff_id, agent_staff_id]
      );
    }

    /* =========================
       7️⃣ AUDIT LOG (MANDATORY)
    ========================= */

    await AuditLog({
      connection,
      table: "chit_customer_subscriptions",
      recordId: id,
      action: "DELETE",
      oldData: subscription,
      userId,
      remarks: remarks || "Hard delete subscription",
    });

    await AuditLog({
      connection,
      table: "chit_customer_installments",
      recordId: id,
      action: "DELETE",
      oldData: {
        subscription_id: id,
        total_installments: installmentStats.total,
      },
      userId,
      remarks: "Cascade delete installments",
    });

    await connection.commit();

    /* =========================
       RESPONSE
    ========================= */

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
      deleted_data: subscription,
      total_installments: installmentStats.total,
      payment_records: payments.count,
      allocation_records: allocations.count,
    });

  } catch (error) {
    await connection.rollback();

    console.error("Delete subscription error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  } finally {
    connection.release();
  }
};