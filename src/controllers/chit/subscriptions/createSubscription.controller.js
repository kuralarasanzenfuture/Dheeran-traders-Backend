// import db from "../../../config/db.js";
// import { generateInstallments } from "../../../services/generateInstallment.service.js";

// const VALID_REF = ["AGENT", "STAFF", "OFFICE"];

// const checkExists = async (table, id) => {
//   const [rows] = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
//   return rows.length > 0;
// };

// export const createCustomerSubscription = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     let {
//       customer_id,
//       nominee_name,
//       nominee_phone,
//       batch_id,
//       plan_id,
//       installment_amount,
//       investment_amount,
//       start_date,
//       duration,
//       reference_mode,
//       agent_staff_id,
//     } = req.body;

//     /* =========================
//        REQUIRED VALIDATION
//     ========================= */

//     if (
//       !customer_id ||
//       !batch_id ||
//       !plan_id ||
//       !investment_amount ||
//       !start_date ||
//       !duration ||
//       !reference_mode
//     ) {
//       throw new Error("Required fields missing");
//     }

//     /* =========================
//        NUMBER VALIDATION
//     ========================= */

//     if (isNaN(investment_amount) || investment_amount <= 0) {
//       throw new Error("Invalid investment_amount");
//     }

//     if (isNaN(duration) || duration <= 0) {
//       throw new Error("Invalid duration");
//     }

//     if (installment_amount && installment_amount < 0) {
//       throw new Error("Invalid installment_amount");
//     }

//     /* =========================
//        DATE PARSE
//     ========================= */

//     const start = new Date(start_date);
//     if (isNaN(start)) throw new Error("Invalid start_date");

//     /* =========================
//        REFERENCE MODE
//     ========================= */

//     reference_mode = reference_mode.toUpperCase().trim();

//     if (!VALID_REF.includes(reference_mode)) {
//       throw new Error("Reference mode must be AGENT, STAFF or OFFICE");
//     }

//     /* =========================
//        FOREIGN KEY VALIDATION
//     ========================= */

//     if (!(await checkExists("chit_customers", customer_id))) {
//       throw new Error("Invalid customer_id");
//     }

//     if (!(await checkExists("batches", batch_id))) {
//       throw new Error("Invalid batch_id");
//     }

//     if (!(await checkExists("plans", plan_id))) {
//       throw new Error("Invalid plan_id");
//     }

//     /* =========================
//        FETCH PLAN + BATCH
//     ========================= */

//     const [[plan]] = await connection.query(
//       `SELECT total_installments, collection_type
//        FROM plans WHERE id=?`,
//       [plan_id],
//     );

//     const [[batch]] = await connection.query(
//       `SELECT start_date, end_date
//        FROM batches WHERE id=?`,
//       [batch_id],
//     );

//     const totalInstallments = plan.total_installments;
//     const collectionType = plan.collection_type;

//     const batchStart = new Date(batch.start_date);
//     const batchEnd = new Date(batch.end_date);

//     /* =========================
//        CALCULATE END DATE (DO NOT TRUST USER)
//     ========================= */

//     let calculatedEnd = new Date(start);

//     for (let i = 1; i < totalInstallments; i++) {
//       if (collectionType === "DAILY") {
//         calculatedEnd.setDate(calculatedEnd.getDate() + 1);
//       } else if (collectionType === "WEEKLY") {
//         calculatedEnd.setDate(calculatedEnd.getDate() + 7);
//       } else if (collectionType === "MONTHLY") {
//         calculatedEnd.setMonth(calculatedEnd.getMonth() + 1);
//       }
//     }

//     /* =========================
//        DATE VALIDATION
//     ========================= */

//     const formatDate = (date) => {
//       return date.toISOString().split("T")[0];
//     };

//     if (start < batchStart || start > batchEnd) {
//       throw new Error(
//         `Start date must be within batch period (${formatDate(batchStart)} to ${formatDate(batchEnd)})`,
//       );
//     }

//     /* =========================
//        AGENT / STAFF VALIDATION
//     ========================= */

//     if (reference_mode === "AGENT" || reference_mode === "STAFF") {
//       if (!agent_staff_id) {
//         throw new Error("agent_staff_id required");
//       }

//       if (!(await checkExists("chit_agent_and_staff", agent_staff_id))) {
//         throw new Error("Invalid agent_staff_id");
//       }
//     } else {
//       agent_staff_id = null;
//     }

//     /* =========================
//        INSERT SUBSCRIPTION
//     ========================= */

//     const [result] = await connection.query(
//       `INSERT INTO chit_customer_subscriptions
//       (
//         customer_id,
//         nominee_name,
//         nominee_phone,
//         batch_id,
//         plan_id,
//         installment_amount,
//         investment_amount,
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id
//       )
//       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
//       [
//         customer_id,
//         nominee_name || null,
//         nominee_phone || null,
//         batch_id,
//         plan_id,
//         installment_amount,
//         investment_amount,
//         start,
//         duration,
//         calculatedEnd,
//         reference_mode,
//         agent_staff_id,
//       ],
//     );

//     const subscriptionId = result.insertId;

//     if (agent_staff_id) {
//       await connection.query(
//         `UPDATE chit_agent_and_staff
//      SET no_of_referals = (
//        SELECT COUNT(*)
//        FROM chit_customer_subscriptions
//        WHERE agent_staff_id = ?
//      )
//      WHERE id = ?`,
//         [agent_staff_id, agent_staff_id],
//       );
//     }

//     /* =========================
//        GENERATE INSTALLMENTS (BULK SAFE)
//     ========================= */

//     let dueDate = new Date(start);
//     // const installmentRows = [];

//     // for (let i = 1; i <= totalInstallments; i++) {
//     //   installmentRows.push([
//     //     subscriptionId,
//     //     i,
//     //     new Date(dueDate),
//     //     installment_amount,
//     //   ]);

//     //   if (collectionType === "DAILY") {
//     //     dueDate.setDate(dueDate.getDate() + 1);
//     //   } else if (collectionType === "WEEKLY") {
//     //     dueDate.setDate(dueDate.getDate() + 7);
//     //   } else if (collectionType === "MONTHLY") {
//     //     dueDate.setMonth(dueDate.getMonth() + 1);
//     //   }
//     // }

//     const installmentRows = generateInstallments({
//       subscriptionId,
//       // startDate: start,
//       startDate: dueDate,
//       totalInstallments,
//       collectionType,
//       installmentAmount: installment_amount,
//     });

//     await connection.query(
//       `INSERT INTO chit_customer_installments
//       (subscription_id, installment_number, due_date, installment_amount)
//       VALUES ?`,
//       [installmentRows],
//     );

//     /* =========================
//        FETCH FINAL DATA
//     ========================= */

//     const [[data]] = await connection.query(
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
//         s.created_at
//       FROM chit_customer_subscriptions s
//       LEFT JOIN chit_customers c ON c.id = s.customer_id
//       LEFT JOIN batches b ON b.id = s.batch_id
//       LEFT JOIN plans p ON p.id = s.plan_id
//       LEFT JOIN chit_agent_and_staff a ON a.id = s.agent_staff_id
//       WHERE s.id = ?
//       `,
//       [subscriptionId],
//     );

//     await connection.commit();

//     res.status(201).json({
//       success: true,
//       message: "Customer subscription created successfully",
//       data,
//     });
//   } catch (error) {
//     await connection.rollback();

//     res.status(400).json({
//       success: false,
//       message: error.message || "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// ----------------------- hard delete--------------------------------------------------

import db from "../../../config/db.js";
import { generateInstallments } from "../../../services/generateInstallment.service.js";
import { AuditLog } from "../../../services/audit.service.js";

const VALID_REF = ["AGENT", "STAFF", "OFFICE"];

const checkExists = async (connection, table, id) => {
  const [rows] = await connection.query(
    `SELECT id FROM ${table} WHERE id = ?`,
    [id],
  );
  return rows.length > 0;
};

// export const createCustomerSubscription = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const userId = req.user?.id;

//     let {
//       customer_id,
//       nominee_name,
//       nominee_phone,
//       batch_id,
//       plan_id,
//       installment_amount,
//       investment_amount,
//       start_date,
//       duration,
//       reference_mode,
//       agent_staff_id,
//     } = req.body;

//     // console.log(req.body);

//     /* ========================= VALIDATION ========================= */

//     if (
//       !customer_id ||
//       !batch_id ||
//       !plan_id ||
//       !investment_amount ||
//       !start_date ||
//       !duration ||
//       !reference_mode
//     ) {
//       throw new Error(
//         `Missing required fields ${
//           !customer_id
//             ? "customer_id"
//             : !batch_id
//               ? "batch_id"
//               : !plan_id
//                 ? "plan_id"
//                 : !investment_amount
//                   ? "investment_amount"
//                   : !start_date
//                     ? "start_date"
//                     : !duration
//                       ? "duration"
//                       : "reference_mode"
//         }`,
//       );
//     }

//     // ✅ normalize numbers
//     installment_amount = Number(installment_amount);
//     investment_amount = Number(investment_amount);
//     duration = Number(duration);
//     customer_id = Number(customer_id);
//     batch_id = Number(batch_id);
//     plan_id = Number(plan_id);

//     // ✅ validation
//     if (isNaN(installment_amount) || installment_amount <= 0) {
//       throw new Error("Invalid installment_amount");
//     }

//     if (isNaN(investment_amount) || investment_amount <= 0) {
//       throw new Error("Invalid investment_amount");
//     }


//     if (isNaN(investment_amount) || investment_amount <= 0) {
//       throw new Error("Invalid investment_amount");
//     }

//     if (isNaN(duration) || duration <= 0) {
//       throw new Error("Invalid duration");
//     }

//     if (installment_amount == null || installment_amount <= 0) {
//       throw new Error("Invalid installment_amount");
//     }

//     const start = new Date(start_date);
//     if (isNaN(start)) throw new Error("Invalid start_date");

//     reference_mode = reference_mode.toUpperCase().trim();

//     if (!VALID_REF.includes(reference_mode)) {
//       throw new Error("Invalid reference_mode");
//     }

//     /* ========================= FK VALIDATION ========================= */

//     if (!(await checkExists(connection, "chit_customers", customer_id))) {
//       throw new Error("Invalid customer_id");
//     }

//     if (!(await checkExists(connection, "batches", batch_id))) {
//       throw new Error("Invalid batch_id");
//     }

//     if (!(await checkExists(connection, "plans", plan_id))) {
//       throw new Error("Invalid plan_id");
//     }

//     /* ========================= PLAN + BATCH ========================= */

//     const [[plan]] = await connection.query(
//       `SELECT total_installments, collection_type 
//        FROM plans WHERE id=?`,
//       [plan_id],
//     );

//     if (!plan) throw new Error("Plan not found");

//     const [[batch]] = await connection.query(
//       `SELECT start_date, end_date FROM batches WHERE id=?`,
//       [batch_id],
//     );

//     if (!batch) throw new Error("Batch not found");

//     const totalInstallments = plan.total_installments;
//     const collectionType = plan.collection_type;


//     const batchStart = new Date(batch.start_date);
//     const batchEnd = new Date(batch.end_date);

//     if (start < batchStart || start > batchEnd) {
//       throw new Error("Start date must be within batch period");
//     }

//     // ✅ correct business logic
//     if (collectionType === "SINGLE") {
//       if (installment_amount !== investment_amount) {
//         throw new Error(
//           `For SINGLE plan, installment_amount must equal investment_amount`,
//         );
//       }
//     } else {
//       const expected = totalInstallments * installment_amount;

//       if (investment_amount !== expected) {
//         throw new Error(`Investment amount must be ${expected}`);
//       }
//     }

//     /* ========================= AGENT VALIDATION ========================= */

//     if (reference_mode === "AGENT" || reference_mode === "STAFF") {
//       if (!agent_staff_id) throw new Error("agent_staff_id required");

//       if (
//         !(await checkExists(connection, "chit_agent_and_staff", agent_staff_id))
//       ) {
//         throw new Error("Invalid agent_staff_id");
//       }
//     } else {
//       agent_staff_id = null;
//     }

//     /* ========================= END DATE CALC ========================= */

//     let calculatedEnd = new Date(start);

//     for (let i = 1; i < totalInstallments; i++) {
//       if (collectionType === "DAILY") {
//         calculatedEnd.setDate(calculatedEnd.getDate() + 1);
//       } else if (collectionType === "WEEKLY") {
//         calculatedEnd.setDate(calculatedEnd.getDate() + 7);
//       } else if (collectionType === "MONTHLY") {
//         calculatedEnd.setMonth(calculatedEnd.getMonth() + 1);
//       }
//     }

//     /* ========================= INSERT SUBSCRIPTION ========================= */

//     const [result] = await connection.query(
//       `INSERT INTO chit_customer_subscriptions
//       (
//         customer_id, nominee_name, nominee_phone,
//         batch_id, plan_id,
//         installment_amount, investment_amount,
//         start_date, duration, end_date,
//         reference_mode, agent_staff_id,
//         created_by
//       )
//       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//       [
//         customer_id,
//         nominee_name || null,
//         nominee_phone || null,
//         batch_id,
//         plan_id,
//         installment_amount,
//         investment_amount,
//         start,
//         duration,
//         calculatedEnd,
//         reference_mode,
//         agent_staff_id,
//         userId,
//       ],
//     );

//     const subscriptionId = result.insertId;

//     /* ========================= INSTALLMENTS ========================= */

//     const installmentRows = generateInstallments({
//       subscriptionId,
//       startDate: start,
//       totalInstallments,
//       collectionType,
//       installmentAmount: installment_amount,
//     });

//     await connection.query(
//       `INSERT INTO chit_customer_installments
//       (subscription_id, installment_number, due_date, installment_amount, created_by)
//       VALUES ?`,
//       [installmentRows.map((row) => [...row, userId])],
//     );

//     /* ========================= REFERRAL UPDATE ========================= */

//     if (agent_staff_id) {
//       await connection.query(
//         `UPDATE chit_agent_and_staff 
//          SET no_of_referals = (
//            SELECT COUNT(*) FROM chit_customer_subscriptions 
//            WHERE agent_staff_id = ?
//          )
//          WHERE id = ?`,
//         [agent_staff_id, agent_staff_id],
//       );
//     }

//     /* ========================= AUDIT ========================= */

//     await AuditLog({
//       connection,
//       table: "chit_customer_subscriptions",
//       recordId: subscriptionId,
//       action: "INSERT",
//       newData: {
//         customer_id,
//         batch_id,
//         plan_id,
//         investment_amount,
//         installment_amount,
//         start_date: start,
//         end_date: calculatedEnd,
//         reference_mode,
//       },
//       userId,
//       remarks: "Subscription created",
//     });

//     await AuditLog({
//       connection,
//       table: "chit_customer_installments",
//       recordId: subscriptionId,
//       action: "INSERT",
//       newData: {
//         subscription_id: subscriptionId,
//         total_installments: totalInstallments,
//         collection_type: collectionType,
//       },
//       userId,
//       remarks: "Installments generated",
//     });

//     /* ========================= RESPONSE ========================= */

//     const [[data]] = await connection.query(
//       `SELECT s.*, c.name AS customer_name, b.batch_name, p.plan_name
//        FROM chit_customer_subscriptions s
//        LEFT JOIN chit_customers c ON c.id = s.customer_id
//        LEFT JOIN batches b ON b.id = s.batch_id
//        LEFT JOIN plans p ON p.id = s.plan_id
//        WHERE s.id = ?`,
//       [subscriptionId],
//     );

//     await connection.commit();

//     res.status(201).json({
//       success: true,
//       message: "Subscription created",
//       data,
//     });
//   } catch (error) {
//     console.error(`create subscription error: ${error.message}`);
//     await connection.rollback();

//     res.status(400).json({
//       success: false,
//       message: error.message || "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// ---------------------- investment amount  calculation----------------------


export const createCustomerSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user?.id || null;

    let {
      customer_id,
      nominee_name,
      nominee_phone,
      batch_id,
      plan_id,
      installment_amount,
      start_date,
      duration,
      reference_mode,
      agent_staff_id,
    } = req.body;

    /* ========================= REQUIRED ========================= */

    if (
      !customer_id ||
      !batch_id ||
      !plan_id ||
      !installment_amount ||
      !start_date ||
      !duration ||
      !reference_mode
    ) {
      throw new Error("Missing required fields");
    }

    /* ========================= NORMALIZE ========================= */

    customer_id = Number(customer_id);
    batch_id = Number(batch_id);
    plan_id = Number(plan_id);
    installment_amount = Number(installment_amount);
    duration = Number(duration);

    if (isNaN(customer_id) || isNaN(batch_id) || isNaN(plan_id)) {
      throw new Error("Invalid IDs");
    }

    if (isNaN(installment_amount) || installment_amount <= 0) {
      throw new Error("Invalid installment_amount");
    }

    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid duration");
    }

    const start = new Date(start_date);
    if (isNaN(start)) throw new Error("Invalid start_date");

    reference_mode = reference_mode.toUpperCase().trim();

    if (!VALID_REF.includes(reference_mode)) {
      throw new Error("Invalid reference_mode");
    }

    /* ========================= FK VALIDATION ========================= */

    if (!(await checkExists(connection, "chit_customers", customer_id))) {
      throw new Error("Invalid customer_id");
    }

    if (!(await checkExists(connection, "batches", batch_id))) {
      throw new Error("Invalid batch_id");
    }

    if (!(await checkExists(connection, "plans", plan_id))) {
      throw new Error("Invalid plan_id");
    }

    /* ========================= PLAN + BATCH ========================= */

    const [[plan]] = await connection.query(
      `SELECT total_installments, collection_type ,duration_days
       FROM plans WHERE id=?`,
      [plan_id]
    );

    if (!plan) throw new Error("Plan not found");

    const [[batch]] = await connection.query(
      `SELECT start_date, end_date FROM batches WHERE id=?`,
      [batch_id]
    );

    if (!batch) throw new Error("Batch not found");

    const totalInstallments = Number(plan.total_installments);
    const collectionType = plan.collection_type;

    /* ✅ STRICT RULE */
    if (duration !== plan.duration_days) {
      throw new Error("Duration must match plan installments");
    }

    /* ========================= DATE VALIDATION ========================= */

    const batchStart = new Date(batch.start_date);
    const batchEnd = new Date(batch.end_date);

    if (start < batchStart || start > batchEnd) {
      throw new Error("Start date must be within batch period");
    }

    /* ========================= AUTO CALC INVESTMENT ========================= */

    let investment_amount;

    if (collectionType === "SINGLE") {
      investment_amount = installment_amount;
    } else {
      investment_amount = totalInstallments * installment_amount;
    }

    /* ========================= AGENT VALIDATION ========================= */

    if (reference_mode === "AGENT" || reference_mode === "STAFF") {
      if (!agent_staff_id) throw new Error("agent_staff_id required");

      if (
        !(await checkExists(connection, "chit_agent_and_staff", agent_staff_id))
      ) {
        throw new Error("Invalid agent_staff_id");
      }
    } else {
      agent_staff_id = null;
    }

    /* ========================= END DATE CALC ========================= */

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

    /* ========================= INSERT ========================= */

    const [result] = await connection.query(
      `INSERT INTO chit_customer_subscriptions
      (
        customer_id, nominee_name, nominee_phone,
        batch_id, plan_id,
        installment_amount, investment_amount,
        start_date, duration, end_date,
        reference_mode, agent_staff_id,
        created_by
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        nominee_name || null,
        nominee_phone || null,
        batch_id,
        plan_id,
        installment_amount,
        investment_amount,
        start,
        duration,
        calculatedEnd,
        reference_mode,
        agent_staff_id,
        userId,
      ]
    );

    const subscriptionId = result.insertId;

    /* ========================= INSTALLMENTS ========================= */

    const installmentRows = generateInstallments({
      subscriptionId,
      startDate: start,
      totalInstallments,
      collectionType,
      installmentAmount: installment_amount,
    });

    await connection.query(
      `INSERT INTO chit_customer_installments
      (subscription_id, installment_number, due_date, installment_amount, created_by)
      VALUES ?`,
      [installmentRows.map((row) => [...row, userId])]
    );

    /* ========================= REFERRAL UPDATE ========================= */

    if (agent_staff_id) {
      await connection.query(
        `UPDATE chit_agent_and_staff 
         SET no_of_referals = (
           SELECT COUNT(*) FROM chit_customer_subscriptions 
           WHERE agent_staff_id = ?
         )
         WHERE id = ?`,
        [agent_staff_id, agent_staff_id]
      );
    }

    /* ========================= AUDIT ========================= */

    await AuditLog({
      connection,
      table: "chit_customer_subscriptions",
      recordId: subscriptionId,
      action: "INSERT",
      newData: {
        customer_id,
        batch_id,
        plan_id,
        installment_amount,
        investment_amount,
        start_date: start,
        end_date: calculatedEnd,
        reference_mode,
      },
      userId,
      remarks: "Subscription created",
    });

    /* ========================= RESPONSE ========================= */

    const [[data]] = await connection.query(
      `SELECT s.*, c.name AS customer_name, b.batch_name, p.plan_name
       FROM chit_customer_subscriptions s
       LEFT JOIN chit_customers c ON c.id = s.customer_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE s.id = ?`,
      [subscriptionId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data,
    });
  } catch (error) {
    await connection.rollback();

    console.error("create subscription error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message || "Server error",
    });
  } finally {
    connection.release();
  }
};
