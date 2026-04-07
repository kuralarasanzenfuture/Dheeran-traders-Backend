import db from "../../../config/db.js";

const admin = "ADMIN";

export const getTodayDueSummary = async (req, res) => {
  try {
    // const [rows] = await db.query(`
    //   SELECT
    //     COUNT(i.id) AS total_installments,
    //     SUM(i.installment_amount) AS total_due_amount

    //   FROM chit_customer_installments i

    //   WHERE DATE(i.due_date) = CURDATE()
    // `);

    const [rows] = await db.query(`
  SELECT 
    COUNT(i.id) AS total_installments,
    SUM(i.installment_amount) AS total_due_amount

  FROM chit_customer_installments i

  WHERE i.due_date >= CURDATE()
    AND i.due_date < CURDATE() + INTERVAL 1 DAY
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
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// associated with collector
// export const getCollectorDueList = async (req, res) => {
//   try {
//     const user_id = req.user?.id;

//     if (!user_id) throw new Error("Unauthorized");

//     const [roleRow] = await db.query(
//       `SELECT r.role_name
//        FROM users_roles u
//        JOIN role_based r ON r.id = u.role_id
//        WHERE u.id = ?`,
//       [user_id],
//     );

//     const role = roleRow[0]?.role_name;

//     let condition = "";
//     let params = [];

//     if (role !== "ADMIN") {
//       condition = `
//         AND s.customer_id IN (
//           SELECT customer_id
//           FROM user_chit_customer_assignments
//           WHERE user_id = ? AND is_active = TRUE
//         )
//       `;
//       params.push(user_id);
//     }

//     const [rows] = await db.query(
//       `
//       SELECT
//         i.id AS installment_id,
//         i.installment_number,
//         i.due_date,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,

//         b.batch_name,
//         p2.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
//       JOIN chit_customers c ON c.id = s.customer_id
//       JOIN batches b ON b.id = s.batch_id
//       JOIN plans p2 ON p2.id = s.plan_id

//       LEFT JOIN (
//         SELECT installment_id, SUM(allocated_amount) AS total_paid
//         FROM chit_payment_allocations
//         GROUP BY installment_id
//       ) p ON p.installment_id = i.id

//       WHERE (i.installment_amount - IFNULL(p.total_paid,0)) > 0
//       ${condition}

//       ORDER BY i.due_date ASC
//       `,
//       params,
//     );

//     return res.json({
//       success: true,
//       count: rows.length,
//       data: rows,
//     });
//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// filter by status like paid, pending, overdue, all
// export const getCollectorDueList = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     if (!user_id) throw new Error("Unauthorized");

//     const { status = "all" } = req.query;

//     // 🔹 Get role
//     const [roleRow] = await db.query(
//       `SELECT r.role_name 
//        FROM users_roles u
//        JOIN role_based r ON r.id = u.role_id
//        WHERE u.id = ?`,
//       [user_id],
//     );

//     const role = roleRow[0]?.role_name;

//     let condition = "";
//     let params = [];

//     // 🔹 Restrict collector
//     if (role !== "ADMIN") {
//       condition += `
//         AND s.customer_id IN (
//           SELECT customer_id 
//           FROM user_chit_customer_assignments
//           WHERE user_id = ? AND is_active = TRUE
//         )
//       `;
//       params.push(user_id);
//     }

//     // 🔹 Main query with STATUS
//     let baseQuery = `
//       SELECT
//         i.id AS installment_id,
//         i.subscription_id,
//         i.installment_number,
//         i.due_date,

//         i.installment_amount,
//         IFNULL(p.total_paid,0) AS paid_amount,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         CASE 
//           WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
//           WHEN i.due_date < CURDATE() THEN 'OVERDUE'
//           ELSE 'PENDING'
//         END AS status,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,
//         c.place,
//         c.aadhar,
//         c.pan_number,
//         c.door_no,
//         c.address,
//         c.state,
//         c.district,
//         c.pincode,

//         b.batch_name,
//         p2.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
//       JOIN chit_customers c ON c.id = s.customer_id
//       JOIN batches b ON b.id = s.batch_id
//       JOIN plans p2 ON p2.id = s.plan_id

//       LEFT JOIN (
//         SELECT installment_id, SUM(allocated_amount) AS total_paid
//         FROM chit_payment_allocations
//         GROUP BY installment_id
//       ) p ON p.installment_id = i.id

//       WHERE 1=1
//       ${condition}
//     `;

//     // 🔹 Status filter
//     if (status !== "all") {
//       baseQuery += `
//         HAVING status = ?
//       `;
//       params.push(status.toUpperCase());
//     }

//     baseQuery += ` ORDER BY i.due_date ASC`;

//     const [rows] = await db.query(baseQuery, params);

//     // 🔹 Summary
//     const summary = {
//       total: rows.length,
//       paid: rows.filter((r) => r.status === "PAID").length,
//       pending: rows.filter((r) => r.status === "PENDING").length,
//       overdue: rows.filter((r) => r.status === "OVERDUE").length,
//     };

//     console.table(rows);

//     return res.json({
//       success: true,
//       filter: status,
//       summary,
//       data: rows,
//     });
//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// add payment breakdown upi, cheque, cash
// export const getCollectorDueList = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     if (!user_id) throw new Error("Unauthorized");

//     const { status = "all" } = req.query;

//     // 🔹 Get role
//     const [roleRow] = await db.query(
//       `SELECT r.role_name 
//        FROM users_roles u
//        JOIN role_based r ON r.id = u.role_id
//        WHERE u.id = ?`,
//       [user_id]
//     );

//     const role = roleRow[0]?.role_name;

//     let condition = "";
//     let params = [];

//     // 🔹 Restrict collector
//     if (role !== "ADMIN") {
//       condition += `
//         AND s.customer_id IN (
//           SELECT customer_id 
//           FROM user_chit_customer_assignments
//           WHERE user_id = ? AND is_active = TRUE
//         )
//       `;
//       params.push(user_id);
//     }

//     // 🔥 MAIN QUERY (WITH PAYMENT BREAKDOWN)
//     let baseQuery = `
//       SELECT
//         i.id AS installment_id,
//         i.subscription_id,
//         i.installment_number,
//         i.due_date,

//         i.installment_amount,

//         IFNULL(p.total_paid,0) AS paid_amount,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         -- ✅ Payment mode split (accurate)
//         IFNULL(p.total_upi,0) AS upi_amount,
//         IFNULL(p.total_cash,0) AS cash_amount,
//         IFNULL(p.total_cheque,0) AS cheque_amount,

//         CASE 
//           WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
//           WHEN i.due_date < CURDATE() THEN 'OVERDUE'
//           ELSE 'PENDING'
//         END AS status,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,
//         c.place,
//         c.aadhar,
//         c.pan_number,
//         c.door_no,
//         c.address,
//         c.state,
//         c.district,
//         c.pincode,

//         b.batch_name,
//         p2.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
//       JOIN chit_customers c ON c.id = s.customer_id
//       JOIN batches b ON b.id = s.batch_id
//       JOIN plans p2 ON p2.id = s.plan_id

//       -- 🔥 PAYMENT JOIN (IMPORTANT)
//       LEFT JOIN (
//         SELECT 
//           pa.installment_id,

//           SUM(pa.allocated_amount) AS total_paid,

//           -- ✅ Proportional split (accurate)
//           SUM((cp.pay_upi * pa.allocated_amount) / cp.total_amount) AS total_upi,
//           SUM((cp.pay_cash * pa.allocated_amount) / cp.total_amount) AS total_cash,
//           SUM((cp.pay_cheque * pa.allocated_amount) / cp.total_amount) AS total_cheque

//         FROM chit_payment_allocations pa

//         JOIN chit_collections_payments cp 
//           ON cp.id = pa.payment_id

//         GROUP BY pa.installment_id
//       ) p ON p.installment_id = i.id

//       WHERE 1=1
//       ${condition}
//     `;

//     // 🔹 Status filter
//     if (status !== "all") {
//       baseQuery += ` HAVING status = ? `;
//       params.push(status.toUpperCase());
//     }

//     baseQuery += ` ORDER BY i.due_date ASC`;

//     const [rows] = await db.query(baseQuery, params);

//     // 🔹 Summary
//     const summary = {
//       total: rows.length,
//       paid: rows.filter(r => r.status === "PAID").length,
//       pending: rows.filter(r => r.status === "PENDING").length,
//       overdue: rows.filter(r => r.status === "OVERDUE").length,

//       total_amount: rows.reduce((sum, r) => sum + Number(r.installment_amount), 0),
//       total_paid: rows.reduce((sum, r) => sum + Number(r.paid_amount), 0),
//       total_pending: rows.reduce((sum, r) => sum + Number(r.pending_amount), 0),

//       total_upi: rows.reduce((sum, r) => sum + Number(r.upi_amount), 0),
//       total_cash: rows.reduce((sum, r) => sum + Number(r.cash_amount), 0),
//       total_cheque: rows.reduce((sum, r) => sum + Number(r.cheque_amount), 0)
//     };

//     return res.json({
//       success: true,
//       filter: status,
//       summary,
//       data: rows
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

export const getCollectorDueList = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    const { status = "all" } = req.query;

    // 🔹 Get role
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

    // 🔹 Restrict collector
    if (role !== "ADMIN") {
      condition += `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    // 🔥 MAIN QUERY
    let baseQuery = `
      SELECT
        i.id AS installment_id,
        i.subscription_id,
        i.installment_number,
        i.due_date,

        i.installment_amount,

        IFNULL(p.total_paid,0) AS paid_amount,

        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        -- ✅ Payment mode split
        IFNULL(p.total_upi,0) AS upi_amount,
        IFNULL(p.total_cash,0) AS cash_amount,
        IFNULL(p.total_cheque,0) AS cheque_amount,

        -- ✅ UPI References (fixed)
        IFNULL(p.upi_references, '') AS upi_references,

        CASE 
          WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
          WHEN i.due_date < CURDATE() THEN 'OVERDUE'
          ELSE 'PENDING'
        END AS status,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.aadhar,
        c.pan_number,
        c.door_no,
        c.address,
        c.state,
        c.district,
        c.pincode,

        b.batch_name,
        p2.plan_name

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id
      JOIN batches b ON b.id = s.batch_id
      JOIN plans p2 ON p2.id = s.plan_id

      -- 🔥 PAYMENT SUBQUERY (FULL FIX)
      LEFT JOIN (
        SELECT 
          pa.installment_id,

          SUM(pa.allocated_amount) AS total_paid,

          -- ✅ Proportional split (safe)
          SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_upi,
          SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_cash,
          SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_cheque,

          -- ✅ UPI references (correct place)
          GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references

        FROM chit_payment_allocations pa

        JOIN chit_collections_payments cp 
          ON cp.id = pa.payment_id

        GROUP BY pa.installment_id
      ) p ON p.installment_id = i.id

      WHERE 1=1
      ${condition}
    `;

    // 🔹 Status filter
    if (status !== "all") {
      baseQuery += ` HAVING status = ? `;
      params.push(status.toUpperCase());
    }

    baseQuery += ` ORDER BY i.due_date ASC`;

    const [rows] = await db.query(baseQuery, params);

    // 🔹 Format UPI references as array
    const formattedRows = rows.map(row => ({
      ...row,
      upi_references: row.upi_references
        ? row.upi_references.split(",")
        : []
    }));

    // 🔹 Summary
    const summary = {
      total: formattedRows.length,
      paid: formattedRows.filter(r => r.status === "PAID").length,
      pending: formattedRows.filter(r => r.status === "PENDING").length,
      overdue: formattedRows.filter(r => r.status === "OVERDUE").length,

      total_amount: formattedRows.reduce((sum, r) => sum + Number(r.installment_amount), 0),
      total_paid: formattedRows.reduce((sum, r) => sum + Number(r.paid_amount), 0),
      total_pending: formattedRows.reduce((sum, r) => sum + Number(r.pending_amount), 0),

      total_upi: formattedRows.reduce((sum, r) => sum + Number(r.upi_amount), 0),
      total_cash: formattedRows.reduce((sum, r) => sum + Number(r.cash_amount), 0),
      total_cheque: formattedRows.reduce((sum, r) => sum + Number(r.cheque_amount), 0)
    };

    return res.json({
      success: true,
      filter: status,
      summary,
      data: formattedRows
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};


// export const getCollectorDueListTree = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     if (!user_id) throw new Error("Unauthorized");

//     const { status = "all" } = req.query;

//     // 🔹 Get role
//     const [roleRow] = await db.query(
//       `SELECT r.role_name
//        FROM users_roles u
//        JOIN role_based r ON r.id = u.role_id
//        WHERE u.id = ?`,
//       [user_id]
//     );

//     const role = roleRow[0]?.role_name;

//     let condition = "";
//     let params = [];

//     // 🔹 Restrict collector
//     if (role !== "ADMIN") {
//       condition += `
//         AND s.customer_id IN (
//           SELECT customer_id
//           FROM user_chit_customer_assignments
//           WHERE user_id = ? AND is_active = TRUE
//         )
//       `;
//       params.push(user_id);
//     }

//     // 🔹 Main query (FLAT DATA)
//     let query = `
//       SELECT
//         i.id AS installment_id,
//         i.subscription_id,
//         i.installment_number,
//         i.due_date,

//         i.installment_amount,
//         IFNULL(p.total_paid,0) AS paid_amount,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         CASE
//           WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
//           WHEN i.due_date < CURDATE() THEN 'OVERDUE'
//           ELSE 'PENDING'
//         END AS status,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,

//         b.batch_name,
//         p2.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
//       JOIN chit_customers c ON c.id = s.customer_id
//       JOIN batches b ON b.id = s.batch_id
//       JOIN plans p2 ON p2.id = s.plan_id

//       LEFT JOIN (
//         SELECT installment_id, SUM(allocated_amount) AS total_paid
//         FROM chit_payment_allocations
//         GROUP BY installment_id
//       ) p ON p.installment_id = i.id

//       WHERE 1=1
//       ${condition}
//     `;

//     // 🔹 Status filter
//     if (status !== "all") {
//       query += ` HAVING status = ?`;
//       params.push(status.toUpperCase());
//     }

//     query += ` ORDER BY i.subscription_id, i.due_date ASC`;

//     const [rows] = await db.query(query, params);

//     // 🔥 🔥 🔥 TREE STRUCTURE BUILD (MAIN LOGIC)

//     const grouped = {};

//     for (const row of rows) {
//       const subId = row.subscription_id;

//       if (!grouped[subId]) {
//         grouped[subId] = {
//           subscription_id: subId,

//           customer: {
//             id: row.customer_id,
//             name: row.customer_name,
//             phone: row.phone,
//           },

//           batch_name: row.batch_name,
//           plan_name: row.plan_name,

//           summary: {
//             total_installments: 0,
//             paid: 0,
//             pending: 0,
//             overdue: 0,
//           },

//           installments: [],
//         };
//       }

//       // 🔹 Add installment
//       grouped[subId].installments.push({
//         installment_id: row.installment_id,
//         installment_number: row.installment_number,
//         due_date: row.due_date,
//         installment_amount: row.installment_amount,
//         paid_amount: row.paid_amount,
//         pending_amount: row.pending_amount,
//         status: row.status,
//       });

//       // 🔹 Update summary
//       grouped[subId].summary.total_installments++;

//       if (row.status === "PAID") grouped[subId].summary.paid++;
//       else if (row.status === "PENDING") grouped[subId].summary.pending++;
//       else if (row.status === "OVERDUE") grouped[subId].summary.overdue++;
//     }

//     // 🔹 Convert object → array
//     const result = Object.values(grouped);

//     // console.table(result);

//     return res.json({
//       success: true,
//       filter: status,
//       count: result.length,
//       data: result,
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// customer multiple installment due list
// export const getCollectorDueListTree = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     if (!user_id) throw new Error("Unauthorized");

//     const { status = "all" } = req.query;

//     // 🔹 Get role
//     const [roleRow] = await db.query(
//       `SELECT r.role_name 
//        FROM users_roles u
//        JOIN role_based r ON r.id = u.role_id
//        WHERE u.id = ?`,
//       [user_id],
//     );

//     const role = roleRow[0]?.role_name;

//     let condition = "";
//     let params = [];

//     // 🔹 Restrict collector access
//     if (role !== "ADMIN") {
//       condition += `
//         AND s.customer_id IN (
//           SELECT customer_id 
//           FROM user_chit_customer_assignments
//           WHERE user_id = ? AND is_active = TRUE
//         )
//       `;
//       params.push(user_id);
//     }

//     // 🔹 Main query (flat data)
//     let query = `
//       SELECT
//         i.id AS installment_id,
//         i.subscription_id,
//         i.installment_number,
//         i.due_date,

//         i.installment_amount,
//         IFNULL(p.total_paid,0) AS paid_amount,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         CASE 
//           WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
//           WHEN i.due_date < CURDATE() THEN 'OVERDUE'
//           ELSE 'PENDING'
//         END AS status,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,
//         c.place,
//         c.aadhar,
//         c.pan_number,
//         c.door_no,
//         c.address,
//         c.state,
//         c.district,
//         c.pincode,


//         b.batch_name,
//         p2.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
//       JOIN chit_customers c ON c.id = s.customer_id
//       JOIN batches b ON b.id = s.batch_id
//       JOIN plans p2 ON p2.id = s.plan_id

//       LEFT JOIN (
//         SELECT installment_id, SUM(allocated_amount) AS total_paid
//         FROM chit_payment_allocations
//         GROUP BY installment_id
//       ) p ON p.installment_id = i.id

//       WHERE 1=1
//       ${condition}
//     `;

//     // 🔹 Status filter
//     if (status !== "all") {
//       query += ` HAVING status = ?`;
//       params.push(status.toUpperCase());
//     }

//     query += ` ORDER BY c.id, i.subscription_id, i.due_date ASC`;

//     const [rows] = await db.query(query, params);

//     // 🔥 TREE BUILD (Customer → Subscription → Installments)

//     const customers = {};

//     for (const row of rows) {
//       const custId = row.customer_id;
//       const subId = row.subscription_id;

//       // 🔹 Create customer
//       if (!customers[custId]) {
//         customers[custId] = {
//           customer_id: custId,
//           customer_name: row.customer_name,
//           phone: row.phone,
//           place: row.place,
//           aadhar: row.aadhar,
//           pan_number: row.pan_number,
//           door_no: row.door_no,
//           address: row.address,
//           state: row.state,
//           district: row.district,
//           pincode: row.pincode,

//           summary: {
//             total_subscriptions: 0,
//             total_installments: 0,
//             paid: 0,
//             pending: 0,
//             overdue: 0,
//           },

//           subscriptions: {},
//         };
//       }

//       const customer = customers[custId];

//       // 🔹 Create subscription
//       if (!customer.subscriptions[subId]) {
//         customer.subscriptions[subId] = {
//           subscription_id: subId,
//           batch_name: row.batch_name,
//           plan_name: row.plan_name,

//           summary: {
//             total_installments: 0,
//             paid: 0,
//             pending: 0,
//             overdue: 0,
//           },

//           installments: [],
//         };

//         customer.summary.total_subscriptions++;
//       }

//       const subscription = customer.subscriptions[subId];

//       // 🔹 Add installment
//       subscription.installments.push({
//         installment_id: row.installment_id,
//         installment_number: row.installment_number,
//         due_date: row.due_date,
//         installment_amount: row.installment_amount,
//         paid_amount: row.paid_amount,
//         pending_amount: row.pending_amount,
//         status: row.status,
//       });

//       // 🔹 Subscription summary
//       subscription.summary.total_installments++;

//       if (row.status === "PAID") subscription.summary.paid++;
//       else if (row.status === "PENDING") subscription.summary.pending++;
//       else if (row.status === "OVERDUE") subscription.summary.overdue++;

//       // 🔹 Customer summary
//       customer.summary.total_installments++;

//       if (row.status === "PAID") customer.summary.paid++;
//       else if (row.status === "PENDING") customer.summary.pending++;
//       else if (row.status === "OVERDUE") customer.summary.overdue++;
//     }

//     // 🔹 Convert to final array
//     const result = Object.values(customers).map((cust) => ({
//       ...cust,
//       subscriptions: Object.values(cust.subscriptions),
//     }));

//     return res.json({
//       success: true,
//       filter: status,
//       count: result.length,
//       data: result,
//     });
//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// add fields upi, cheque, cash

export const getCollectorDueListTree = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    const { status = "all" } = req.query;

    // 🔹 Get role
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

    // 🔹 Restrict collector access
    if (role !== "ADMIN") {
      condition += `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    // 🔥 MAIN QUERY (WITH PAYMENT BREAKDOWN)
    let query = `
      SELECT
        i.id AS installment_id,
        i.subscription_id,
        i.installment_number,
        i.due_date,

        i.installment_amount,

        IFNULL(p.total_paid,0) AS paid_amount,
        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        -- ✅ Payment split
        IFNULL(p.total_upi,0) AS upi_amount,
        IFNULL(p.total_cash,0) AS cash_amount,
        IFNULL(p.total_cheque,0) AS cheque_amount,

        -- ✅ UPI refs
        IFNULL(p.upi_references,'') AS upi_references,

        CASE 
          WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
          WHEN i.due_date < CURDATE() THEN 'OVERDUE'
          ELSE 'PENDING'
        END AS status,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.aadhar,
        c.pan_number,
        c.door_no,
        c.address,
        c.state,
        c.district,
        c.pincode,

        b.batch_name,
        p2.plan_name

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
      JOIN chit_customers c ON c.id = s.customer_id
      JOIN batches b ON b.id = s.batch_id
      JOIN plans p2 ON p2.id = s.plan_id

      -- 🔥 PAYMENT SUBQUERY
      LEFT JOIN (
        SELECT 
          pa.installment_id,

          SUM(pa.allocated_amount) AS total_paid,

          SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_upi,
          SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_cash,
          SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_cheque,

          GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references

        FROM chit_payment_allocations pa

        JOIN chit_collections_payments cp 
          ON cp.id = pa.payment_id

        GROUP BY pa.installment_id
      ) p ON p.installment_id = i.id

      WHERE 1=1
      ${condition}
    `;

    // 🔹 Status filter
    if (status !== "all") {
      query += ` HAVING status = ?`;
      params.push(status.toUpperCase());
    }

    query += ` ORDER BY c.id, i.subscription_id, i.due_date ASC`;

    const [rows] = await db.query(query, params);

    // 🔥 TREE BUILD

    const customers = {};

    for (const row of rows) {
      const custId = row.customer_id;
      const subId = row.subscription_id;

      // 🔹 Format UPI refs
      const upiRefs = row.upi_references
        ? row.upi_references.split(",")
        : [];

      // 🔹 Create customer
      if (!customers[custId]) {
        customers[custId] = {
          customer_id: custId,
          customer_name: row.customer_name,
          phone: row.phone,
          place: row.place,
          aadhar: row.aadhar,
          pan_number: row.pan_number,
          door_no: row.door_no,
          address: row.address,
          state: row.state,
          district: row.district,
          pincode: row.pincode,

          summary: {
            total_subscriptions: 0,
            total_installments: 0,
            paid: 0,
            pending: 0,
            overdue: 0,
            total_amount: 0,
            total_paid: 0,
            total_pending: 0,
            total_upi: 0,
            total_cash: 0,
            total_cheque: 0
          },

          subscriptions: {},
        };
      }

      const customer = customers[custId];

      // 🔹 Create subscription
      if (!customer.subscriptions[subId]) {
        customer.subscriptions[subId] = {
          subscription_id: subId,
          batch_name: row.batch_name,
          plan_name: row.plan_name,

          summary: {
            total_installments: 0,
            paid: 0,
            pending: 0,
            overdue: 0,
            total_amount: 0,
            total_paid: 0,
            total_pending: 0
          },

          installments: [],
        };

        customer.summary.total_subscriptions++;
      }

      const subscription = customer.subscriptions[subId];

      // 🔹 Add installment
      subscription.installments.push({
        installment_id: row.installment_id,
        installment_number: row.installment_number,
        due_date: row.due_date,
        installment_amount: row.installment_amount,
        paid_amount: row.paid_amount,
        pending_amount: row.pending_amount,
        upi_amount: row.upi_amount,
        cash_amount: row.cash_amount,
        cheque_amount: row.cheque_amount,
        upi_references: upiRefs,
        status: row.status,
      });

      // 🔹 Subscription summary
      subscription.summary.total_installments++;
      subscription.summary.total_amount += Number(row.installment_amount);
      subscription.summary.total_paid += Number(row.paid_amount);
      subscription.summary.total_pending += Number(row.pending_amount);

      if (row.status === "PAID") subscription.summary.paid++;
      else if (row.status === "PENDING") subscription.summary.pending++;
      else if (row.status === "OVERDUE") subscription.summary.overdue++;

      // 🔹 Customer summary
      customer.summary.total_installments++;
      customer.summary.total_amount += Number(row.installment_amount);
      customer.summary.total_paid += Number(row.paid_amount);
      customer.summary.total_pending += Number(row.pending_amount);

      customer.summary.total_upi += Number(row.upi_amount);
      customer.summary.total_cash += Number(row.cash_amount);
      customer.summary.total_cheque += Number(row.cheque_amount);

      if (row.status === "PAID") customer.summary.paid++;
      else if (row.status === "PENDING") customer.summary.pending++;
      else if (row.status === "OVERDUE") customer.summary.overdue++;
    }

    const result = Object.values(customers).map((cust) => ({
      ...cust,
      subscriptions: Object.values(cust.subscriptions),
    }));

    return res.json({
      success: true,
      filter: status,
      count: result.length,
      data: result,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getCollectorDueListByDate = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    const { type = "all" } = req.query;

    // 🔹 Get role
    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [user_id],
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    // 🔹 Restrict collector data
    if (role !== "ADMIN") {
      condition += `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    // 🔹 Date filter (REAL FIX)
    let dateFilter = "";

    if (type === "today") {
      dateFilter = `
        AND i.due_date >= CURDATE()
        AND i.due_date < CURDATE() + INTERVAL 1 DAY
      `;
    } else if (type === "overdue") {
      dateFilter = `
        AND i.due_date < CURDATE()
      `;
    } else if (type === "upcoming") {
      dateFilter = `
        AND i.due_date >= CURDATE() + INTERVAL 1 DAY
      `;
    }
    // else "all" → no filter

    // 🔹 Main query
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
      ${dateFilter}
      ${condition}

      ORDER BY i.due_date ASC
      `,
      params,
    );

    // 🔹 Summary (don’t skip this, it's useful)
    const totalPending = rows.reduce(
      (sum, r) => sum + Number(r.pending_amount),
      0,
    );

    return res.json({
      success: true,
      filter: type,
      count: rows.length,
      total_pending_amount: totalPending,
      data: rows,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// export const getCollectorDueListByDate = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     if (!user_id) throw new Error("Unauthorized");

//     const { date } = req.params;

//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: "Date is required",
//       });
//     }

//     // 🔹 Get role
//     const [roleRow] = await db.query(
//       `SELECT r.role_name
//        FROM users_roles u
//        JOIN role_based r ON r.id = u.role_id
//        WHERE u.id = ?`,
//       [user_id]
//     );

//     const role = roleRow[0]?.role_name;

//     let condition = "";
//     let params = [date, date];

//     // 🔹 Restrict collector data
//     if (role !== "ADMIN") {
//       condition += `
//         AND s.customer_id IN (
//           SELECT customer_id
//           FROM user_chit_customer_assignments
//           WHERE user_id = ? AND is_active = TRUE
//         )
//       `;
//       params.push(user_id);
//     }

//     // 🔹 Main query (STRICT DATE FILTER)
//     const [rows] = await db.query(
//       `
//       SELECT
//         i.id AS installment_id,
//         i.installment_number,
//         i.due_date,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,

//         b.batch_name,
//         p2.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s ON s.id = i.subscription_id
//       JOIN chit_customers c ON c.id = s.customer_id
//       JOIN batches b ON b.id = s.batch_id
//       JOIN plans p2 ON p2.id = s.plan_id

//       LEFT JOIN (
//         SELECT installment_id, SUM(allocated_amount) AS total_paid
//         FROM chit_payment_allocations
//         GROUP BY installment_id
//       ) p ON p.installment_id = i.id

//       WHERE (i.installment_amount - IFNULL(p.total_paid,0)) > 0
//         AND i.due_date >= ?
//         AND i.due_date < DATE_ADD(?, INTERVAL 1 DAY)
//         ${condition}

//       ORDER BY i.due_date ASC
//       `,
//       params
//     );

//     const totalPending = rows.reduce(
//       (sum, r) => sum + Number(r.pending_amount),
//       0
//     );

//     return res.json({
//       success: true,
//       date,
//       count: rows.length,
//       total_pending_amount: totalPending,
//       data: rows,
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const getCollectorDueListByDateandTypeandRange = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    let { type = "all", date, from, to } = req.query; // 🔹 PRIORITY BASED

    // 🔹 Get role
    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [user_id],
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    // 🔹 Collector restriction
    if (role !== "ADMIN") {
      condition += `
        AND s.customer_id IN (
          SELECT customer_id 
          FROM user_chit_customer_assignments
          WHERE user_id = ? AND is_active = TRUE
        )
      `;
      params.push(user_id);
    }

    // 🔹 Date filter logic (PRIORITY BASED)
    let dateFilter = "";

    if (date) {
      // exact date
      dateFilter = `
        AND i.due_date >= ?
        AND i.due_date < DATE_ADD(?, INTERVAL 1 DAY)
      `;
      params.unshift(date, date);
    } else if (from && to) {
      // range
      dateFilter = `
        AND i.due_date >= ?
        AND i.due_date < DATE_ADD(?, INTERVAL 1 DAY)
      `;
      params.unshift(from, to);
    } else {
      // type-based
      if (type === "today") {
        dateFilter = `
          AND i.due_date >= CURDATE()
          AND i.due_date < CURDATE() + INTERVAL 1 DAY
        `;
      } else if (type === "overdue") {
        dateFilter = `AND i.due_date < CURDATE()`;
      } else if (type === "upcoming") {
        dateFilter = `AND i.due_date >= CURDATE() + INTERVAL 1 DAY`;
      }
    }

    // 🔹 Query
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
      ${dateFilter}
      ${condition}

      ORDER BY i.due_date ASC
      `,
      params,
    );

    const totalPending = rows.reduce(
      (sum, r) => sum + Number(r.pending_amount),
      0,
    );

    return res.json({
      success: true,
      filter: { type, date, from, to },
      count: rows.length,
      total_pending_amount: totalPending,
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
      [user_id],
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    if (role !== "ADMIN") {
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
      params,
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
      [user_id],
    );

    const role = roleRow[0]?.role_name;

    let condition = "";
    let params = [];

    if (role !== "ADMIN") {
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
      params,
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
