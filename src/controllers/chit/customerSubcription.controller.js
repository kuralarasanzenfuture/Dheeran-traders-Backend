import db from "../../config/db.js";
import { generateInstallments } from "../../services/generateInstallment.service.js";

const VALID_REF = ["AGENT", "STAFF", "OFFICE"];

/* CREATE SUBSCRIPTION */
// export const createCustomerSubscription = async (req,res)=>{
//   try{

//     let{
//       customer_id,
//       batch_id,
//       plan_id,
//       no_of_slots,
//       investment_amount,
//       start_date,
//       duration,
//       end_date,
//       reference_mode,
//       agent_staff_id
//     } = req.body;

//     if(
//       !customer_id ||
//       !batch_id ||
//       !plan_id ||
//       !no_of_slots ||
//       !investment_amount ||
//       !start_date ||
//       !duration ||
//       !end_date ||
//       !reference_mode
//     ){
//       return res.status(400).json({
//         success:false,
//         message:"All required fields must be provided"
//       })
//     }

//     reference_mode = reference_mode.toUpperCase().trim();

//     if(!VALID_REF.includes(reference_mode)){
//       return res.status(400).json({
//         success:false,
//         message:"Reference mode must be AGENT, STAFF or OFFICE"
//       })
//     }

//     if((reference_mode === "AGENT" || reference_mode === "STAFF") && !agent_staff_id){
//       return res.status(400).json({
//         success:false,
//         message:"agent_staff_id required for AGENT or STAFF"
//       })
//     }

//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     if(start >= end){
//       return res.status(400).json({
//         success:false,
//         message:"Start date must be before end date"
//       })
//     }

//     const [duplicate] = await db.query(
//       `SELECT id FROM chit_customer_subscriptions
//        WHERE customer_id=? AND batch_id=? AND plan_id=?`,
//       [customer_id,batch_id,plan_id]
//     );

//     if(duplicate.length>0){
//       return res.status(409).json({
//         success:false,
//         message:"Customer already subscribed in this batch"
//       })
//     }

//     const [result] = await db.query(
//       `INSERT INTO chit_customer_subscriptions
//       (customer_id,batch_id,plan_id,no_of_slots,investment_amount,
//        start_date,duration,end_date,reference_mode,agent_staff_id)
//       VALUES (?,?,?,?,?,?,?,?,?,?)`,
//       [
//         customer_id,
//         batch_id,
//         plan_id,
//         no_of_slots,
//         investment_amount,
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id || null
//       ]
//     );

//     const [data] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [result.insertId]
//     );

//     res.status(201).json({
//       success:true,
//       message:"Customer subscription created successfully",
//       data:data[0]
//     });

//   }catch(error){

//     console.error(error);

//     res.status(500).json({
//       success:false,
//       message:"Server error"
//     });

//   }
// };

const checkExists = async (table, id) => {
  const [rows] = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return rows.length > 0;
};

// export const createCustomerSubscription = async (req, res) => {
//   try {
//     let {
//       customer_id,
//       batch_id,
//       plan_id,
//       no_of_slots,
//       investment_amount,
//       start_date,
//       duration,
//       end_date,
//       reference_mode,
//       agent_staff_id,
//     } = req.body;

//     if (
//       !customer_id ||
//       !batch_id ||
//       !plan_id ||
//       !no_of_slots ||
//       !investment_amount ||
//       !start_date ||
//       !duration ||
//       !end_date ||
//       !reference_mode
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be provided",
//       });
//     }

//     if (isNaN(no_of_slots) || no_of_slots <= 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid no_of_slots" });
//     }

//     if (isNaN(investment_amount) || investment_amount <= 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid investment_amount" });
//     }

//     if (isNaN(duration) || duration <= 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid duration" });
//     }

//     reference_mode = reference_mode.toUpperCase().trim();

//     if (!VALID_REF.includes(reference_mode)) {
//       return res.status(400).json({
//         success: false,
//         message: "Reference mode must be AGENT, STAFF or OFFICE",
//       });
//     }

//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     if (start >= end) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date must be before end date",
//       });
//     }

//     // CHECK IDS EXIST
//     if (!(await checkExists("chit_customers", customer_id))) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid customer_id" });
//     }

//     if (!(await checkExists("batches", batch_id))) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid batch_id" });
//     }

//     if (!(await checkExists("plans", plan_id))) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid plan_id" });
//     }

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

//     const [duplicate] = await db.query(
//       `SELECT id FROM chit_customer_subscriptions
//        WHERE customer_id=? AND batch_id=? AND plan_id=?`,
//       [customer_id, batch_id, plan_id],
//     );

//     if (duplicate.length > 0) {
//       return res.status(409).json({
//         success: false,
//         message: "Customer already subscribed in this batch",
//       });
//     }

//     const [result] = await db.query(
//       `INSERT INTO chit_customer_subscriptions
//       (customer_id,batch_id,plan_id,no_of_slots,investment_amount,
//        start_date,duration,end_date,reference_mode,agent_staff_id)
//       VALUES (?,?,?,?,?,?,?,?,?,?)`,
//       [
//         customer_id,
//         batch_id,
//         plan_id,
//         no_of_slots,
//         investment_amount,
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id,
//       ],
//     );

//     const [data] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [result.insertId],
//     );

//     res.status(201).json({
//       success: true,
//       message: "Customer subscription created successfully",
//       data: data[0],
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// export const createCustomerSubscription = async (req, res) => {
//   try {
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
//       end_date,
//       reference_mode,
//       agent_staff_id,
//     } = req.body;

//     /* REQUIRED VALIDATION */

//     if (
//       !customer_id ||
//       !batch_id ||
//       !plan_id ||
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

//     /* FOREIGN KEY VALIDATION */

//     if (!(await checkExists("chit_customers", customer_id))) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid customer_id",
//       });
//     }

//     if (!(await checkExists("batches", batch_id))) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid batch_id",
//       });
//     }

//     if (!(await checkExists("plans", plan_id))) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid plan_id",
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

//     /* INSERT DATA */

//     const [result] = await db.query(
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
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id,
//       ],
//     );

//     const subscriptionId = result.insertId;

//     const [plan] = await db.query(
//       `SELECT total_installments, collection_type
//    FROM plans WHERE id=?`,
//       [plan_id],
//     );

//     const totalInstallments = plan[0].total_installments;
//     const collectionType = plan[0].collection_type;

//     const generateInstallments = async (
//       subscriptionId,
//       start_date,
//       totalInstallments,
//       installmentAmount,
//       collectionType,
//     ) => {
//       let dueDate = new Date(start_date);

//       for (let i = 1; i <= totalInstallments; i++) {
//         await db.query(
//           `INSERT INTO chit_customer_installments
//        (subscription_id,installment_number,due_date,installment_amount)
//        VALUES (?,?,?,?)`,
//           [subscriptionId, i, dueDate, installmentAmount],
//         );

//         if (collectionType === "DAILY") dueDate.setDate(dueDate.getDate() + 1);

//         if (collectionType === "WEEKLY") dueDate.setDate(dueDate.getDate() + 7);

//         if (collectionType === "MONTHLY")
//           dueDate.setMonth(dueDate.getMonth() + 1);
//       }
//     };

//     await generateInstallments(
//       subscriptionId,
//       start_date,
//       totalInstallments,
//       installment_amount,
//       collectionType,
//     );

//     /* RETURN FULL DETAILS */

//     const [data] = await db.query(
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

//       LEFT JOIN chit_customers c
//       ON c.id = s.customer_id

//       LEFT JOIN batches b
//       ON b.id = s.batch_id

//       LEFT JOIN plans p
//       ON p.id = s.plan_id

//       LEFT JOIN chit_agent_and_staff a
//       ON a.id = s.agent_staff_id

//       WHERE s.id = ?
//     `,
//       [result.insertId],
//     );

//     res.status(201).json({
//       success: true,
//       message: "Customer subscription created successfully",
//       data: data[0],
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

//  validation start date must be batch start date and end date must be batch end date
export const createCustomerSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      customer_id,
      nominee_name,
      nominee_phone,
      batch_id,
      plan_id,
      installment_amount,
      investment_amount,
      start_date,
      duration,
      reference_mode,
      agent_staff_id,
    } = req.body;

    /* =========================
       REQUIRED VALIDATION
    ========================= */

    if (
      !customer_id ||
      !batch_id ||
      !plan_id ||
      !investment_amount ||
      !start_date ||
      !duration ||
      !reference_mode
    ) {
      throw new Error("Required fields missing");
    }

    /* =========================
       NUMBER VALIDATION
    ========================= */

    if (isNaN(investment_amount) || investment_amount <= 0) {
      throw new Error("Invalid investment_amount");
    }

    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid duration");
    }

    if (installment_amount && installment_amount < 0) {
      throw new Error("Invalid installment_amount");
    }

    /* =========================
       DATE PARSE
    ========================= */

    const start = new Date(start_date);
    if (isNaN(start)) throw new Error("Invalid start_date");

    /* =========================
       REFERENCE MODE
    ========================= */

    reference_mode = reference_mode.toUpperCase().trim();

    if (!VALID_REF.includes(reference_mode)) {
      throw new Error("Reference mode must be AGENT, STAFF or OFFICE");
    }

    /* =========================
       FOREIGN KEY VALIDATION
    ========================= */

    if (!(await checkExists("chit_customers", customer_id))) {
      throw new Error("Invalid customer_id");
    }

    if (!(await checkExists("batches", batch_id))) {
      throw new Error("Invalid batch_id");
    }

    if (!(await checkExists("plans", plan_id))) {
      throw new Error("Invalid plan_id");
    }

    /* =========================
       FETCH PLAN + BATCH
    ========================= */

    const [[plan]] = await connection.query(
      `SELECT total_installments, collection_type 
       FROM plans WHERE id=?`,
      [plan_id],
    );

    const [[batch]] = await connection.query(
      `SELECT start_date, end_date 
       FROM batches WHERE id=?`,
      [batch_id],
    );

    const totalInstallments = plan.total_installments;
    const collectionType = plan.collection_type;

    const batchStart = new Date(batch.start_date);
    const batchEnd = new Date(batch.end_date);

    /* =========================
       CALCULATE END DATE (DO NOT TRUST USER)
    ========================= */

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
       DATE VALIDATION
    ========================= */

    const formatDate = (date) => {
      return date.toISOString().split("T")[0];
    };

    if (start < batchStart || start > batchEnd) {
      throw new Error(
        `Start date must be within batch period (${formatDate(batchStart)} to ${formatDate(batchEnd)})`,
      );
    }

    /* =========================
       AGENT / STAFF VALIDATION
    ========================= */

    if (reference_mode === "AGENT" || reference_mode === "STAFF") {
      if (!agent_staff_id) {
        throw new Error("agent_staff_id required");
      }

      if (!(await checkExists("chit_agent_and_staff", agent_staff_id))) {
        throw new Error("Invalid agent_staff_id");
      }
    } else {
      agent_staff_id = null;
    }

    /* =========================
       INSERT SUBSCRIPTION
    ========================= */

    const [result] = await connection.query(
      `INSERT INTO chit_customer_subscriptions
      (
        customer_id,
        nominee_name,
        nominee_phone,
        batch_id,
        plan_id,
        installment_amount,
        investment_amount,
        start_date,
        duration,
        end_date,
        reference_mode,
        agent_staff_id
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      ],
    );

    const subscriptionId = result.insertId;

    if (agent_staff_id) {
      await connection.query(
        `UPDATE chit_agent_and_staff 
     SET no_of_referals = (
       SELECT COUNT(*) 
       FROM chit_customer_subscriptions 
       WHERE agent_staff_id = ?
     )
     WHERE id = ?`,
        [agent_staff_id, agent_staff_id],
      );
    }

    /* =========================
       GENERATE INSTALLMENTS (BULK SAFE)
    ========================= */

    let dueDate = new Date(start);
    // const installmentRows = [];

    // for (let i = 1; i <= totalInstallments; i++) {
    //   installmentRows.push([
    //     subscriptionId,
    //     i,
    //     new Date(dueDate),
    //     installment_amount,
    //   ]);

    //   if (collectionType === "DAILY") {
    //     dueDate.setDate(dueDate.getDate() + 1);
    //   } else if (collectionType === "WEEKLY") {
    //     dueDate.setDate(dueDate.getDate() + 7);
    //   } else if (collectionType === "MONTHLY") {
    //     dueDate.setMonth(dueDate.getMonth() + 1);
    //   }
    // }

    const installmentRows = generateInstallments({
      subscriptionId,
      // startDate: start,
      startDate: dueDate,
      totalInstallments,
      collectionType,
      installmentAmount: installment_amount,
    });

    await connection.query(
      `INSERT INTO chit_customer_installments
      (subscription_id, installment_number, due_date, installment_amount)
      VALUES ?`,
      [installmentRows],
    );

    /* =========================
       FETCH FINAL DATA
    ========================= */

    const [[data]] = await connection.query(
      `
      SELECT 
        s.id,
        c.name AS customer_name,
        c.phone,
        s.nominee_name,
        s.nominee_phone,
        b.batch_name,
        b.start_date AS batch_start,
        b.end_date AS batch_end,
        p.plan_name,
        p.collection_type,
        p.total_installments,
        s.installment_amount,
        s.investment_amount,
        s.start_date,
        s.duration,
        s.end_date,
        s.reference_mode,
        a.name AS agent_staff_name,
        s.created_at
      FROM chit_customer_subscriptions s
      LEFT JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN chit_agent_and_staff a ON a.id = s.agent_staff_id
      WHERE s.id = ?
      `,
      [subscriptionId],
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Customer subscription created successfully",
      data,
    });
  } catch (error) {
    await connection.rollback();

    res.status(400).json({
      success: false,
      message: error.message || "Server error",
    });
  } finally {
    connection.release();
  }
};

/* UPDATE SUBSCRIPTION */
// export const updateCustomerSubscription = async (req,res)=>{
//   try{

//     const {id} = req.params;

//     const [existing] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [id]
//     );

//     if(existing.length === 0){
//       return res.status(404).json({
//         success:false,
//         message:"Subscription not found"
//       })
//     }

//     let{
//       no_of_slots,
//       investment_amount,
//       start_date,
//       duration,
//       end_date,
//       reference_mode,
//       agent_staff_id
//     } = req.body;

//     if(
//       !no_of_slots ||
//       !investment_amount ||
//       !start_date ||
//       !duration ||
//       !end_date ||
//       !reference_mode
//     ){
//       return res.status(400).json({
//         success:false,
//         message:"Required fields missing"
//       })
//     }

//     reference_mode = reference_mode.toUpperCase().trim();

//     if(!VALID_REF.includes(reference_mode)){
//       return res.status(400).json({
//         success:false,
//         message:"Reference mode must be AGENT, STAFF or OFFICE"
//       })
//     }

//     if((reference_mode === "AGENT" || reference_mode === "STAFF") && !agent_staff_id){
//       return res.status(400).json({
//         success:false,
//         message:"agent_staff_id required"
//       })
//     }

//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     if(start >= end){
//       return res.status(400).json({
//         success:false,
//         message:"Start date must be before end date"
//       })
//     }

//     await db.query(
//       `UPDATE chit_customer_subscriptions
//        SET
//        no_of_slots=?,
//        investment_amount=?,
//        start_date=?,
//        duration=?,
//        end_date=?,
//        reference_mode=?,
//        agent_staff_id=?
//        WHERE id=?`,
//       [
//         no_of_slots,
//         investment_amount,
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id || null,
//         id
//       ]
//     );

//     const [updated] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [id]
//     );

//     res.status(200).json({
//       success:true,
//       message:"Subscription updated successfully",
//       data:updated[0]
//     });

//   }catch(error){

//     console.error(error);

//     res.status(500).json({
//       success:false,
//       message:"Server error"
//     });

//   }
// };

// export const updateCustomerSubscription = async (req, res) => {
//   try {
//     const { id } = req.params;

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
//       no_of_slots,
//       investment_amount,
//       start_date,
//       duration,
//       end_date,
//       reference_mode,
//       agent_staff_id,
//     } = req.body;

//     if (
//       !no_of_slots ||
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

//     reference_mode = reference_mode.toUpperCase().trim();

//     if (!VALID_REF.includes(reference_mode)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid reference_mode",
//       });
//     }

//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     if (start >= end) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date must be before end date",
//       });
//     }

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

//     await db.query(
//       `UPDATE chit_customer_subscriptions
//        SET
//        no_of_slots=?,
//        investment_amount=?,
//        start_date=?,
//        duration=?,
//        end_date=?,
//        reference_mode=?,
//        agent_staff_id=?
//        WHERE id=?`,
//       [
//         no_of_slots,
//         investment_amount,
//         start_date,
//         duration,
//         end_date,
//         reference_mode,
//         agent_staff_id,
//         id,
//       ],
//     );

//     const [updated] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
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

export const updateCustomerSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    /* CHECK SUBSCRIPTION EXISTS */

    const [existing] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    let {
      nominee_name,
      nominee_phone,
      installment_amount,
      investment_amount,
      start_date,
      duration,
      end_date,
      reference_mode,
      agent_staff_id,
    } = req.body;

    /* REQUIRED VALIDATION */

    if (
      !investment_amount ||
      !start_date ||
      !duration ||
      !end_date ||
      !reference_mode
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    /* NUMBER VALIDATION */

    if (isNaN(investment_amount) || investment_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid investment_amount",
      });
    }

    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration",
      });
    }

    /* DATE VALIDATION */

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    /* REFERENCE MODE */

    reference_mode = reference_mode.toUpperCase().trim();

    if (!VALID_REF.includes(reference_mode)) {
      return res.status(400).json({
        success: false,
        message: "Reference mode must be AGENT, STAFF or OFFICE",
      });
    }

    /* AGENT / STAFF VALIDATION */

    if (reference_mode === "AGENT" || reference_mode === "STAFF") {
      if (!agent_staff_id) {
        return res.status(400).json({
          success: false,
          message: "agent_staff_id required",
        });
      }

      if (!(await checkExists("chit_agent_and_staff", agent_staff_id))) {
        return res.status(400).json({
          success: false,
          message: "Invalid agent_staff_id",
        });
      }
    } else {
      agent_staff_id = null;
    }

    /* UPDATE SUBSCRIPTION */

    await db.query(
      `UPDATE chit_customer_subscriptions
       SET
       nominee_name=?,
       nominee_phone=?,
       installment_amount=?,
       investment_amount=?,
       start_date=?,
       duration=?,
       end_date=?,
       reference_mode=?,
       agent_staff_id=?
       WHERE id=?`,
      [
        nominee_name || null,
        nominee_phone || null,
        installment_amount,
        investment_amount,
        start_date,
        duration,
        end_date,
        reference_mode,
        agent_staff_id,
        id,
      ],
    );

    /* RETURN FULL MERGED DATA */

    const [updated] = await db.query(
      `
      SELECT 
        s.id,

        c.name AS customer_name,
        c.phone,

        s.nominee_name,
        s.nominee_phone,

        b.batch_name,
        b.start_date AS batch_start,
        b.end_date AS batch_end,

        p.plan_name,
        p.collection_type,
        p.total_installments,

        s.installment_amount,
        s.investment_amount,
        s.start_date,
        s.duration,
        s.end_date,

        s.reference_mode,

        a.name AS agent_staff_name,

        s.updated_at

      FROM chit_customer_subscriptions s

      LEFT JOIN chit_customers c 
      ON c.id = s.customer_id

      LEFT JOIN batches b 
      ON b.id = s.batch_id

      LEFT JOIN plans p 
      ON p.id = s.plan_id

      LEFT JOIN chit_agent_and_staff a
      ON a.id = s.agent_staff_id

      WHERE s.id = ?
      `,
      [id],
    );

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: updated[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* DELETE */
// export const deleteCustomerSubscription = async (req,res)=>{
//   try{

//     const {id} = req.params;

//     const [existing] = await db.query(
//       "SELECT id FROM chit_customer_subscriptions WHERE id=?",
//       [id]
//     );

//     if(existing.length === 0){
//       return res.status(404).json({
//         success:false,
//         message:"Subscription not found"
//       })
//     }

//     await db.query(
//       "DELETE FROM chit_customer_subscriptions WHERE id=?",
//       [id]
//     );

//     res.status(200).json({
//       success:true,
//       message:"Subscription deleted successfully"
//     });

//   }catch(error){

//     res.status(500).json({
//       success:false,
//       message:"Server error"
//     });

//   }
// };

// export const deleteCustomerSubscription = async (req, res) => {
//   try {
//     const { id } = req.params;

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

//     await db.query("DELETE FROM chit_customer_subscriptions WHERE id=?", [id]);

//     res.status(200).json({
//       success: true,
//       message: "Subscription deleted successfully",
//       deleted_data: existing[0],
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// export const deleteCustomerSubscription = async (req, res) => {
//   try {
//     const { id } = req.params;

//     /* 1️⃣ CHECK SUBSCRIPTION */

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

//     /* 2️⃣ CHECK INSTALLMENTS EXIST */

//     const [installments] = await db.query(
//       "SELECT COUNT(*) as count FROM chit_customer_installments WHERE subscription_id=?",
//       [id],
//     );

//     /* 3️⃣ CHECK PAYMENTS EXIST */

//     let paymentCount = 0;

//     try {
//       const [payments] = await db.query(
//         "SELECT COUNT(*) as count FROM chit_collections WHERE subscription_id=?",
//         [id],
//       );
//       paymentCount = payments[0].count;
//     } catch (err) {
//       // table might not exist yet
//       paymentCount = 0;
//     }

//     /* 🚨 BLOCK DELETE IF PAYMENTS EXIST */

//     if (paymentCount > 0) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Cannot delete subscription. Payments already exist. Use deactivate instead.",
//       });
//     }

//     /* 4️⃣ DELETE (CASCADE WILL HANDLE CHILD TABLES) */

//     await db.query("DELETE FROM chit_customer_subscriptions WHERE id=?", [id]);

//     res.status(200).json({
//       success: true,
//       message: "Subscription deleted successfully",
//       deleted_data: existing[0],
//       deleted_installments: installments[0].count,
//       deleted_payments: paymentCount,
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

export const deleteCustomerSubscription = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    /* 1️⃣ CHECK SUBSCRIPTION */

    const [[subscription]] = await connection.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id],
    );

    if (!subscription) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const agent_staff_id = subscription.agent_staff_id;

    /* 2️⃣ CHECK INSTALLMENTS */

    const [[installments]] = await connection.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN paid_amount > 0 THEN 1 ELSE 0 END) as paid_count
       FROM chit_customer_installments
       WHERE subscription_id=?`,
      [id],
    );

    /* 🚨 BLOCK DELETE IF ANY INSTALLMENT PAID */

    if (installments.paid_count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete subscription. Some installments are already paid.",
      });
    }

    /* 3️⃣ CHECK PAYMENTS TABLE */

    let paymentCount = 0;

    try {
      const [[payments]] = await connection.query(
        "SELECT COUNT(*) as count FROM chit_collections WHERE subscription_id=?",
        [id],
      );
      paymentCount = payments.count;
    } catch (err) {
      paymentCount = 0;
    }

    /* 🚨 BLOCK DELETE IF PAYMENTS EXIST */

    if (paymentCount > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete subscription. Payments already exist. Use deactivate instead.",
      });
    }

    /* 4️⃣ DELETE SUBSCRIPTION (CASCADE INSTALLMENTS) */

    await connection.query(
      "DELETE FROM chit_customer_subscriptions WHERE id=?",
      [id],
    );

    /* 5️⃣ UPDATE REFERRAL COUNT */

    if (agent_staff_id) {
      await connection.query(
        `UPDATE chit_agent_and_staff 
         SET no_of_referals = (
           SELECT COUNT(*) 
           FROM chit_customer_subscriptions 
           WHERE agent_staff_id = ?
         )
         WHERE id = ?`,
        [agent_staff_id, agent_staff_id],
      );
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
      deleted_data: subscription,
      total_installments: installments.total,
      paid_installments: installments.paid_count,
      payment_records: paymentCount,
    });
  } catch (error) {
    await connection.rollback();

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  } finally {
    connection.release();
  }
};

/* GET ALL */
// export const getCustomerSubscriptions = async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT
//       id,
//       customer_id,
//       batch_id,
//       plan_id,
//       no_of_slots,
//       investment_amount,
//       start_date,
//       duration,
//       end_date,
//       reference_mode,
//       agent_staff_id,
//       created_at
//       FROM chit_customer_subscriptions
//       ORDER BY id DESC
//     `);

//     res.status(200).json({
//       success: true,
//       count: rows.length,
//       data: rows,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// export const getCustomerSubscriptions = async (req, res) => {
//   try {
//     // const [rows] = await db.query(`
//     //   SELECT
//     //     s.id AS subscription_id,

//     //     c.id AS customer_id,
//     //     c.name AS customer_name,
//     //     c.phone,
//     //     c.place,

//     //     b.id AS batch_id,
//     //     b.batch_name,
//     //     b.batch_duration,
//     //     b.start_date AS batch_start_date,
//     //     b.end_date AS batch_end_date,

//     //     p.id AS plan_id,
//     //     p.plan_name,
//     //     p.duration_days,
//     //     p.collection_type,
//     //     p.total_installments,

//     //     s.installment_amount,
//     //     s.investment_amount,
//     //     s.start_date,
//     //     s.duration,
//     //     s.end_date,

//     //     s.reference_mode,
//     //     s.agent_staff_id,

//     //     s.created_at

//     //   FROM chit_customer_subscriptions s

//     //   LEFT JOIN chit_customers c
//     //     ON c.id = s.customer_id

//     //   LEFT JOIN batches b
//     //     ON b.id = s.batch_id

//     //   LEFT JOIN batch_plans bp
//     //     ON bp.batch_id = b.id

//     //   LEFT JOIN plans p
//     //     ON p.id = bp.plan_id

//     //   ORDER BY s.id DESC
//     // `);

//     const [rows] = await db.query(`
//       SELECT 
//   s.id AS subscription_id,
//   s.nominee_name,
//   s.nominee_phone,

//   c.id AS customer_id,
//   c.name AS customer_name,
//   c.phone,
//   c.place,

//   b.id AS batch_id,
//   b.batch_name,
//   b.batch_duration,
//   b.start_date AS batch_start_date,
//   b.end_date AS batch_end_date,

//   p.id AS plan_id,
//   p.plan_name,
//   p.duration_days,
//   p.collection_type,
//   p.total_installments,

//   s.installment_amount,
//   s.investment_amount,
//   s.start_date,
//   s.duration,
//   s.end_date,

//   s.reference_mode,
//   s.agent_staff_id,

//   s.created_at

// FROM chit_customer_subscriptions s

// LEFT JOIN chit_customers c 
//   ON c.id = s.customer_id

// LEFT JOIN batches b 
//   ON b.id = s.batch_id

// LEFT JOIN plans p 
//   ON p.id = s.plan_id

// ORDER BY s.id DESC
//     `);

//     res.status(200).json({
//       success: true,
//       count: rows.length,
//       data: rows,
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// -----------------------------------------
// export const getCustomerSubscriptions = async (req, res) => {
//   try {
//     const [rows] = await db.query(`
      
//       SELECT 
//         s.id AS subscription_id,
//         s.nominee_name,
//         s.nominee_phone,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,
//         c.place,

//         b.id AS batch_id,
//         b.batch_name,
//         b.batch_duration,
//         b.start_date AS batch_start_date,
//         b.end_date AS batch_end_date,

//         p.id AS plan_id,
//         p.plan_name,
//         p.duration_days,
//         p.collection_type,
//         p.total_installments,

//         s.installment_amount,
//         s.investment_amount,
//         s.start_date,
//         s.duration,
//         s.end_date,

//         s.reference_mode,
//         s.agent_staff_id,
//         s.created_at,

//         bs.total_members,
//         bs.active_members,
//         bs.batch_plan_count

//       FROM chit_customer_subscriptions s

//       LEFT JOIN chit_customers c 
//         ON c.id = s.customer_id

//       LEFT JOIN batches b 
//         ON b.id = s.batch_id

//       LEFT JOIN plans p 
//         ON p.id = s.plan_id

//       -- ✅ Pre-aggregated batch stats (ONLY ONCE)
//       LEFT JOIN (
//         SELECT 
//           batch_id,
//           COUNT(*) AS total_members,

//           COUNT(
//             CASE 
//               WHEN CURRENT_DATE BETWEEN start_date AND end_date 
//               THEN 1 
//             END
//           ) AS active_members,

//           COUNT(DISTINCT plan_id) AS batch_plan_count

//         FROM chit_customer_subscriptions
//         GROUP BY batch_id
//       ) bs 
//         ON bs.batch_id = s.batch_id

//       ORDER BY s.id DESC
//     `);

//     res.status(200).json({
//       success: true,
//       count: rows.length,
//       data: rows,
//     });

//   } catch (error) {
//     console.error("getCustomerSubscriptions error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// -----------------------------------------

export const getCustomerSubscriptions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      
      SELECT 
        s.id AS subscription_id,
        s.nominee_name,
        s.nominee_phone,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,

        b.id AS batch_id,
        b.batch_name,
        b.batch_duration,
        b.start_date AS batch_start_date,
        b.end_date AS batch_end_date,

        p.id AS plan_id,
        p.plan_name,
        p.duration_days,
        p.collection_type,
        p.total_installments,

        s.installment_amount,
        s.investment_amount,
        s.start_date,
        s.duration,
        s.end_date,

        s.reference_mode,
        s.agent_staff_id,

        a.id AS agent_id,
a.name AS agent_name,
a.phone AS agent_phone,
a.reference_mode AS agent_reference_mode,
a.status AS agent_status,


        s.created_at,

        bs.total_members,
        bs.active_members,
        bs.batch_plan_count

      FROM chit_customer_subscriptions s

      LEFT JOIN chit_customers c 
        ON c.id = s.customer_id

      LEFT JOIN batches b 
        ON b.id = s.batch_id

      LEFT JOIN plans p 
        ON p.id = s.plan_id

        LEFT JOIN chit_agent_and_staff a 
  ON a.id = s.agent_staff_id

      -- ✅ Pre-aggregated batch stats (ONLY ONCE)
      LEFT JOIN (
        SELECT 
          batch_id,
          COUNT(*) AS total_members,

          COUNT(
            CASE 
              WHEN CURRENT_DATE BETWEEN start_date AND end_date 
              THEN 1 
            END
          ) AS active_members,

          COUNT(DISTINCT plan_id) AS batch_plan_count

        FROM chit_customer_subscriptions
        GROUP BY batch_id
      ) bs 
        ON bs.batch_id = s.batch_id

      ORDER BY s.id DESC
    `);

    const batchMap = {};

    for (const row of rows) {
      if (!batchMap[row.batch_id]) {
        batchMap[row.batch_id] = {
          batch_id: row.batch_id,
          batch_name: row.batch_name,
          batch_duration: row.batch_duration,
          batch_start_date: row.batch_start_date,
          batch_end_date: row.batch_end_date,

          total_members: row.total_members,
          active_members: row.active_members,
          batch_plan_count: row.batch_plan_count,

          plans: {}
        };
      }

      const batch = batchMap[row.batch_id];

      if (!batch.plans[row.plan_id]) {
        batch.plans[row.plan_id] = {
          plan_id: row.plan_id,
          plan_name: row.plan_name,
          duration_days: row.duration_days,
          collection_type: row.collection_type,
          total_installments: row.total_installments,

          subscriptions: []
        };
      }

      batch.plans[row.plan_id].subscriptions.push({
        subscription_id: row.subscription_id,
        nominee_name: row.nominee_name,
        nominee_phone: row.nominee_phone,

        customer_id: row.customer_id,
        customer_name: row.customer_name,
        phone: row.phone,
        place: row.place,

        installment_amount: row.installment_amount,
        investment_amount: row.investment_amount,
        start_date: row.start_date,
        end_date: row.end_date,

        reference_mode: row.reference_mode,
        agent_staff_id: row.agent_staff_id,

        agent: row.agent_id
    ? {
        agent_id: row.agent_id,
        name: row.agent_name,
        phone: row.agent_phone,
        reference_mode: row.agent_reference_mode,
        status: row.agent_status
      }
    : null,


        created_at: row.created_at
      });
    }

    // convert object → array
    const result = Object.values(batchMap).map(batch => ({
      ...batch,
      plans: Object.values(batch.plans)
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });

  } catch (error) {
    console.error("getCustomerSubscriptions error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* GET BY ID */
// export const getCustomerSubscriptionById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query(
//       "SELECT * FROM chit_customer_subscriptions WHERE id=?",
//       [id],
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Subscription not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: rows[0],
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

export const getCustomerSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    // const [rows] = await db.query(
    //   `
    //   SELECT
    //     s.id AS subscription_id,

    //     c.id AS customer_id,
    //     c.name AS customer_name,
    //     c.phone,
    //     c.place,
    //     c.address,
    //     c.state,
    //     c.district,
    //     c.pincode,

    //     b.id AS batch_id,
    //     b.batch_name,
    //     b.batch_duration,
    //     b.start_date AS batch_start_date,
    //     b.end_date AS batch_end_date,

    //     p.id AS plan_id,
    //     p.plan_name,
    //     p.duration_days,
    //     p.collection_type,
    //     p.total_installments,

    //     s.installment_amount,
    //     s.investment_amount,
    //     s.start_date,
    //     s.duration,
    //     s.end_date,

    //     s.reference_mode,
    //     s.agent_staff_id,

    //     s.created_at

    //   FROM chit_customer_subscriptions s

    //   LEFT JOIN chit_customers c
    //     ON c.id = s.customer_id

    //   LEFT JOIN batches b
    //     ON b.id = s.batch_id

    //   LEFT JOIN batch_plans bp
    //     ON bp.batch_id = b.id

    //   LEFT JOIN plans p
    //     ON p.id = bp.plan_id

    //   WHERE s.id = ?
    // `,
    //   [id],
    // );

    const [rows] = await db.query(`
      SELECT 
  s.id AS subscription_id,
  s.nominee_name,
  s.nominee_phone,

  c.id AS customer_id,
  c.name AS customer_name,
  c.phone,
  c.place,

  b.id AS batch_id,
  b.batch_name,
  b.batch_duration,
  b.start_date AS batch_start_date,
  b.end_date AS batch_end_date,

  p.id AS plan_id,
  p.plan_name,
  p.duration_days,
  p.collection_type,
  p.total_installments,

  s.installment_amount,
  s.investment_amount,
  s.start_date,
  s.duration,
  s.end_date,

  s.reference_mode,
  s.agent_staff_id,

  s.created_at

FROM chit_customer_subscriptions s

LEFT JOIN chit_customers c 
  ON c.id = s.customer_id

LEFT JOIN batches b 
  ON b.id = s.batch_id

LEFT JOIN plans p 
  ON p.id = s.plan_id

ORDER BY s.id DESC
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getCustomerFullDetails = async (req, res) => {
  try {
    const { id } = req.params;

    /* CUSTOMER BASIC DETAILS */

    const [customer] = await db.query(
      `SELECT * FROM chit_customers WHERE id=?`,
      [id],
    );

    if (customer.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    /* SUBSCRIPTIONS + PLAN + BATCH + AGENT */

    const [subscriptions] = await db.query(
      `
      SELECT
        s.id as subscription_id,

        b.batch_name,
        p.plan_name,

        s.start_date,
        s.end_date,

        s.nominee_name,
        s.nominee_phone,

        s.investment_amount,

        a.name as agent_name,
        a.phone as agent_phone,

        CASE
          WHEN CURDATE() > s.end_date THEN 'completed'
          WHEN CURDATE() < s.start_date THEN 'pending'
          ELSE 'active'
        END as status

      FROM chit_customer_subscriptions s

      LEFT JOIN batches b 
      ON b.id = s.batch_id

      LEFT JOIN plans p 
      ON p.id = s.plan_id

      LEFT JOIN chit_agent_and_staff a
      ON a.id = s.agent_staff_id

      WHERE s.customer_id = ?

      ORDER BY s.start_date DESC
    `,
      [id],
    );

    /* TOTAL INVESTMENT */

    const [investment] = await db.query(
      `SELECT SUM(investment_amount) as total_investment
       FROM chit_customer_subscriptions
       WHERE customer_id=?`,
      [id],
    );

    /* ACTIVE BATCH COUNT */

    const [activeBatch] = await db.query(
      `SELECT COUNT(DISTINCT batch_id) as active_batches
       FROM chit_customer_subscriptions
       WHERE customer_id=? 
       AND CURDATE() BETWEEN start_date AND end_date`,
      [id],
    );

    /* ACTIVE PLAN COUNT */

    const [activePlan] = await db.query(
      `SELECT COUNT(DISTINCT plan_id) as active_plans
       FROM chit_customer_subscriptions
       WHERE customer_id=? 
       AND CURDATE() BETWEEN start_date AND end_date`,
      [id],
    );

    res.status(200).json({
      success: true,
      data: {
        customer: customer[0],
        total_investment: investment[0].total_investment || 0,
        active_batches: activeBatch[0].active_batches,
        active_plans: activePlan[0].active_plans,
        subscriptions,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getBatchSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.id AS batch_id,
        b.batch_name,

        COUNT(DISTINCT s.customer_id) AS total_customers,
        COUNT(s.id) AS total_subscriptions,

        COUNT(DISTINCT s.plan_id) AS total_plans

      FROM batches b
      LEFT JOIN chit_customer_subscriptions s 
        ON s.batch_id = b.id

      GROUP BY b.id
      ORDER BY b.id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPlanSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id AS plan_id,
        p.plan_name,

        COUNT(s.id) AS total_subscriptions,
        COUNT(DISTINCT s.customer_id) AS total_customers,

        SUM(s.investment_amount) AS total_investment

      FROM plans p
      LEFT JOIN chit_customer_subscriptions s 
        ON s.plan_id = p.id

      GROUP BY p.id
      ORDER BY p.id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBatchDetails = async (req, res) => {
  try {
    const { batch_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        s.id AS subscription_id,
        c.name AS customer_name,
        c.phone,

        p.plan_name,
        s.investment_amount,
        s.installment_amount,
        s.start_date,
        s.end_date

      FROM chit_customer_subscriptions s
      LEFT JOIN chit_customers c ON c.id = s.customer_id
      LEFT JOIN plans p ON p.id = s.plan_id

      WHERE s.batch_id = ?
      ORDER BY s.id DESC
    `,
      [batch_id],
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
