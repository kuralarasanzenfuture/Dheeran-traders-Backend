import db from "../../config/db.js";

const VALID_REF = ["AGENT","STAFF","OFFICE"];


/* CREATE SUBSCRIPTION */
export const createCustomerSubscription = async (req,res)=>{
  try{

    let{
      customer_id,
      batch_id,
      plan_id,
      no_of_slots,
      investment_amount,
      start_date,
      duration,
      end_date,
      reference_mode,
      agent_staff_id
    } = req.body;


    if(
      !customer_id ||
      !batch_id ||
      !plan_id ||
      !no_of_slots ||
      !investment_amount ||
      !start_date ||
      !duration ||
      !end_date ||
      !reference_mode
    ){
      return res.status(400).json({
        success:false,
        message:"All required fields must be provided"
      })
    }


    reference_mode = reference_mode.toUpperCase().trim();

    if(!VALID_REF.includes(reference_mode)){
      return res.status(400).json({
        success:false,
        message:"Reference mode must be AGENT, STAFF or OFFICE"
      })
    }


    if((reference_mode === "AGENT" || reference_mode === "STAFF") && !agent_staff_id){
      return res.status(400).json({
        success:false,
        message:"agent_staff_id required for AGENT or STAFF"
      })
    }


    const start = new Date(start_date);
    const end = new Date(end_date);

    if(start >= end){
      return res.status(400).json({
        success:false,
        message:"Start date must be before end date"
      })
    }


    const [duplicate] = await db.query(
      `SELECT id FROM chit_customer_subscriptions 
       WHERE customer_id=? AND batch_id=? AND plan_id=?`,
      [customer_id,batch_id,plan_id]
    );

    if(duplicate.length>0){
      return res.status(409).json({
        success:false,
        message:"Customer already subscribed in this batch"
      })
    }


    const [result] = await db.query(
      `INSERT INTO chit_customer_subscriptions
      (customer_id,batch_id,plan_id,no_of_slots,investment_amount,
       start_date,duration,end_date,reference_mode,agent_staff_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        batch_id,
        plan_id,
        no_of_slots,
        investment_amount,
        start_date,
        duration,
        end_date,
        reference_mode,
        agent_staff_id || null
      ]
    );


    const [data] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [result.insertId]
    );


    res.status(201).json({
      success:true,
      message:"Customer subscription created successfully",
      data:data[0]
    });

  }catch(error){

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};





/* UPDATE SUBSCRIPTION */
export const updateCustomerSubscription = async (req,res)=>{
  try{

    const {id} = req.params;

    const [existing] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    if(existing.length === 0){
      return res.status(404).json({
        success:false,
        message:"Subscription not found"
      })
    }


    let{
      no_of_slots,
      investment_amount,
      start_date,
      duration,
      end_date,
      reference_mode,
      agent_staff_id
    } = req.body;


    if(
      !no_of_slots ||
      !investment_amount ||
      !start_date ||
      !duration ||
      !end_date ||
      !reference_mode
    ){
      return res.status(400).json({
        success:false,
        message:"Required fields missing"
      })
    }


    reference_mode = reference_mode.toUpperCase().trim();

    if(!VALID_REF.includes(reference_mode)){
      return res.status(400).json({
        success:false,
        message:"Reference mode must be AGENT, STAFF or OFFICE"
      })
    }


    if((reference_mode === "AGENT" || reference_mode === "STAFF") && !agent_staff_id){
      return res.status(400).json({
        success:false,
        message:"agent_staff_id required"
      })
    }


    const start = new Date(start_date);
    const end = new Date(end_date);

    if(start >= end){
      return res.status(400).json({
        success:false,
        message:"Start date must be before end date"
      })
    }


    await db.query(
      `UPDATE chit_customer_subscriptions
       SET
       no_of_slots=?,
       investment_amount=?,
       start_date=?,
       duration=?,
       end_date=?,
       reference_mode=?,
       agent_staff_id=?
       WHERE id=?`,
      [
        no_of_slots,
        investment_amount,
        start_date,
        duration,
        end_date,
        reference_mode,
        agent_staff_id || null,
        id
      ]
    );


    const [updated] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );


    res.status(200).json({
      success:true,
      message:"Subscription updated successfully",
      data:updated[0]
    });

  }catch(error){

    console.error(error);

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};





/* DELETE */
export const deleteCustomerSubscription = async (req,res)=>{
  try{

    const {id} = req.params;

    const [existing] = await db.query(
      "SELECT id FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    if(existing.length === 0){
      return res.status(404).json({
        success:false,
        message:"Subscription not found"
      })
    }


    await db.query(
      "DELETE FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );


    res.status(200).json({
      success:true,
      message:"Subscription deleted successfully"
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};





/* GET ALL */
export const getCustomerSubscriptions = async (req,res)=>{
  try{

    const [rows] = await db.query(`
      SELECT
      id,
      customer_id,
      batch_id,
      plan_id,
      no_of_slots,
      investment_amount,
      start_date,
      duration,
      end_date,
      reference_mode,
      agent_staff_id,
      created_at
      FROM chit_customer_subscriptions
      ORDER BY id DESC
    `);

    res.status(200).json({
      success:true,
      count:rows.length,
      data:rows
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};





/* GET BY ID */
export const getCustomerSubscriptionById = async (req,res)=>{
  try{

    const {id} = req.params;

    const [rows] = await db.query(
      "SELECT * FROM chit_customer_subscriptions WHERE id=?",
      [id]
    );

    if(rows.length === 0){
      return res.status(404).json({
        success:false,
        message:"Subscription not found"
      })
    }

    res.status(200).json({
      success:true,
      data:rows[0]
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }
};