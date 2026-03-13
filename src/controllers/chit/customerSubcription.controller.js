import db from "../../config/db.js";

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

export const createCustomerSubscription = async (req, res) => {
  try {
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
      end_date,
      reference_mode,
      agent_staff_id,
    } = req.body;

    /* REQUIRED VALIDATION */

    if (
      !customer_id ||
      !batch_id ||
      !plan_id ||
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

    /* FOREIGN KEY VALIDATION */

    if (!(await checkExists("chit_customers", customer_id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer_id",
      });
    }

    if (!(await checkExists("batches", batch_id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch_id",
      });
    }

    if (!(await checkExists("plans", plan_id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan_id",
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

    /* INSERT DATA */

    const [result] = await db.query(
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
        start_date,
        duration,
        end_date,
        reference_mode,
        agent_staff_id,
      ],
    );

    /* RETURN FULL DETAILS */

    const [data] = await db.query(
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
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      message: "Customer subscription created successfully",
      data: data[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
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

export const deleteCustomerSubscription = async (req, res) => {
  try {
    const { id } = req.params;

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

    await db.query("DELETE FROM chit_customer_subscriptions WHERE id=?", [id]);

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
      deleted_data: existing[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
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

export const getCustomerSubscriptions = async (req, res) => {
  try {
    // const [rows] = await db.query(`
    //   SELECT
    //     s.id AS subscription_id,

    //     c.id AS customer_id,
    //     c.name AS customer_name,
    //     c.phone,
    //     c.place,

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

    //   ORDER BY s.id DESC
    // `);

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

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
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
      [id]
    );

    if (customer.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    /* SUBSCRIPTIONS + PLAN + BATCH + AGENT */

    const [subscriptions] = await db.query(`
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
    `,[id]);

    /* TOTAL INVESTMENT */

    const [investment] = await db.query(
      `SELECT SUM(investment_amount) as total_investment
       FROM chit_customer_subscriptions
       WHERE customer_id=?`,
      [id]
    );

    /* ACTIVE BATCH COUNT */

    const [activeBatch] = await db.query(
      `SELECT COUNT(DISTINCT batch_id) as active_batches
       FROM chit_customer_subscriptions
       WHERE customer_id=? 
       AND CURDATE() BETWEEN start_date AND end_date`,
      [id]
    );

    /* ACTIVE PLAN COUNT */

    const [activePlan] = await db.query(
      `SELECT COUNT(DISTINCT plan_id) as active_plans
       FROM chit_customer_subscriptions
       WHERE customer_id=? 
       AND CURDATE() BETWEEN start_date AND end_date`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        customer: customer[0],
        total_investment: investment[0].total_investment || 0,
        active_batches: activeBatch[0].active_batches,
        active_plans: activePlan[0].active_plans,
        subscriptions
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};
