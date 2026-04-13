import db from "../../../config/db.js";


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

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });

  } catch (error) {
    console.error("getCustomerSubscriptions error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

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

        COUNT(DISTINCT s.plan_id) AS total_plans,

        -- ✅ Status added
        CASE
          WHEN CURDATE() < b.start_date THEN 'WAITING'
          WHEN CURDATE() BETWEEN b.start_date AND b.end_date THEN 'ACTIVE'
          ELSE 'CLOSED'
        END AS status

      FROM batches b

      LEFT JOIN chit_customer_subscriptions s 
        ON s.batch_id = b.id

      GROUP BY b.id, b.start_date, b.end_date

      ORDER BY b.id DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getBatchSummaryById = async (req, res) => {
  try {
    const { batch_id } = req.params; // use params for specific API

    let query = `
  SELECT 
    b.id AS batch_id,
    b.batch_name,

    -- TOTALS
    COUNT(DISTINCT s.customer_id) AS total_customers,
    COUNT(DISTINCT s.id) AS total_subscriptions,
    COUNT(DISTINCT s.plan_id) AS total_plans,

    -- ACTIVE (current running subscriptions)
    COUNT(DISTINCT CASE 
      WHEN CURDATE() BETWEEN s.start_date AND s.end_date 
      THEN s.customer_id 
    END) AS active_customers,

    COUNT(DISTINCT CASE 
      WHEN CURDATE() BETWEEN s.start_date AND s.end_date 
      THEN s.id 
    END) AS active_subscriptions,

    COUNT(DISTINCT CASE 
      WHEN CURDATE() BETWEEN s.start_date AND s.end_date 
      THEN s.plan_id 
    END) AS active_plans,

    -- UPCOMING (not started yet)
  --  COUNT(DISTINCT CASE 
   --   WHEN CURDATE() < s.start_date 
  --    THEN s.customer_id 
  --  END) AS upcoming_customers,

    -- COMPLETED (expired)
    COUNT(DISTINCT CASE 
      WHEN CURDATE() > s.end_date 
      THEN s.customer_id 
    END) AS completed_customers,

    COUNT(DISTINCT CASE 
      WHEN CURDATE() > s.end_date 
      THEN s.id 
    END) AS completed_subscriptions

  FROM batches b
  LEFT JOIN chit_customer_subscriptions s 
    ON s.batch_id = b.id
`;

    const values = [];

    // 🔹 Add filter only if batch_id exists
    if (batch_id) {
      query += ` WHERE b.id = ? `;
      values.push(batch_id);
    }

    query += `
      GROUP BY b.id
      ORDER BY b.id DESC
    `;

    const [rows] = await db.query(query, values);

    // 🔴 Handle "not found" properly
    if (batch_id && rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
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

