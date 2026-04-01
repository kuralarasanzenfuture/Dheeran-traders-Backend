import db from "../../../config/db.js";


export const getTodayDueSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(i.id) AS total_installments,
        SUM(i.installment_amount) AS total_due_amount

      FROM chit_customer_installments i

      WHERE DATE(i.due_date) = CURDATE()
    `);

    return res.json({
      success: true,
      data: rows[0],
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


export const getTodayDueList = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.due_date,
        i.installment_amount,

        s.id AS subscription_id,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,

        b.id AS batch_id,
        b.batch_name,

        p.id AS plan_id,
        p.plan_name

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      JOIN batches b 
        ON b.id = s.batch_id

      JOIN plans p 
        ON p.id = s.plan_id

      WHERE DATE(i.due_date) = CURDATE()

      ORDER BY i.due_date ASC
    `);

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getOverdueInstallments = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.due_date,
        i.installment_amount,

        c.name AS customer_name,
        c.phone,

        DATEDIFF(CURDATE(), i.due_date) AS days_overdue

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      WHERE i.due_date < CURDATE()

      ORDER BY i.due_date ASC
    `);

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


export const getCollectorDueList = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) throw new Error("Unauthorized");

    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [user_id]
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    if (role !== "admin") {
      condition = `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    const [rows] = await db.query(
      `
      SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.due_date,

        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,

        b.batch_name,
        p2.plan_name

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id
      JOIN batches b ON b.id = s.batch_id
      JOIN plans p2 ON p2.id = s.plan_id

      LEFT JOIN (
        SELECT installment_id, SUM(allocated_amount) AS total_paid
        FROM chit_payment_allocations
        GROUP BY installment_id
      ) p ON p.installment_id = i.id

      WHERE (i.installment_amount - IFNULL(p.total_paid,0)) > 0
      ${condition}

      ORDER BY i.due_date ASC
      `,
      params
    );

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


export const getCollectionDashboard = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) throw new Error("Unauthorized");

    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [user_id]
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    if (role !== "admin") {
      condition = `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    const [rows] = await db.query(
      `
      SELECT 
        SUM(CASE 
          WHEN DATE(i.due_date) = CURDATE() 
          THEN (i.installment_amount - IFNULL(p.total_paid,0)) 
          ELSE 0 END) AS today_due,

        SUM(CASE 
          WHEN i.due_date < CURDATE() 
          THEN (i.installment_amount - IFNULL(p.total_paid,0)) 
          ELSE 0 END) AS overdue_due,

        SUM((i.installment_amount - IFNULL(p.total_paid,0))) AS total_pending

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id

      LEFT JOIN (
        SELECT installment_id, SUM(allocated_amount) AS total_paid
        FROM chit_payment_allocations
        GROUP BY installment_id
      ) p ON p.installment_id = i.id

      WHERE (i.installment_amount - IFNULL(p.total_paid,0)) > 0
      ${condition}
      `,
      params
    );

    return res.json({
      success: true,
      data: rows[0],
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getPriorityDueList = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) throw new Error("Unauthorized");

    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [user_id]
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    if (role !== "admin") {
      condition = `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    const [rows] = await db.query(
      `
      SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.due_date,

        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        c.name AS customer_name,
        c.phone,

        CASE 
          WHEN i.due_date < CURDATE() THEN 1
          WHEN i.due_date = CURDATE() THEN 2
          ELSE 3
        END AS priority,

        DATEDIFF(CURDATE(), i.due_date) AS days_overdue

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id

      LEFT JOIN (
        SELECT installment_id, SUM(allocated_amount) AS total_paid
        FROM chit_payment_allocations
        GROUP BY installment_id
      ) p ON p.installment_id = i.id

      WHERE (i.installment_amount - IFNULL(p.total_paid,0)) > 0
      ${condition}

      ORDER BY priority ASC, i.due_date ASC
      `,
      params
    );

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};



