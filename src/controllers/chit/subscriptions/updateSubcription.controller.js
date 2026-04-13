import db from "../../../config/db.js";
import { generateInstallments } from "../../../services/generateInstallment.service.js";
import { AuditLog } from "../../../services/audit.service.js";

const VALID_REF = ["AGENT", "STAFF", "OFFICE"];

const checkExists = async (table, id) => {
  const [rows] = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return rows.length > 0;
};

// export const updateCustomerSubscription = async (req, res) => {
//   try {
//     const { id } = req.params;

//     /* CHECK SUBSCRIPTION EXISTS */

//     const [existing] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [id],
//     );

//     if (existing.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Subscription not found",
//       });
//     }

//     let {
//       nominee_name,
//       nominee_phone,
//       installment_amount,
//       investment_amount,
//       start_date,
//       duration,
//       end_date,
//       reference_mode,
//       agent_staff_id,
//     } = req.body;

//     /* REQUIRED VALIDATION */

//     if (
//       !investment_amount ||
//       !start_date ||
//       !duration ||
//       !end_date ||
//       !reference_mode
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Required fields missing",
//       });
//     }

//     /* NUMBER VALIDATION */

//     if (isNaN(investment_amount) || investment_amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid investment_amount",
//       });
//     }

//     if (isNaN(duration) || duration <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid duration",
//       });
//     }

//     /* DATE VALIDATION */

//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     if (start >= end) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date must be before end date",
//       });
//     }

//     /* REFERENCE MODE */

//     reference_mode = reference_mode.toUpperCase().trim();

//     if (!VALID_REF.includes(reference_mode)) {
//       return res.status(400).json({
//         success: false,
//         message: "Reference mode must be AGENT, STAFF or OFFICE",
//       });
//     }

//     /* AGENT / STAFF VALIDATION */

//     if (reference_mode === "AGENT" || reference_mode === "STAFF") {
//       if (!agent_staff_id) {
//         return res.status(400).json({
//           success: false,
//           message: "agent_staff_id required",
//         });
//       }

//       if (!(await checkExists("chit_agent_and_staff", agent_staff_id))) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid agent_staff_id",
//         });
//       }
//     } else {
//       agent_staff_id = null;
//     }

//     /* UPDATE SUBSCRIPTION */

//     await db.query(
//       `UPDATE chit_customer_subscriptions
//        SET
//        nominee_name=?,
//        nominee_phone=?,
//        installment_amount=?,
//        investment_amount=?,
//        start_date=?,
//        duration=?,
//        end_date=?,
//        reference_mode=?,
//        agent_staff_id=?
//        WHERE id=?`,
//       [
//         nominee_name || null,
//         nominee_phone || null,
//         installment_amount,
//         investment_amount,
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id,
//         id,
//       ],
//     );

//     /* RETURN FULL MERGED DATA */

//     const [updated] = await db.query(
//       `
//       SELECT 
//         s.id,

//         c.name AS customer_name,
//         c.phone,

//         s.nominee_name,
//         s.nominee_phone,

//         b.batch_name,
//         b.start_date AS batch_start,
//         b.end_date AS batch_end,

//         p.plan_name,
//         p.collection_type,
//         p.total_installments,

//         s.installment_amount,
//         s.investment_amount,
//         s.start_date,
//         s.duration,
//         s.end_date,

//         s.reference_mode,

//         a.name AS agent_staff_name,

//         s.updated_at

//       FROM chit_customer_subscriptions s

//       LEFT JOIN chit_customers c 
//       ON c.id = s.customer_id

//       LEFT JOIN batches b 
//       ON b.id = s.batch_id

//       LEFT JOIN plans p 
//       ON p.id = s.plan_id

//       LEFT JOIN chit_agent_and_staff a
//       ON a.id = s.agent_staff_id

//       WHERE s.id = ?
//       `,
//       [id],
//     );

//     res.status(200).json({
//       success: true,
//       message: "Subscription updated successfully",
//       data: updated[0],
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// ----------------------------------------------------------------------------

export const updateCustomerSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id || null;

    /* =========================
       1️⃣ LOCK + GET OLD DATA
    ========================= */

    const [[oldSub]] = await connection.query(
      `SELECT * FROM chit_customer_subscriptions WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!oldSub) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    /* =========================
       2️⃣ CHECK PAYMENTS / ALLOCATIONS
    ========================= */

    const [[alloc]] = await connection.query(
      `
      SELECT COUNT(*) AS count
      FROM chit_payment_allocations pa
      JOIN chit_customer_installments i 
        ON i.id = pa.installment_id
      WHERE i.subscription_id = ?
      `,
      [id]
    );

    const hasPayments = alloc.count > 0;

    /* =========================
       3️⃣ INPUT NORMALIZATION
    ========================= */

    let {
      nominee_name,
      nominee_phone,
      installment_amount,
      investment_amount,
      start_date,
      duration,
      reference_mode,
      agent_staff_id,
    } = req.body;

    installment_amount = Number(installment_amount);
    investment_amount = Number(investment_amount);
    duration = Number(duration);

    reference_mode = reference_mode?.toUpperCase()?.trim();

    /* =========================
       4️⃣ RESTRICT IF PAYMENTS EXIST
    ========================= */

    if (hasPayments) {
      // ❌ BLOCK FINANCIAL UPDATE
      await connection.query(
        `UPDATE chit_customer_subscriptions
         SET nominee_name=?, nominee_phone=?, reference_mode=?, agent_staff_id=?, updated_by=?
         WHERE id=?`,
        [
          nominee_name || null,
          nominee_phone || null,
          reference_mode,
          reference_mode === "OFFICE" ? null : agent_staff_id,
          userId,
          id,
        ]
      );

      await AuditLog({
        connection,
        table: "chit_customer_subscriptions",
        recordId: id,
        action: "UPDATE",
        oldData: oldSub,
        newData: { nominee_name, nominee_phone, reference_mode, agent_staff_id },
        userId,
        remarks: "Restricted update (payments exist)",
      });

      await connection.commit();

      return res.json({
        success: true,
        message: "Updated (limited fields due to payments)",
      });
    }

    /* =========================
       5️⃣ FETCH PLAN
    ========================= */

    const [[plan]] = await connection.query(
      `SELECT total_installments, collection_type FROM plans WHERE id=?`,
      [oldSub.plan_id]
    );

    const totalInstallments = plan.total_installments;
    const collectionType = plan.collection_type;

    /* =========================
       6️⃣ VALIDATION
    ========================= */

    if (collectionType === "SINGLE") {
      if (installment_amount !== investment_amount) {
        throw new Error("SINGLE plan mismatch");
      }
    } else {
      if (investment_amount !== totalInstallments * installment_amount) {
        throw new Error("Invalid investment calculation");
      }
    }

    /* =========================
       7️⃣ CALCULATE END DATE
    ========================= */

    let start = new Date(start_date);
    let calculatedEnd = new Date(start);

    for (let i = 1; i < totalInstallments; i++) {
      if (collectionType === "DAILY") {
        calculatedEnd.setDate(calculatedEnd.getDate() + 1);
      } else if (collectionType === "WEEKLY") {
        calculatedEnd.setDate(calculatedEnd.getDate() + 7);
      } else if (collectionType === "MONTHLY") {
        calculatedEnd.setMonth(calculatedEnd.getMonth() + 1);
      }
    }

    /* =========================
       8️⃣ UPDATE SUBSCRIPTION
    ========================= */

    await connection.query(
      `UPDATE chit_customer_subscriptions
       SET nominee_name=?, nominee_phone=?, installment_amount=?, investment_amount=?,
           start_date=?, duration=?, end_date=?, reference_mode=?, agent_staff_id=?, updated_by=?
       WHERE id=?`,
      [
        nominee_name || null,
        nominee_phone || null,
        installment_amount,
        investment_amount,
        start,
        duration,
        calculatedEnd,
        reference_mode,
        reference_mode === "OFFICE" ? null : agent_staff_id,
        userId,
        id,
      ]
    );

    /* =========================
       9️⃣ DELETE OLD INSTALLMENTS
    ========================= */

    await connection.query(
      `DELETE FROM chit_customer_installments WHERE subscription_id=?`,
      [id]
    );

    /* =========================
       🔟 REGENERATE INSTALLMENTS
    ========================= */

    const installmentRows =
      collectionType === "SINGLE"
        ? [[id, 1, start, installment_amount]]
        : generateInstallments({
            subscriptionId: id,
            startDate: start,
            totalInstallments,
            collectionType,
            installmentAmount: installment_amount,
          });

    await connection.query(
      `INSERT INTO chit_customer_installments
       (subscription_id, installment_number, due_date, installment_amount, created_by)
       VALUES ?`,
      [installmentRows.map((r) => [...r, userId])]
    );

    /* =========================
       1️⃣1️⃣ AUDIT LOG
    ========================= */

    await AuditLog({
      connection,
      table: "chit_customer_subscriptions",
      recordId: id,
      action: "UPDATE",
      oldData: oldSub,
      newData: {
        installment_amount,
        investment_amount,
        start_date: start,
        end_date: calculatedEnd,
      },
      userId,
      remarks: remarks || "Full update with installment regeneration",
    });

    await AuditLog({
      connection,
      table: "chit_customer_installments",
      recordId: id,
      action: "DELETE",
      oldData: { subscription_id: id },
      userId,
      remarks: "Old installments deleted",
    });

    await AuditLog({
      connection,
      table: "chit_customer_installments",
      recordId: id,
      action: "INSERT",
      newData: { subscription_id: id, total_installments: totalInstallments },
      userId,
      remarks: remarks || "Installments regenerated",
    });

    await connection.commit();

    res.json({
      success: true,
      message: "Subscription fully updated",
    });

  } catch (error) {
    await connection.rollback();

    console.error("Update error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection.release();
  }
};