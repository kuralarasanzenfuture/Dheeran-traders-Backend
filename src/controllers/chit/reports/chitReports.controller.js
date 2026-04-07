import db from "../../../config/db.js";

export const getBatchReport = async (req, res) => {
  try {
    const query = `
            SELECT 
                b.id AS batch_id,
                b.batch_name,
                p.plan_name,
                b.start_date,
                b.end_date,

                COUNT(DISTINCT s.id) AS total_members,

                COALESCE(SUM(s.investment_amount), 0) AS total_investment,

                COALESCE(SUM(pay.total_amount), 0) AS total_collected,

                COUNT(DISTINCT inst.id) AS total_installments,
                
                COUNT(DISTINCT pa.installment_id) AS installments_done,

                CASE 
                    WHEN b.end_date >= CURDATE() THEN 'OnGoing'
                    ELSE 'Completed'
                END AS status

            FROM batches b

            LEFT JOIN chit_customer_subscriptions s 
                ON s.batch_id = b.id

            LEFT JOIN plans p 
                ON p.id = s.plan_id

            LEFT JOIN chit_customer_installments inst 
                ON inst.subscription_id = s.id

            LEFT JOIN chit_payment_allocations pa 
                ON pa.installment_id = inst.id

            LEFT JOIN chit_collections_payments pay 
                ON pay.id = pa.payment_id

            GROUP BY b.id, p.plan_name, b.start_date, b.end_date
            ORDER BY b.id DESC
        `;

    const [rows] = await db.query(query);

    const formattedData = rows.map((row) => ({
      batch_id: row.batch_id,
      batch_name: row.batch_name,
      plan: row.plan_name,
      start_date: row.start_date,
      end_date: row.end_date,
      members: row.total_members,
      total_investment: row.total_investment,
      total_collected: row.total_collected,
      installments: `${row.installments_done}/${row.total_installments}`,
      status: row.status,
    }));

    return res.status(200).json({
      success: true,
      message: "Batch report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error("Batch Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAgentStaffReport = async (req, res) => {
  try {
    const query = `
            SELECT 
                a.id AS agent_staff_id,
                a.name AS agent_name,
                a.phone AS agent_phone,
                a.reference_mode,
                a.status,

                c.id AS customer_id,
                c.name AS customer_name,
                c.phone AS customer_phone,

                s.id AS subscription_id,
                s.investment_amount

            FROM chit_agent_and_staff a

            LEFT JOIN chit_customer_subscriptions s 
                ON s.agent_staff_id = a.id

            LEFT JOIN chit_customers c 
                ON c.id = s.customer_id

            ORDER BY a.id DESC
        `;

    const [rows] = await db.query(query);

    // ✅ Grouping Logic
    const result = {};

    rows.forEach((row) => {
      if (!result[row.agent_staff_id]) {
        result[row.agent_staff_id] = {
          agent_staff_id: row.agent_staff_id,
          name: row.agent_name,
          mobile: row.agent_phone,
          reference_type: row.reference_mode,
          status: row.status === "active" ? "Active" : "Inactive",
          total_referrals: 0,
          total_chit_value: 0,
          customers: [],
        };
      }

      // If customer exists
      if (row.customer_id) {
        result[row.agent_staff_id].customers.push({
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          mobile: row.customer_phone,
          investment_amount: row.investment_amount,
        });

        result[row.agent_staff_id].total_referrals += 1;
        result[row.agent_staff_id].total_chit_value += Number(
          row.investment_amount || 0,
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Agent/Staff report with customers fetched successfully",
      data: Object.values(result),
    });
  } catch (error) {
    console.error("Agent/Staff Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getCustomerReport = async (req, res) => {
  try {
    const query = `
            SELECT 
                c.id AS customer_id,
                c.name AS customer_name,
                c.phone,

                s.id AS subscription_id,
                s.investment_amount,
                s.start_date,
                s.end_date,

                b.batch_name,
                p.plan_name

            FROM chit_customers c

            LEFT JOIN chit_customer_subscriptions s 
                ON s.customer_id = c.id

            LEFT JOIN batches b 
                ON b.id = s.batch_id

            LEFT JOIN plans p 
                ON p.id = s.plan_id

            ORDER BY c.id DESC
        `;

    const [rows] = await db.query(query);

    // ✅ Grouping
    const result = {};

    rows.forEach((row) => {
      if (!result[row.customer_id]) {
        result[row.customer_id] = {
          customer_id: row.customer_id,
          name: row.customer_name,
          mobile: row.phone,
          total_subscriptions: 0,
          total_investment: 0,
          subscriptions: [],
        };
      }

      // If subscription exists
      if (row.subscription_id) {
        result[row.customer_id].subscriptions.push({
          subscription_id: row.subscription_id,
          batch_name: row.batch_name,
          plan_name: row.plan_name,
          start_date: row.start_date,
          end_date: row.end_date,
          investment_amount: row.investment_amount,
        });

        result[row.customer_id].total_subscriptions += 1;
        result[row.customer_id].total_investment += Number(
          row.investment_amount || 0,
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Customer report fetched successfully",
      data: Object.values(result),
    });
  } catch (error) {
    console.error("Customer Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getPlanReport = async (req, res) => {
  try {
    const query = `
            SELECT 
                p.id AS plan_id,
                p.plan_name,
                p.collection_type,
                p.total_installments,

                s.id AS subscription_id,
                s.investment_amount,
                s.start_date,
                s.end_date,

                c.id AS customer_id,
                c.name AS customer_name,
                c.phone,

                b.batch_name

            FROM plans p

            LEFT JOIN chit_customer_subscriptions s 
                ON s.plan_id = p.id

            LEFT JOIN chit_customers c 
                ON c.id = s.customer_id

            LEFT JOIN batches b 
                ON b.id = s.batch_id

            ORDER BY p.id DESC
        `;

    const [rows] = await db.query(query);

    // ✅ Grouping
    const result = {};

    rows.forEach((row) => {
      if (!result[row.plan_id]) {
        result[row.plan_id] = {
          plan_id: row.plan_id,
          plan_name: row.plan_name,
          collection_type: row.collection_type,
          total_installments: row.total_installments,
          total_subscriptions: 0,
          total_investment: 0,
          subscriptions: [],
        };
      }

      // If subscription exists
      if (row.subscription_id) {
        result[row.plan_id].subscriptions.push({
          subscription_id: row.subscription_id,
          customer_name: row.customer_name,
          mobile: row.phone,
          batch_name: row.batch_name,
          start_date: row.start_date,
          end_date: row.end_date,
          investment_amount: row.investment_amount,
        });

        result[row.plan_id].total_subscriptions += 1;
        result[row.plan_id].total_investment += Number(
          row.investment_amount || 0,
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Plan report fetched successfully",
      data: Object.values(result),
    });
  } catch (error) {
    console.error("Plan Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAssignedCustomerReport = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id AS user_id,
        u.username AS user_name,
        u.phone AS user_phone,
        u.email AS user_email,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.place,
        c.aadhar,
        c.pan_number,
        c.door_no,
        c.address,
        c.state,
        c.district,
        c.pincode,

        ucca.assigned_at,
        ucca.is_active

      FROM user_chit_customer_assignments ucca

      LEFT JOIN users_roles u 
        ON u.id = ucca.user_id

      LEFT JOIN chit_customers c 
        ON c.id = ucca.customer_id

      ORDER BY u.id DESC
    `;

    const [rows] = await db.query(query);

    // ✅ Grouping
    const result = {};

    rows.forEach((row) => {
      if (!result[row.user_id]) {
        result[row.user_id] = {
          user_id: row.user_id,
          name: row.user_name,
          mobile: row.user_phone,
          total_customers: 0,
          customers: [],
        };
      }

      if (row.customer_id) {
        result[row.user_id].customers.push({
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          mobile: row.customer_phone,
          place: row.place,
          aadharno: row.aadhar,
          panno: row.pan_number,
          door_no: row.door_no,
          address: row.address,
          state: row.state,
          district: row.district,
          pincode: row.pincode,
          assigned_at: row.assigned_at,
          status: row.is_active ? "Active" : "Inactive",
        });

        result[row.user_id].total_customers += 1;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Assigned customer report fetched successfully",
      data: Object.values(result),
    });
  } catch (error) {
    console.error("Assigned Customer Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error" || error.message,
    });
  }
};

// export const getCollectionReport = async (req, res) => {
//   try {
//     const { date } = req.query;

//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: "Date is required"
//       });
//     }

//     const [rows] = await db.query(`
//       SELECT
//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,
//         c.address,

//         u.username AS collector_name,

//         b.batch_name,
//         p.plan_name,

//         i.installment_number,
//         i.due_date,

//         -- ✅ Payment info
//         SUM(pa.allocated_amount) AS total_paid,

//         SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS cash_amount,
//         SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS upi_amount,
//         SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS cheque_amount,

//         GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,

//         i.installment_amount,

//         (i.installment_amount - SUM(pa.allocated_amount)) AS pending_amount,

//         MAX(DATE(cp.payment_datetime)) AS paid_date

//       FROM chit_payment_allocations pa

//       JOIN chit_collections_payments cp 
//         ON cp.id = pa.payment_id

//       JOIN chit_customer_installments i 
//         ON i.id = pa.installment_id

//       JOIN chit_customer_subscriptions s 
//         ON s.id = i.subscription_id

//       JOIN chit_customers c 
//         ON c.id = s.customer_id

//       JOIN batches b 
//         ON b.id = s.batch_id

//       JOIN plans p 
//         ON p.id = s.plan_id

//       LEFT JOIN users_roles u 
//         ON u.id = cp.collected_by

//       -- ✅ EXACT DATE MATCH
//       WHERE DATE(cp.payment_datetime) = ?

//       GROUP BY 
//         i.id,
//         c.id,
//         u.username,   -- ✅ FIXED
//         b.batch_name,
//         p.plan_name

//       ORDER BY c.id, i.due_date ASC
//     `, [date]);

//     // 🔹 Format response
//     const formatted = rows.map(row => ({
//       customer_id: row.customer_id,
//       customer_name: row.customer_name,
//       phone: row.phone,
//       address: row.address,
//       collector_name: row.collector_name,

//       batch_name: row.batch_name,
//       plan_name: row.plan_name,

//       installment_number: row.installment_number,
//       due_date: row.due_date,

//       installment_amount: Number(row.installment_amount),

//       total_paid: Number(row.total_paid),
//       pending_amount: Number(row.pending_amount),

//       cash_amount: Number(row.cash_amount || 0),
//       upi_amount: Number(row.upi_amount || 0),
//       cheque_amount: Number(row.cheque_amount || 0),

//       upi_references: row.upi_references
//         ? row.upi_references.split(",")
//         : [],

//       paid_date: row.paid_date
//     }));

//     return res.json({
//       success: true,
//       date,
//       count: formatted.length,
//       data: formatted
//     });

//   } catch (err) {
//     console.error("Collection Report Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

export const getCollectionReportDateRange = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "from_date and to_date are required"
      });
    }

    // ✅ Convert to full datetime range
    const fromDateTime = `${from_date} 00:00:00`;
    const toDateTime = `${to_date} 23:59:59`;

    const [rows] = await db.query(`
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.address,

        u.username AS collector_name,
        u.email AS collector_email,
        u.phone AS collector_phone,

        b.batch_name,
        p.plan_name,

        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

        COALESCE(SUM(pa.allocated_amount), 0) AS total_paid,

        COALESCE(SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cash_amount,
        COALESCE(SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS upi_amount,
        COALESCE(SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cheque_amount,

        GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,

        i.installment_amount,

        (i.installment_amount - COALESCE(SUM(pa.allocated_amount), 0)) AS pending_amount,

       -- MAX(DATE(cp.payment_datetime)) AS paid_date
       DATE_FORMAT(MAX(cp.payment_datetime), '%Y-%m-%d') AS paid_date

      FROM chit_payment_allocations pa

      JOIN chit_collections_payments cp 
        ON cp.id = pa.payment_id

      JOIN chit_customer_installments i 
        ON i.id = pa.installment_id

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      JOIN batches b 
        ON b.id = s.batch_id

      JOIN plans p 
        ON p.id = s.plan_id

      LEFT JOIN users_roles u 
        ON u.id = cp.collected_by

      -- ✅ RANGE FILTER (INDEX FRIENDLY)
      WHERE cp.payment_datetime >= ?
      AND cp.payment_datetime <= ?

      GROUP BY 
        i.id,
        c.id,
        u.username,
        b.batch_name,
        p.plan_name

      ORDER BY c.id, i.due_date ASC
    `, [fromDateTime, toDateTime]);

    const formatted = rows.map(row => ({
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      phone: row.phone,
      address: row.address,
      collector_name: row.collector_name,

      batch_name: row.batch_name,
      plan_name: row.plan_name,

      installment_number: row.installment_number,
      due_date: row.due_date,

      installment_amount: Number(row.installment_amount || 0),

      total_paid: Number(row.total_paid || 0),
      pending_amount: Number(row.pending_amount || 0),

      cash_amount: Number(row.cash_amount || 0),
      upi_amount: Number(row.upi_amount || 0),
      cheque_amount: Number(row.cheque_amount || 0),

      upi_references: row.upi_references
        ? row.upi_references.split(",")
        : [],

      paid_date: row.paid_date
    }));

// tree
const customersMap = new Map();

for (const row of rows) {
  const custId = row.customer_id;

  if (!customersMap.has(custId)) {
    customersMap.set(custId, {
      customer_id: custId,
      customer_name: row.customer_name,
      phone: row.phone,
      address: row.address,

      summary: {
        total_amount: 0,
        total_paid: 0,
        total_pending: 0,
        total_cash: 0,
        total_upi: 0,
        total_cheque: 0
      },

      collections: []
    });
  }

  const customer = customersMap.get(custId);

  const installment = {
    collector_name: row.collector_name,
    collector_email: row.collector_email,
    collector_phone: row.collector_phone,

    batch_name: row.batch_name,
    plan_name: row.plan_name,

    installment_number: row.installment_number,
    due_date: row.due_date,
    paid_date: row.paid_date,

    installment_amount: Number(row.installment_amount || 0),

    total_paid: Number(row.total_paid || 0),
    pending_amount: Number(row.pending_amount || 0),

    cash_amount: Number(row.cash_amount || 0),
    upi_amount: Number(row.upi_amount || 0),
    cheque_amount: Number(row.cheque_amount || 0),

    upi_references: row.upi_references
      ? row.upi_references.split(",")
      : []
  };

  customer.collections.push(installment);

  // 🔥 Summary Calculation
  customer.summary.total_amount += installment.installment_amount;
  customer.summary.total_paid += installment.total_paid;
  customer.summary.total_pending += installment.pending_amount;

  customer.summary.total_cash += installment.cash_amount;
  customer.summary.total_upi += installment.upi_amount;
  customer.summary.total_cheque += installment.cheque_amount;
}

const result = Array.from(customersMap.values());


    return res.json({
      success: true,
      from_date,
      to_date,
      count: formatted.length,
    //   data: formatted,
      data: result
    });

  } catch (err) {
    console.error("Collection Report Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getCollectionReport = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.address,

        u.username AS collector_name,
        u.email AS collector_email,
        u.phone AS collector_phone,

        b.batch_name,
        p.plan_name,

        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

        COALESCE(SUM(pa.allocated_amount), 0) AS total_paid,

        COALESCE(SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cash_amount,
        COALESCE(SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS upi_amount,
        COALESCE(SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cheque_amount,

        GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,

        i.installment_amount,

        (i.installment_amount - COALESCE(SUM(pa.allocated_amount), 0)) AS pending_amount,

        DATE_FORMAT(MAX(cp.payment_datetime), '%Y-%m-%d') AS paid_date

      FROM chit_payment_allocations pa

      JOIN chit_collections_payments cp 
        ON cp.id = pa.payment_id

      JOIN chit_customer_installments i 
        ON i.id = pa.installment_id

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      JOIN batches b 
        ON b.id = s.batch_id

      JOIN plans p 
        ON p.id = s.plan_id

      LEFT JOIN users_roles u 
        ON u.id = cp.collected_by

      GROUP BY 
        i.id,
        c.id,
        u.username,
        b.batch_name,
        p.plan_name

      ORDER BY c.id, i.due_date ASC
    `);

    // 🔹 TREE FORMAT
    const customersMap = new Map();

    for (const row of rows) {
      const custId = row.customer_id;

      if (!customersMap.has(custId)) {
        customersMap.set(custId, {
          customer_id: custId,
          customer_name: row.customer_name,
          phone: row.phone,
          address: row.address,

          summary: {
            total_amount: 0,
            total_paid: 0,
            total_pending: 0,
            total_cash: 0,
            total_upi: 0,
            total_cheque: 0
          },

          collections: []
        });
      }

      const customer = customersMap.get(custId);

      const installment = {
        collector_name: row.collector_name,
        collector_email: row.collector_email,
        collector_phone: row.collector_phone,

        batch_name: row.batch_name,
        plan_name: row.plan_name,

        installment_number: row.installment_number,
        due_date: row.due_date,
        paid_date: row.paid_date,

        installment_amount: Number(row.installment_amount || 0),

        total_paid: Number(row.total_paid || 0),
        pending_amount: Number(row.pending_amount || 0),

        cash_amount: Number(row.cash_amount || 0),
        upi_amount: Number(row.upi_amount || 0),
        cheque_amount: Number(row.cheque_amount || 0),

        upi_references: row.upi_references
          ? row.upi_references.split(",")
          : []
      };

      customer.collections.push(installment);

      // 🔥 Summary
      customer.summary.total_amount += installment.installment_amount;
      customer.summary.total_paid += installment.total_paid;
      customer.summary.total_pending += installment.pending_amount;

      customer.summary.total_cash += installment.cash_amount;
      customer.summary.total_upi += installment.upi_amount;
      customer.summary.total_cheque += installment.cheque_amount;
    }

    const result = Array.from(customersMap.values());

    return res.json({
      success: true,
      count: rows.length,
      data: result
    });

  } catch (err) {
    console.error("Collection Report Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getMonthlyCollectionReport = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required"
      });
    }

    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(cp.payment_datetime, '%Y-%m') AS month,

        COUNT(DISTINCT c.id) AS total_customers,

        SUM(pa.allocated_amount) AS total_collection,

        SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_cash,
        SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_upi,
        SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)) AS total_cheque

      FROM chit_payment_allocations pa

      JOIN chit_collections_payments cp 
        ON cp.id = pa.payment_id

      JOIN chit_customer_installments i 
        ON i.id = pa.installment_id

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      WHERE YEAR(cp.payment_datetime) = ?

      GROUP BY DATE_FORMAT(cp.payment_datetime, '%Y-%m')

      ORDER BY month ASC
    `, [year]);

    return res.json({
      success: true,
      year,
      data: rows
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// export const getPendingAndOverdueReport = async (req, res) => {
//   try {


//     const [rows] = await db.query(`
//       SELECT
//         i.id AS installment_id,
//         i.subscription_id,
//         i.installment_number,

//         DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

//         i.installment_amount,

//         IFNULL(p.total_paid,0) AS paid_amount,

//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         CASE 
//           WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
//           WHEN DATE(i.due_date) = CURDATE() THEN 'PENDING'
//           WHEN DATE(i.due_date) < CURDATE() THEN 'OVERDUE'
//           ELSE 'UPCOMING'
//         END AS status,

//         c.id AS customer_id,
//         c.name AS customer_name,
//         c.phone,

//         b.batch_name,
//         pl.plan_name

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s 
//         ON s.id = i.subscription_id

//       JOIN chit_customers c 
//         ON c.id = s.customer_id

//       JOIN batches b 
//         ON b.id = s.batch_id

//       JOIN plans pl 
//         ON pl.id = s.plan_id

//       LEFT JOIN (
//         SELECT 
//           installment_id,
//           SUM(allocated_amount) AS total_paid
//         FROM chit_payment_allocations
//         GROUP BY installment_id
//       ) p ON p.installment_id = i.id

//       WHERE 
//         IFNULL(p.total_paid,0) < i.installment_amount
//         AND (
//           DATE(i.due_date) = CURDATE()   -- ✅ Pending
//           OR DATE(i.due_date) < CURDATE() -- ✅ Overdue
//         )

//       ORDER BY i.due_date ASC
//     `);

//     // 🔹 Split into Pending & Overdue
//     const pending = rows.filter(r => r.status === "PENDING");
//     const overdue = rows.filter(r => r.status === "OVERDUE");

//     // 🔹 Summary
//     const summary = {
//       pending_count: pending.length,
//       overdue_count: overdue.length,

//       pending_amount: pending.reduce((sum, r) => sum + Number(r.pending_amount), 0),
//       overdue_amount: overdue.reduce((sum, r) => sum + Number(r.pending_amount), 0)
//     };

//     return res.json({
//       success: true,
//       summary,
//       pending,
//       overdue
//     });

//   } catch (err) {
//     console.error("Pending/Overdue Report Error:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

export const getPendingAndOverdueReport = async (req, res) => {
  try {
    const { type = "all" } = req.query; // ✅ default = all

    const [rows] = await db.query(`
      SELECT
        i.id AS installment_id,
        i.subscription_id,
        i.installment_number,

        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

        i.installment_amount,

        IFNULL(p.total_paid,0) AS paid_amount,

        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        CASE 
          WHEN IFNULL(p.total_paid,0) >= i.installment_amount THEN 'PAID'
          WHEN DATE(i.due_date) = CURDATE() THEN 'PENDING'
          WHEN DATE(i.due_date) < CURDATE() THEN 'OVERDUE'
          ELSE 'UPCOMING'
        END AS status,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,

        b.batch_name,
        pl.plan_name

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      JOIN batches b 
        ON b.id = s.batch_id

      JOIN plans pl 
        ON pl.id = s.plan_id

      LEFT JOIN (
        SELECT 
          installment_id,
          SUM(allocated_amount) AS total_paid
        FROM chit_payment_allocations
        GROUP BY installment_id
      ) p ON p.installment_id = i.id

      WHERE 
        IFNULL(p.total_paid,0) < i.installment_amount
        AND (
          DATE(i.due_date) = CURDATE()
          OR DATE(i.due_date) < CURDATE()
        )

      ORDER BY i.due_date ASC
    `);

    // 🔹 Split
    const pending = rows.filter(r => r.status === "PENDING");
    const overdue = rows.filter(r => r.status === "OVERDUE");

    // 🔹 Summary
    const summary = {
      pending_count: pending.length,
      overdue_count: overdue.length,

      pending_amount: pending.reduce((sum, r) => sum + Number(r.pending_amount), 0),
      overdue_amount: overdue.reduce((sum, r) => sum + Number(r.pending_amount), 0)
    };

    // 🔥 RESPONSE BASED ON TYPE
    if (type === "pending") {
      return res.json({
        success: true,
        type,
        summary: {
          pending_count: summary.pending_count,
          pending_amount: summary.pending_amount
        },
        data: pending
      });
    }

    if (type === "overdue") {
      return res.json({
        success: true,
        type,
        summary: {
          overdue_count: summary.overdue_count,
          overdue_amount: summary.overdue_amount
        },
        data: overdue
      });
    }

    // ✅ DEFAULT (ALL)
    return res.json({
      success: true,
      type: "all",
      summary,
      pending,
      overdue
    });

  } catch (err) {
    console.error("Pending/Overdue Report Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getCollectorPendingReport = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT
        u.id AS collector_id,
        u.username AS collector_name,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,

        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        CASE 
          WHEN DATE(i.due_date) = CURDATE() THEN 'PENDING'
          WHEN DATE(i.due_date) < CURDATE() THEN 'OVERDUE'
        END AS status

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      JOIN chit_customers c 
        ON c.id = s.customer_id

      LEFT JOIN users_roles u 
        ON u.id = s.agent_staff_id   -- or collected_by based on your logic

      LEFT JOIN (
        SELECT installment_id, SUM(allocated_amount) AS total_paid
        FROM chit_payment_allocations
        GROUP BY installment_id
      ) p ON p.installment_id = i.id

      WHERE 
        IFNULL(p.total_paid,0) < i.installment_amount
        AND (
          DATE(i.due_date) = CURDATE()
          OR DATE(i.due_date) < CURDATE()
        )

      ORDER BY u.id, i.due_date ASC
    `);

    // 🔥 GROUP BY COLLECTOR
    const collectors = {};

    for (const row of rows) {
      const colId = row.collector_id || 0;

      if (!collectors[colId]) {
        collectors[colId] = {
          collector_id: colId,
          collector_name: row.collector_name || "Unassigned",

          summary: {
            total_customers: 0,
            total_pending_amount: 0
          },

          customers: []
        };
      }

      const collector = collectors[colId];

      collector.customers.push({
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        phone: row.phone,
        due_date: row.due_date,
        pending_amount: Number(row.pending_amount),
        status: row.status
      });

      collector.summary.total_customers++;
      collector.summary.total_pending_amount += Number(row.pending_amount);
    }

    return res.json({
      success: true,
      count: Object.keys(collectors).length,
      data: Object.values(collectors)
    });

  } catch (err) {
    console.error("Collector Pending Report Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
