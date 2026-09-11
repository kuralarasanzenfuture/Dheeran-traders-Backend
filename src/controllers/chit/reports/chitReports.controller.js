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

                COALESCE(SUM(COALESCE(s.total_investment_amount, s.investment_amount)), 0) AS total_investment,

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
                s.chit_quantity,
                s.installment_amount,
                s.total_installment_amount,
                s.investment_amount,
                COALESCE(s.total_investment_amount, s.investment_amount) AS total_investment_amount

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
          chit_quantity: row.chit_quantity || 1,
          installment_amount: row.installment_amount,
          total_installment_amount: row.total_installment_amount,
          investment_amount: row.investment_amount,
          total_investment_amount: row.total_investment_amount || row.investment_amount,
        });

        result[row.agent_staff_id].total_referrals += 1;
        result[row.agent_staff_id].total_chit_value += Number(
          row.total_investment_amount || row.investment_amount || 0,
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
    const {
      search,
      batch_id,
      batch_name,
      plan_id,
      plan_name,
      from_date,
      to_date,
    } = req.query;

    const whereConditions = [];
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR p.plan_name LIKE ? OR b.batch_name LIKE ?)`
      );
      params.push(term, term, term, term);
    }

    if (batch_id) {
      whereConditions.push("b.id = ?");
      params.push(batch_id);
    } else if (batch_name) {
      whereConditions.push("b.batch_name = ?");
      params.push(batch_name);
    }

    if (plan_id) {
      whereConditions.push("p.id = ?");
      params.push(plan_id);
    } else if (plan_name) {
      whereConditions.push("p.plan_name = ?");
      params.push(plan_name);
    }

    if (from_date) {
      whereConditions.push("s.start_date >= ?");
      params.push(from_date);
    }

    if (to_date) {
      whereConditions.push("s.start_date <= ?");
      params.push(to_date);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const query = `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.address,

        s.id AS subscription_id,
        s.chit_quantity,
        s.installment_amount,
        s.total_installment_amount,
        s.investment_amount,
        s.total_investment_amount,
        s.start_date,
        s.end_date,

        b.id AS batch_id,
        b.batch_name,
        p.id AS plan_id,
        p.plan_name

      FROM chit_customers c

      LEFT JOIN chit_customer_subscriptions s 
        ON s.customer_id = c.id

      LEFT JOIN batches b 
        ON b.id = s.batch_id

      LEFT JOIN plans p 
        ON p.id = s.plan_id

      ${whereClause}

      ORDER BY c.id DESC
    `;

    const [rows] = await db.query(query, params);

    // ✅ Grouping
    const result = {};
    let totalSubs = 0;
    let totalInv = 0;

    rows.forEach((row) => {
      if (!result[row.customer_id]) {
        result[row.customer_id] = {
          customer_id: row.customer_id,
          name: row.customer_name,
          mobile: row.phone,
          address: row.address,
          total_subscriptions: 0,
          total_investment: 0,
          subscriptions: [],
        };
      }

      // If subscription exists
      if (row.subscription_id) {
        const subInvestment = Number(
          row.total_investment_amount || row.investment_amount || 0
        );

        result[row.customer_id].subscriptions.push({
          subscription_id: row.subscription_id,
          batch_id: row.batch_id,
          batch_name: row.batch_name,
          plan_id: row.plan_id,
          plan_name: row.plan_name,
          start_date: row.start_date,
          end_date: row.end_date,
          chit_quantity: row.chit_quantity || 1,
          installment_amount: Number(row.installment_amount || 0),
          total_installment_amount: Number(
            row.total_installment_amount || row.installment_amount || 0
          ),
          investment_amount: Number(row.investment_amount || 0),
          total_investment_amount: subInvestment,
        });

        result[row.customer_id].total_subscriptions += 1;
        result[row.customer_id].total_investment += subInvestment;

        totalSubs += 1;
        totalInv += subInvestment;
      }
    });

    const customersArray = Object.values(result);

    return res.status(200).json({
      success: true,
      message: "Customer report fetched successfully",
      count: customersArray.length,
      summary: {
        total_customers: customersArray.length,
        total_subscriptions: totalSubs,
        total_investment: totalInv,
      },
      data: customersArray,
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
                s.chit_quantity,
                s.installment_amount,
                s.total_installment_amount,
                s.investment_amount,
                s.total_investment_amount,
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
          chit_quantity: row.chit_quantity || 1,
          installment_amount: row.installment_amount,
          total_installment_amount: row.total_installment_amount,
          investment_amount: row.investment_amount,
          total_investment_amount: row.total_investment_amount || row.investment_amount,
        });

        result[row.plan_id].total_subscriptions += 1;
        result[row.plan_id].total_investment += Number(
          row.total_investment_amount || row.investment_amount || 0,
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
    const {
      from_date,
      to_date,
      search,
      user_id,
      collector_id,
      customer_id,
      batch_id,
      plan_id,
      payment_mode,
    } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "from_date and to_date are required",
      });
    }

    const fromDateTime = `${from_date} 00:00:00`;
    const toDateTime = `${to_date} 23:59:59`;

    const whereConditions = [
      "cp.payment_datetime >= ?",
      "cp.payment_datetime <= ?",
    ];
    const params = [fromDateTime, toDateTime];

    const colId = user_id || collector_id;
    if (colId) {
      whereConditions.push("cp.collected_by = ?");
      params.push(colId);
    }

    if (customer_id) {
      whereConditions.push("c.id = ?");
      params.push(customer_id);
    }

    if (batch_id) {
      whereConditions.push("b.id = ?");
      params.push(batch_id);
    }

    if (plan_id) {
      whereConditions.push("p.id = ?");
      params.push(plan_id);
    }

    if (payment_mode) {
      const mode = payment_mode.toLowerCase();
      if (mode === "cash") whereConditions.push("cp.pay_cash > 0");
      else if (mode === "upi") whereConditions.push("cp.pay_upi > 0");
      else if (mode === "cheque") whereConditions.push("cp.pay_cheque > 0");
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR u.username LIKE ? OR b.batch_name LIKE ? OR p.plan_name LIKE ? OR cp.pay_upi_reference LIKE ?)`
      );
      params.push(term, term, term, term, term, term);
    }

    const [rows] = await db.query(
      `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.address,

        u.id AS collector_id,
        u.username AS collector_name,
        u.email AS collector_email,
        u.phone AS collector_phone,

        b.id AS batch_id,
        b.batch_name,
        p.id AS plan_id,
        p.plan_name,

        i.id AS installment_id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

        COALESCE(SUM(pa.allocated_amount), 0) AS total_paid,

        COALESCE(SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cash_amount,
        COALESCE(SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS upi_amount,
        COALESCE(SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cheque_amount,

        GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,

        i.installment_amount,

        (i.installment_amount - COALESCE(SUM(pa.allocated_amount), 0)) AS pending_amount,

        DATE_FORMAT(MAX(cp.payment_datetime), '%Y-%m-%d %H:%i:%s') AS paid_datetime,
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

      WHERE ${whereConditions.join(" AND ")}

      GROUP BY 
        i.id,
        c.id,
        u.id,
        u.username,
        u.email,
        u.phone,
        b.id,
        b.batch_name,
        p.id,
        p.plan_name

      ORDER BY c.id, i.due_date ASC
    `,
      params
    );

    // Tree grouping
    const customersMap = new Map();
    const overallSummary = {
      total_amount: 0,
      total_paid: 0,
      total_pending: 0,
      total_cash: 0,
      total_upi: 0,
      total_cheque: 0,
      total_customers: 0,
      total_collections: rows.length,
    };

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
            total_cheque: 0,
          },

          collections: [],
        });
      }

      const customer = customersMap.get(custId);

      const installment = {
        collector_id: row.collector_id,
        collector_name: row.collector_name,
        collector_email: row.collector_email,
        collector_phone: row.collector_phone,

        batch_id: row.batch_id,
        batch_name: row.batch_name,
        plan_id: row.plan_id,
        plan_name: row.plan_name,

        installment_number: row.installment_number,
        due_date: row.due_date,
        paid_date: row.paid_date,
        paid_datetime: row.paid_datetime,

        installment_amount: Number(row.installment_amount || 0),
        total_paid: Number(row.total_paid || 0),
        pending_amount: Number(row.pending_amount || 0),

        cash_amount: Number(row.cash_amount || 0),
        upi_amount: Number(row.upi_amount || 0),
        cheque_amount: Number(row.cheque_amount || 0),

        upi_references: row.upi_references ? row.upi_references.split(",") : [],
      };

      customer.collections.push(installment);

      // Customer Summary
      customer.summary.total_amount += installment.installment_amount;
      customer.summary.total_paid += installment.total_paid;
      customer.summary.total_pending += installment.pending_amount;
      customer.summary.total_cash += installment.cash_amount;
      customer.summary.total_upi += installment.upi_amount;
      customer.summary.total_cheque += installment.cheque_amount;

      // Overall Summary
      overallSummary.total_amount += installment.installment_amount;
      overallSummary.total_paid += installment.total_paid;
      overallSummary.total_pending += installment.pending_amount;
      overallSummary.total_cash += installment.cash_amount;
      overallSummary.total_upi += installment.upi_amount;
      overallSummary.total_cheque += installment.cheque_amount;
    }

    const result = Array.from(customersMap.values());
    overallSummary.total_customers = result.length;

    return res.json({
      success: true,
      from_date,
      to_date,
      count: rows.length,
      summary: overallSummary,
      data: result,
    });
  } catch (err) {
    console.error("Collection Report Date Range Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getCollectionReport = async (req, res) => {
  try {
    const {
      search,
      user_id,
      collector_id,
      customer_id,
      batch_id,
      batch_name,
      plan_id,
      plan_name,
      payment_mode,
      from_date,
      to_date,
      date,
      status,
      page,
      limit,
    } = req.query;

    const whereConditions = [];
    const params = [];

    const colId = user_id || collector_id;
    if (colId) {
      whereConditions.push("cp.collected_by = ?");
      params.push(colId);
    }

    if (customer_id) {
      whereConditions.push("c.id = ?");
      params.push(customer_id);
    }

    if (batch_id) {
      whereConditions.push("b.id = ?");
      params.push(batch_id);
    } else if (batch_name) {
      whereConditions.push("b.batch_name = ?");
      params.push(batch_name);
    }

    if (plan_id) {
      whereConditions.push("p.id = ?");
      params.push(plan_id);
    } else if (plan_name) {
      whereConditions.push("p.plan_name = ?");
      params.push(plan_name);
    }

    if (date) {
      if (date.toLowerCase() === "today") {
        whereConditions.push("DATE(cp.payment_datetime) = CURDATE()");
      } else {
        whereConditions.push("DATE(cp.payment_datetime) = ?");
        params.push(date);
      }
    } else {
      if (from_date) {
        whereConditions.push("cp.payment_datetime >= ?");
        params.push(`${from_date} 00:00:00`);
      }
      if (to_date) {
        whereConditions.push("cp.payment_datetime <= ?");
        params.push(`${to_date} 23:59:59`);
      }
    }

    if (payment_mode) {
      const mode = payment_mode.toLowerCase();
      if (mode === "cash") whereConditions.push("cp.pay_cash > 0");
      else if (mode === "upi") whereConditions.push("cp.pay_upi > 0");
      else if (mode === "cheque") whereConditions.push("cp.pay_cheque > 0");
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR u.username LIKE ? OR b.batch_name LIKE ? OR p.plan_name LIKE ? OR cp.pay_upi_reference LIKE ?)`
      );
      params.push(term, term, term, term, term, term);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const [rows] = await db.query(
      `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.address,

        u.id AS collector_id,
        u.username AS collector_name,
        u.email AS collector_email,
        u.phone AS collector_phone,

        b.id AS batch_id,
        b.batch_name,
        p.id AS plan_id,
        p.plan_name,

        i.id AS installment_id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

        COALESCE(SUM(pa.allocated_amount), 0) AS total_paid,

        COALESCE(SUM((cp.pay_cash * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cash_amount,
        COALESCE(SUM((cp.pay_upi * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS upi_amount,
        COALESCE(SUM((cp.pay_cheque * pa.allocated_amount) / NULLIF(cp.total_amount,0)), 0) AS cheque_amount,

        GROUP_CONCAT(DISTINCT cp.pay_upi_reference) AS upi_references,

        i.installment_amount,

        (i.installment_amount - COALESCE(SUM(pa.allocated_amount), 0)) AS pending_amount,

        DATE_FORMAT(MAX(cp.payment_datetime), '%Y-%m-%d %H:%i:%s') AS paid_datetime,
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

      ${whereClause}

      GROUP BY 
        i.id,
        c.id,
        u.id,
        u.username,
        u.email,
        u.phone,
        b.id,
        b.batch_name,
        p.id,
        p.plan_name

      ORDER BY c.id, i.due_date ASC
    `,
      params
    );

    // 🔹 Filter by status if requested
    let filteredRows = rows;
    if (status) {
      const s = status.toUpperCase();
      filteredRows = rows.filter((r) => {
        const pending = Number(r.pending_amount || 0);
        const paid = Number(r.total_paid || 0);
        if (s === "PAID") return pending <= 0;
        if (s === "PARTIAL") return paid > 0 && pending > 0;
        if (s === "PENDING") return paid === 0;
        if (s === "OVERDUE") {
          return pending > 0 && new Date(r.due_date) < new Date();
        }
        return true;
      });
    }

    // 🔹 TREE FORMAT (Matches Frontend CollectionReport.jsx expectations)
    const customersMap = new Map();
    const overallSummary = {
      total_amount: 0,
      total_paid: 0,
      total_pending: 0,
      total_cash: 0,
      total_upi: 0,
      total_cheque: 0,
      total_customers: 0,
      total_collections: filteredRows.length,
    };

    for (const row of filteredRows) {
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
            total_cheque: 0,
          },

          collections: [],
        });
      }

      const customer = customersMap.get(custId);

      const installment = {
        collector_id: row.collector_id,
        collector_name: row.collector_name,
        collector_email: row.collector_email,
        collector_phone: row.collector_phone,

        batch_id: row.batch_id,
        batch_name: row.batch_name,
        plan_id: row.plan_id,
        plan_name: row.plan_name,

        installment_number: row.installment_number,
        due_date: row.due_date,
        paid_date: row.paid_date,
        paid_datetime: row.paid_datetime,

        installment_amount: Number(row.installment_amount || 0),
        total_paid: Number(row.total_paid || 0),
        pending_amount: Number(row.pending_amount || 0),

        cash_amount: Number(row.cash_amount || 0),
        upi_amount: Number(row.upi_amount || 0),
        cheque_amount: Number(row.cheque_amount || 0),

        upi_references: row.upi_references ? row.upi_references.split(",") : [],
      };

      customer.collections.push(installment);

      // Customer Summary
      customer.summary.total_amount += installment.installment_amount;
      customer.summary.total_paid += installment.total_paid;
      customer.summary.total_pending += installment.pending_amount;
      customer.summary.total_cash += installment.cash_amount;
      customer.summary.total_upi += installment.upi_amount;
      customer.summary.total_cheque += installment.cheque_amount;

      // Overall Summary
      overallSummary.total_amount += installment.installment_amount;
      overallSummary.total_paid += installment.total_paid;
      overallSummary.total_pending += installment.pending_amount;
      overallSummary.total_cash += installment.cash_amount;
      overallSummary.total_upi += installment.upi_amount;
      overallSummary.total_cheque += installment.cheque_amount;
    }

    let result = Array.from(customersMap.values());
    overallSummary.total_customers = result.length;

    // Optional pagination
    let pagination = null;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = result.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIdx = (pageNum - 1) * limitNum;
      result = result.slice(startIdx, startIdx + limitNum);

      pagination = {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      };
    }

    return res.json({
      success: true,
      count: filteredRows.length,
      summary: overallSummary,
      data: result,
      ...(pagination ? { pagination } : {}),
    });
  } catch (err) {
    console.error("Collection Report Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * 👤 USER COLLECTION REPORT (With Filters, Search, and Realtime Summary)
 * Returns collections grouped by User / Collector or flat list
 */
export const getUserCollectionReport = async (req, res) => {
  try {
    const {
      search,
      user_id,
      collector_id,
      customer_id,
      batch_id,
      plan_id,
      payment_mode,
      from_date,
      to_date,
      date,
      format, // 'grouped' (default) or 'flat'
      page,
      limit,
    } = req.query;

    const whereConditions = [];
    const params = [];

    const colId = user_id || collector_id;
    if (colId) {
      whereConditions.push("cp.collected_by = ?");
      params.push(colId);
    }

    if (customer_id) {
      whereConditions.push("cp.customer_id = ?");
      params.push(customer_id);
    }

    if (batch_id) {
      whereConditions.push("s.batch_id = ?");
      params.push(batch_id);
    }

    if (plan_id) {
      whereConditions.push("s.plan_id = ?");
      params.push(plan_id);
    }

    if (payment_mode) {
      const mode = payment_mode.toLowerCase();
      if (mode === "cash") whereConditions.push("cp.pay_cash > 0");
      else if (mode === "upi") whereConditions.push("cp.pay_upi > 0");
      else if (mode === "cheque") whereConditions.push("cp.pay_cheque > 0");
    }

    if (date) {
      if (date.toLowerCase() === "today") {
        whereConditions.push("DATE(cp.payment_datetime) = CURDATE()");
      } else {
        whereConditions.push("DATE(cp.payment_datetime) = ?");
        params.push(date);
      }
    } else {
      if (from_date) {
        whereConditions.push("cp.payment_datetime >= ?");
        params.push(`${from_date} 00:00:00`);
      }
      if (to_date) {
        whereConditions.push("cp.payment_datetime <= ?");
        params.push(`${to_date} 23:59:59`);
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR u.username LIKE ? OR b.batch_name LIKE ? OR p.plan_name LIKE ? OR cp.pay_upi_reference LIKE ? OR cp.remarks LIKE ?)`
      );
      params.push(term, term, term, term, term, term, term);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const query = `
      SELECT
        u.id AS user_id,
        COALESCE(u.username, 'Direct / Office') AS collector_name,
        u.email AS collector_email,
        u.phone AS collector_phone,

        cp.id AS payment_id,
        cp.payment_type,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d %H:%i:%s') AS payment_datetime,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d') AS payment_date,
        cp.total_amount,
        cp.pay_cash,
        cp.pay_upi,
        cp.pay_cheque,
        cp.pay_upi_reference,
        cp.remarks,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.address AS customer_address,

        s.id AS subscription_id,
        b.id AS batch_id,
        b.batch_name,
        p.id AS plan_id,
        p.plan_name,

        inst.installment_numbers,
        inst.installments_count

      FROM chit_collections_payments cp

      LEFT JOIN users_roles u 
        ON u.id = cp.collected_by

      LEFT JOIN chit_customers c 
        ON c.id = cp.customer_id

      LEFT JOIN chit_customer_subscriptions s 
        ON s.id = cp.subscription_id

      LEFT JOIN batches b 
        ON b.id = s.batch_id

      LEFT JOIN plans p 
        ON p.id = s.plan_id

      LEFT JOIN (
        SELECT 
          pa.payment_id,
          GROUP_CONCAT(DISTINCT i.installment_number ORDER BY i.installment_number ASC) AS installment_numbers,
          COUNT(DISTINCT pa.installment_id) AS installments_count
        FROM chit_payment_allocations pa
        JOIN chit_customer_installments i 
          ON i.id = pa.installment_id
        GROUP BY pa.payment_id
      ) inst ON inst.payment_id = cp.id

      ${whereClause}

      ORDER BY u.id DESC, cp.payment_datetime DESC
    `;

    const [rows] = await db.query(query, params);

    // Overall Realtime Summary
    const overallSummary = {
      total_collected: 0,
      today_collected: 0,
      total_cash: 0,
      total_upi: 0,
      total_cheque: 0,
      total_transactions: rows.length,
      total_customers: 0,
      total_collectors: 0,
    };

    const distinctCustomers = new Set();
    const distinctCollectors = new Set();
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const row of rows) {
      const amount = Number(row.total_amount || 0);
      const cash = Number(row.pay_cash || 0);
      const upi = Number(row.pay_upi || 0);
      const cheque = Number(row.pay_cheque || 0);

      overallSummary.total_collected += amount;
      overallSummary.total_cash += cash;
      overallSummary.total_upi += upi;
      overallSummary.total_cheque += cheque;

      if (row.payment_date === todayStr) {
        overallSummary.today_collected += amount;
      }

      if (row.customer_id) distinctCustomers.add(row.customer_id);
      if (row.user_id) distinctCollectors.add(row.user_id);
    }

    overallSummary.total_customers = distinctCustomers.size;
    overallSummary.total_collectors = distinctCollectors.size;

    // Handle Flat Format if explicitly requested
    if (format === "flat") {
      let flatData = rows.map((r) => ({
        payment_id: r.payment_id,
        user_id: r.user_id,
        collector_name: r.collector_name,
        collector_phone: r.collector_phone,
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        customer_address: r.customer_address,
        batch_id: r.batch_id,
        batch_name: r.batch_name,
        plan_id: r.plan_id,
        plan_name: r.plan_name,
        installment_numbers: r.installment_numbers
          ? r.installment_numbers.split(",")
          : [],
        total_amount: Number(r.total_amount || 0),
        pay_cash: Number(r.pay_cash || 0),
        pay_upi: Number(r.pay_upi || 0),
        pay_cheque: Number(r.pay_cheque || 0),
        pay_upi_reference: r.pay_upi_reference,
        payment_type: r.payment_type,
        payment_datetime: r.payment_datetime,
        payment_date: r.payment_date,
        remarks: r.remarks,
      }));

      let pagination = null;
      if (page && limit) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const total = flatData.length;
        const totalPages = Math.ceil(total / limitNum);
        const startIdx = (pageNum - 1) * limitNum;
        flatData = flatData.slice(startIdx, startIdx + limitNum);

        pagination = {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        };
      }

      return res.status(200).json({
        success: true,
        message: "User collections fetched successfully (flat format)",
        summary: overallSummary,
        count: flatData.length,
        data: flatData,
        ...(pagination ? { pagination } : {}),
      });
    }

    // Default: Group by Collector User
    const collectorsMap = new Map();

    for (const row of rows) {
      const colId = row.user_id || 0;

      if (!collectorsMap.has(colId)) {
        collectorsMap.set(colId, {
          user_id: row.user_id,
          collector_name: row.collector_name,
          collector_email: row.collector_email,
          collector_phone: row.collector_phone,

          summary: {
            total_collected: 0,
            today_collected: 0,
            total_cash: 0,
            total_upi: 0,
            total_cheque: 0,
            transactions_count: 0,
            unique_customers: new Set(),
          },

          collections: [],
        });
      }

      const collector = collectorsMap.get(colId);
      const amount = Number(row.total_amount || 0);
      const cash = Number(row.pay_cash || 0);
      const upi = Number(row.pay_upi || 0);
      const cheque = Number(row.pay_cheque || 0);

      collector.summary.total_collected += amount;
      collector.summary.total_cash += cash;
      collector.summary.total_upi += upi;
      collector.summary.total_cheque += cheque;
      collector.summary.transactions_count += 1;

      if (row.payment_date === todayStr) {
        collector.summary.today_collected += amount;
      }

      if (row.customer_id) {
        collector.summary.unique_customers.add(row.customer_id);
      }

      collector.collections.push({
        payment_id: row.payment_id,
        payment_datetime: row.payment_datetime,
        payment_date: row.payment_date,
        payment_type: row.payment_type,
        total_amount: amount,
        pay_cash: cash,
        pay_upi: upi,
        pay_cheque: cheque,
        pay_upi_reference: row.pay_upi_reference,
        remarks: row.remarks,

        customer_id: row.customer_id,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        customer_address: row.customer_address,

        subscription_id: row.subscription_id,
        batch_id: row.batch_id,
        batch_name: row.batch_name,
        plan_id: row.plan_id,
        plan_name: row.plan_name,

        installment_numbers: row.installment_numbers
          ? row.installment_numbers.split(",")
          : [],
      });
    }

    let result = Array.from(collectorsMap.values()).map((c) => ({
      ...c,
      summary: {
        total_collected: c.summary.total_collected,
        today_collected: c.summary.today_collected,
        total_cash: c.summary.total_cash,
        total_upi: c.summary.total_upi,
        total_cheque: c.summary.total_cheque,
        transactions_count: c.summary.transactions_count,
        customers_count: c.summary.unique_customers.size,
      },
    }));

    // Optional pagination on grouped collectors
    let pagination = null;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = result.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIdx = (pageNum - 1) * limitNum;
      result = result.slice(startIdx, startIdx + limitNum);

      pagination = {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      };
    }

    return res.status(200).json({
      success: true,
      message: "User collection report fetched successfully",
      summary: overallSummary,
      count: result.length,
      data: result,
      ...(pagination ? { pagination } : {}),
    });
  } catch (err) {
    console.error("User Collection Report Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * 📊 USER COLLECTION SUMMARY (Ultra-Fast Real-Time KPI Cards & Rankings)
 */
export const getUserCollectionSummary = async (req, res) => {
  try {
    const { user_id, collector_id, from_date, to_date } = req.query;

    const whereConditions = [];
    const params = [];

    const colId = user_id || collector_id;
    if (colId) {
      whereConditions.push("cp.collected_by = ?");
      params.push(colId);
    }

    if (from_date) {
      whereConditions.push("cp.payment_datetime >= ?");
      params.push(`${from_date} 00:00:00`);
    }

    if (to_date) {
      whereConditions.push("cp.payment_datetime <= ?");
      params.push(`${to_date} 23:59:59`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // 1️⃣ Aggregate KPI totals in a single round-trip
    const [summaryRows] = await db.query(
      `
      SELECT
        COUNT(cp.id) AS total_transactions,
        COALESCE(SUM(cp.total_amount), 0) AS total_collected,
        COALESCE(SUM(CASE WHEN DATE(cp.payment_datetime) = CURDATE() THEN cp.total_amount ELSE 0 END), 0) AS today_collected,
        COALESCE(SUM(CASE WHEN YEARWEEK(cp.payment_datetime, 1) = YEARWEEK(CURDATE(), 1) THEN cp.total_amount ELSE 0 END), 0) AS this_week_collected,
        COALESCE(SUM(CASE WHEN YEAR(cp.payment_datetime) = YEAR(CURDATE()) AND MONTH(cp.payment_datetime) = MONTH(CURDATE()) THEN cp.total_amount ELSE 0 END), 0) AS this_month_collected,
        COALESCE(SUM(cp.pay_cash), 0) AS total_cash,
        COALESCE(SUM(cp.pay_upi), 0) AS total_upi,
        COALESCE(SUM(cp.pay_cheque), 0) AS total_cheque,
        COUNT(DISTINCT cp.customer_id) AS total_customers,
        COUNT(DISTINCT cp.collected_by) AS active_collectors
      FROM chit_collections_payments cp
      ${whereClause}
    `,
      params
    );

    const summary = summaryRows[0] || {};
    const totalColl = Number(summary.total_collected || 0);
    const cash = Number(summary.total_cash || 0);
    const upi = Number(summary.total_upi || 0);
    const cheque = Number(summary.total_cheque || 0);

    // 2️⃣ Collector Rankings / Leaderboard
    const [rankings] = await db.query(
      `
      SELECT
        u.id AS user_id,
        COALESCE(u.username, 'Direct / Office') AS collector_name,
        u.phone AS collector_phone,
        COUNT(cp.id) AS collections_count,
        COUNT(DISTINCT cp.customer_id) AS customers_count,
        COALESCE(SUM(cp.total_amount), 0) AS total_collected,
        COALESCE(SUM(CASE WHEN DATE(cp.payment_datetime) = CURDATE() THEN cp.total_amount ELSE 0 END), 0) AS today_collected,
        COALESCE(SUM(cp.pay_cash), 0) AS cash_amount,
        COALESCE(SUM(cp.pay_upi), 0) AS upi_amount,
        COALESCE(SUM(cp.pay_cheque), 0) AS cheque_amount
      FROM chit_collections_payments cp
      LEFT JOIN users_roles u ON u.id = cp.collected_by
      ${whereClause}
      GROUP BY u.id, u.username, u.phone
      ORDER BY total_collected DESC
    `,
      params
    );

    return res.status(200).json({
      success: true,
      message: "User collection summary fetched successfully",
      summary: {
        total_collected: totalColl,
        today_collected: Number(summary.today_collected || 0),
        this_week_collected: Number(summary.this_week_collected || 0),
        this_month_collected: Number(summary.this_month_collected || 0),
        total_cash: cash,
        total_upi: upi,
        total_cheque: cheque,
        total_transactions: Number(summary.total_transactions || 0),
        total_customers: Number(summary.total_customers || 0),
        active_collectors: Number(summary.active_collectors || 0),
      },
      payment_modes: {
        cash: {
          amount: cash,
          percentage: totalColl > 0 ? Number(((cash / totalColl) * 100).toFixed(2)) : 0,
        },
        upi: {
          amount: upi,
          percentage: totalColl > 0 ? Number(((upi / totalColl) * 100).toFixed(2)) : 0,
        },
        cheque: {
          amount: cheque,
          percentage: totalColl > 0 ? Number(((cheque / totalColl) * 100).toFixed(2)) : 0,
        },
      },
      collector_rankings: rankings.map((r) => ({
        user_id: r.user_id,
        collector_name: r.collector_name,
        collector_phone: r.collector_phone,
        collections_count: Number(r.collections_count || 0),
        customers_count: Number(r.customers_count || 0),
        total_collected: Number(r.total_collected || 0),
        today_collected: Number(r.today_collected || 0),
        cash_amount: Number(r.cash_amount || 0),
        upi_amount: Number(r.upi_amount || 0),
        cheque_amount: Number(r.cheque_amount || 0),
      })),
    });
  } catch (err) {
    console.error("User Collection Summary Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ⚡ REALTIME LIVE USER COLLECTION FEED (For Live Dashboards & Field Monitoring)
 */
export const getRealtimeUserCollection = async (req, res) => {
  try {
    const { user_id, limit: rawLimit, search, all } = req.query;
    const limit = Math.min(parseInt(rawLimit, 10) || 20, 100);

    const whereConditions = [];
    const params = [];

    if (user_id) {
      whereConditions.push("cp.collected_by = ?");
      params.push(user_id);
    }

    // Default to today unless explicitly requesting all
    if (!all || all !== "true") {
      whereConditions.push("DATE(cp.payment_datetime) = CURDATE()");
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR u.username LIKE ? OR cp.pay_upi_reference LIKE ?)`
      );
      params.push(term, term, term, term);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // 1️⃣ Today's realtime KPIs
    const [kpiRows] = await db.query(`
      SELECT
        COUNT(cp.id) AS today_transactions,
        COALESCE(SUM(cp.total_amount), 0) AS today_amount,
        COALESCE(SUM(cp.pay_cash), 0) AS today_cash,
        COALESCE(SUM(cp.pay_upi), 0) AS today_upi,
        COALESCE(SUM(cp.pay_cheque), 0) AS today_cheque,
        COUNT(DISTINCT cp.customer_id) AS today_customers,
        COUNT(DISTINCT cp.collected_by) AS today_active_collectors
      FROM chit_collections_payments cp
      WHERE DATE(cp.payment_datetime) = CURDATE()
    `);

    // 2️⃣ Recent live collections
    const [recentRows] = await db.query(
      `
      SELECT
        cp.id AS payment_id,
        cp.total_amount,
        cp.pay_cash,
        cp.pay_upi,
        cp.pay_cheque,
        cp.pay_upi_reference,
        cp.payment_type,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d %H:%i:%s') AS payment_datetime,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d') AS payment_date,
        cp.remarks,

        u.id AS user_id,
        COALESCE(u.username, 'Direct / Office') AS collector_name,
        u.phone AS collector_phone,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,

        b.batch_name,
        p.plan_name,

        inst.installment_numbers

      FROM chit_collections_payments cp
      LEFT JOIN users_roles u ON u.id = cp.collected_by
      LEFT JOIN chit_customers c ON c.id = cp.customer_id
      LEFT JOIN chit_customer_subscriptions s ON s.id = cp.subscription_id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN (
        SELECT 
          pa.payment_id,
          GROUP_CONCAT(DISTINCT i.installment_number ORDER BY i.installment_number ASC) AS installment_numbers
        FROM chit_payment_allocations pa
        JOIN chit_customer_installments i ON i.id = pa.installment_id
        GROUP BY pa.payment_id
      ) inst ON inst.payment_id = cp.id

      ${whereClause}

      ORDER BY cp.payment_datetime DESC, cp.id DESC
      LIMIT ?
    `,
      [...params, limit]
    );

    const kpi = kpiRows[0] || {};

    return res.status(200).json({
      success: true,
      message: "Realtime user collection feed fetched successfully",
      timestamp: new Date().toISOString(),
      today_kpis: {
        today_amount: Number(kpi.today_amount || 0),
        today_cash: Number(kpi.today_cash || 0),
        today_upi: Number(kpi.today_upi || 0),
        today_cheque: Number(kpi.today_cheque || 0),
        today_transactions: Number(kpi.today_transactions || 0),
        today_customers: Number(kpi.today_customers || 0),
        today_active_collectors: Number(kpi.today_active_collectors || 0),
      },
      count: recentRows.length,
      data: recentRows.map((r) => ({
        payment_id: r.payment_id,
        total_amount: Number(r.total_amount || 0),
        pay_cash: Number(r.pay_cash || 0),
        pay_upi: Number(r.pay_upi || 0),
        pay_cheque: Number(r.pay_cheque || 0),
        pay_upi_reference: r.pay_upi_reference,
        payment_type: r.payment_type,
        payment_datetime: r.payment_datetime,
        payment_date: r.payment_date,
        remarks: r.remarks,
        collector: {
          user_id: r.user_id,
          name: r.collector_name,
          phone: r.collector_phone,
        },
        customer: {
          customer_id: r.customer_id,
          name: r.customer_name,
          phone: r.customer_phone,
        },
        batch_name: r.batch_name,
        plan_name: r.plan_name,
        installment_numbers: r.installment_numbers
          ? r.installment_numbers.split(",")
          : [],
      })),
    });
  } catch (err) {
    console.error("Realtime User Collection Feed Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * 🔍 GET USER COLLECTION BY ID (Drilldown for Single Collector)
 */
export const getUserCollectionById = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { from_date, to_date, date, search, page, limit } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    // 1️⃣ Fetch user profile
    const [[collector]] = await db.query(
      `
      SELECT id AS user_id, username, email, phone, status, role_id
      FROM users_roles
      WHERE id = ?
    `,
      [user_id]
    );

    if (!collector) {
      return res.status(404).json({
        success: false,
        message: "User / Collector not found",
      });
    }

    const whereConditions = ["cp.collected_by = ?"];
    const params = [user_id];

    if (date) {
      if (date.toLowerCase() === "today") {
        whereConditions.push("DATE(cp.payment_datetime) = CURDATE()");
      } else {
        whereConditions.push("DATE(cp.payment_datetime) = ?");
        params.push(date);
      }
    } else {
      if (from_date) {
        whereConditions.push("cp.payment_datetime >= ?");
        params.push(`${from_date} 00:00:00`);
      }
      if (to_date) {
        whereConditions.push("cp.payment_datetime <= ?");
        params.push(`${to_date} 23:59:59`);
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR b.batch_name LIKE ? OR p.plan_name LIKE ? OR cp.pay_upi_reference LIKE ?)`
      );
      params.push(term, term, term, term, term);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const [collections] = await db.query(
      `
      SELECT
        cp.id AS payment_id,
        cp.payment_type,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d %H:%i:%s') AS payment_datetime,
        DATE_FORMAT(cp.payment_datetime, '%Y-%m-%d') AS payment_date,
        cp.total_amount,
        cp.pay_cash,
        cp.pay_upi,
        cp.pay_cheque,
        cp.pay_upi_reference,
        cp.remarks,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.address AS customer_address,

        s.id AS subscription_id,
        b.id AS batch_id,
        b.batch_name,
        p.id AS plan_id,
        p.plan_name,

        inst.installment_numbers

      FROM chit_collections_payments cp
      LEFT JOIN chit_customers c ON c.id = cp.customer_id
      LEFT JOIN chit_customer_subscriptions s ON s.id = cp.subscription_id
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN plans p ON p.id = s.plan_id
      LEFT JOIN (
        SELECT 
          pa.payment_id,
          GROUP_CONCAT(DISTINCT i.installment_number ORDER BY i.installment_number ASC) AS installment_numbers
        FROM chit_payment_allocations pa
        JOIN chit_customer_installments i ON i.id = pa.installment_id
        GROUP BY pa.payment_id
      ) inst ON inst.payment_id = cp.id

      ${whereClause}

      ORDER BY cp.payment_datetime DESC, cp.id DESC
    `,
      params
    );

    const summary = {
      total_collected: 0,
      today_collected: 0,
      total_cash: 0,
      total_upi: 0,
      total_cheque: 0,
      transactions_count: collections.length,
      customers_count: 0,
    };

    const distinctCust = new Set();
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const c of collections) {
      const amt = Number(c.total_amount || 0);
      summary.total_collected += amt;
      summary.total_cash += Number(c.pay_cash || 0);
      summary.total_upi += Number(c.pay_upi || 0);
      summary.total_cheque += Number(c.pay_cheque || 0);

      if (c.payment_date === todayStr) {
        summary.today_collected += amt;
      }
      if (c.customer_id) distinctCust.add(c.customer_id);
    }
    summary.customers_count = distinctCust.size;

    let result = collections.map((c) => ({
      payment_id: c.payment_id,
      payment_datetime: c.payment_datetime,
      payment_date: c.payment_date,
      payment_type: c.payment_type,
      total_amount: Number(c.total_amount || 0),
      pay_cash: Number(c.pay_cash || 0),
      pay_upi: Number(c.pay_upi || 0),
      pay_cheque: Number(c.pay_cheque || 0),
      pay_upi_reference: c.pay_upi_reference,
      remarks: c.remarks,
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      customer_phone: c.customer_phone,
      customer_address: c.customer_address,
      subscription_id: c.subscription_id,
      batch_id: c.batch_id,
      batch_name: c.batch_name,
      plan_id: c.plan_id,
      plan_name: c.plan_name,
      installment_numbers: c.installment_numbers
        ? c.installment_numbers.split(",")
        : [],
    }));

    let pagination = null;
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = result.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIdx = (pageNum - 1) * limitNum;
      result = result.slice(startIdx, startIdx + limitNum);

      pagination = {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      };
    }

    return res.status(200).json({
      success: true,
      message: "Collector collection details fetched successfully",
      collector,
      summary,
      count: result.length,
      data: result,
      ...(pagination ? { pagination } : {}),
    });
  } catch (err) {
    console.error("User Collection By Id Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
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


export const getCollectorPerformance = async (req, res) => {
//   Total collections
// Today collection
// Total customers handled
// Recovery rate
// Overdue handled
  try {
    const { from_date, to_date } = req.query;

    const from = `${from_date} 00:00:00`;
    const to = `${to_date} 23:59:59`;

    const [rows] = await db.query(`
      SELECT
        u.id AS collector_id,
        u.username,

        COUNT(DISTINCT cp.customer_id) AS total_customers,

        SUM(cp.total_amount) AS total_collection,

        SUM(
          CASE 
            WHEN DATE(cp.payment_datetime) = CURDATE()
            THEN cp.total_amount ELSE 0
          END
        ) AS today_collection

      FROM chit_collections_payments cp
      JOIN users_roles u ON u.id = cp.collected_by

      WHERE cp.payment_datetime BETWEEN ? AND ?

      GROUP BY u.id
      ORDER BY total_collection DESC
    `, [from, to]);

    return res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Date-wise collection
// Perfect for line chart
export const getDailyAnalytics = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const [rows] = await db.query(`
      SELECT
        DATE(cp.payment_datetime) AS date,
        SUM(cp.total_amount) AS total_collection

      FROM chit_collections_payments cp
      WHERE cp.payment_datetime BETWEEN ? AND ?

      GROUP BY DATE(cp.payment_datetime)
      ORDER BY date ASC
    `, [`${from_date} 00:00:00`, `${to_date} 23:59:59`]);

    return res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Month-wise revenue
// Used for bar chart
export const getMonthlyAnalytics = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(cp.payment_datetime, '%Y-%m') AS month,
        SUM(cp.total_amount) AS total_collection

      FROM chit_collections_payments cp
      GROUP BY month
      ORDER BY month ASC
    `);

    return res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDashboard = async (req, res) => {
  try {

    // 🔹 TOTAL COLLECTION
    const [[total]] = await db.query(`
      SELECT SUM(total_amount) AS total_collection
      FROM chit_collections_payments
    `);

    // 🔹 TODAY COLLECTION
    const [[today]] = await db.query(`
      SELECT SUM(total_amount) AS today_collection
      FROM chit_collections_payments
      WHERE DATE(payment_datetime) = CURDATE()
    `);

    // 🔹 INSTALLMENT STATUS
    const [[inst]] = await db.query(`
      SELECT
        SUM(i.installment_amount) AS total_amount,
        SUM(IFNULL(p.total_paid,0)) AS total_paid,
        SUM(i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        SUM(
          CASE WHEN i.due_date < CURDATE()
          THEN (i.installment_amount - IFNULL(p.total_paid,0))
          ELSE 0 END
        ) AS overdue_amount

      FROM chit_customer_installments i

      LEFT JOIN (
        SELECT installment_id, SUM(allocated_amount) total_paid
        FROM chit_payment_allocations
        GROUP BY installment_id
      ) p ON p.installment_id = i.id
    `);

    // 🔹 PAYMENT MODE SPLIT
    const [[mode]] = await db.query(`
      SELECT
        SUM(pay_upi) AS total_upi,
        SUM(pay_cash) AS total_cash,
        SUM(pay_cheque) AS total_cheque
      FROM chit_collections_payments
    `);

    const recovery_rate = inst.total_amount > 0
      ? ((inst.total_paid / inst.total_amount) * 100).toFixed(2)
      : 0;

    return res.json({
      success: true,
      data: {
        total_collection: Number(total.total_collection || 0),
        today_collection: Number(today.today_collection || 0),

        total_amount: Number(inst.total_amount || 0),
        total_paid: Number(inst.total_paid || 0),
        pending_amount: Number(inst.pending_amount || 0),
        overdue_amount: Number(inst.overdue_amount || 0),

        recovery_rate,

        payment_modes: {
          upi: Number(mode.total_upi || 0),
          cash: Number(mode.total_cash || 0),
          cheque: Number(mode.total_cheque || 0)
        }
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// export const getMobileDashboard = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     if (!user_id) throw new Error("Unauthorized");

//     // 🔹 Get assigned customers
//     const [customers] = await db.query(`
//       SELECT customer_id
//       FROM user_chit_customer_assignments
//       WHERE user_id = ? AND is_active = TRUE
//     `, [user_id]);

//     if (!customers.length) {
//       return res.json({
//         success: true,
//         message: "No assigned customers",
//         data: {}
//       });
//     }

//     const customerIds = customers.map(c => c.customer_id);

//     // 🔹 MAIN DASHBOARD QUERY (FAST)
//     const [rows] = await db.query(`
//       SELECT
//         i.id AS installment_id,
//         i.installment_amount,
//         i.due_date,

//         IFNULL(p.total_paid, 0) AS paid_amount,
//         (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

//         IFNULL(p.today_collection,0) AS today_collection

//       FROM chit_customer_installments i

//       JOIN chit_customer_subscriptions s 
//         ON s.id = i.subscription_id

//       LEFT JOIN (
//         SELECT 
//           pa.installment_id,
//           SUM(pa.allocated_amount) AS total_paid,

//           SUM(
//             CASE 
//               WHEN DATE(cp.payment_datetime) = CURDATE()
//               THEN pa.allocated_amount
//               ELSE 0
//             END
//           ) AS today_collection

//         FROM chit_payment_allocations pa
//         JOIN chit_collections_payments cp 
//           ON cp.id = pa.payment_id

//         GROUP BY pa.installment_id
//       ) p ON p.installment_id = i.id

//       WHERE s.customer_id IN (?)
//     `, [customerIds]);

//     const today = new Date().toISOString().slice(0, 10);

//     // 🔥 CALCULATE METRICS
//     let total_amount = 0;
//     let total_paid = 0;
//     let total_pending = 0;

//     let today_collection = 0;

//     let pending_count = 0;
//     let overdue_count = 0;
//     let paid_count = 0;

//     let overdue_amount = 0;

//     rows.forEach(r => {
//       const amount = Number(r.installment_amount);
//       const paid = Number(r.paid_amount);
//       const pending = Number(r.pending_amount);

//       total_amount += amount;
//       total_paid += paid;
//       total_pending += pending;

//       today_collection += Number(r.today_collection || 0);

//       // 🔹 Status logic
//       if (paid >= amount) {
//         paid_count++;
//       } else if (r.due_date < today) {
//         overdue_count++;
//         overdue_amount += pending;
//       } else {
//         pending_count++;
//       }
//     });

//     // 🔥 FINAL METRICS
//     const response = {
//       customers_count: customerIds.length,

//       total_amount,
//       total_paid,
//       total_pending,

//       today_collection,

//       pending_count,
//       overdue_count,
//       paid_count,

//       overdue_amount,

//       overdue_percentage:
//         total_amount > 0
//           ? ((overdue_amount / total_amount) * 100).toFixed(2)
//           : 0,

//       recovery_rate:
//         total_amount > 0
//           ? ((total_paid / total_amount) * 100).toFixed(2)
//           : 0
//     };

//     return res.json({
//       success: true,
//       data: response
//     });

//   } catch (err) {
//     console.error("Dashboard Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

export const getMobileDashboard = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    // 🔹 Get assigned customers
    const [customers] = await db.query(`
      SELECT customer_id
      FROM user_chit_customer_assignments
      WHERE user_id = ? AND is_active = TRUE
    `, [user_id]);

    if (!customers.length) {
      return res.json({
        success: true,
        message: "No assigned customers",
        data: {}
      });
    }

    const customerIds = customers.map(c => c.customer_id);

    // 🔹 MAIN QUERY
    const [rows] = await db.query(`
      SELECT
        i.id AS installment_id,
        i.installment_amount,
        DATE(i.due_date) AS due_date,

        IFNULL(p.total_paid, 0) AS paid_amount,
        (i.installment_amount - IFNULL(p.total_paid,0)) AS pending_amount,

        IFNULL(p.today_collection,0) AS today_collection

      FROM chit_customer_installments i

      JOIN chit_customer_subscriptions s 
        ON s.id = i.subscription_id

      LEFT JOIN (
        SELECT 
          pa.installment_id,

          SUM(pa.allocated_amount) AS total_paid,

          SUM(
            CASE 
              WHEN DATE(cp.payment_datetime) = CURDATE()
              THEN pa.allocated_amount
              ELSE 0
            END
          ) AS today_collection

        FROM chit_payment_allocations pa
        JOIN chit_collections_payments cp 
          ON cp.id = pa.payment_id

        GROUP BY pa.installment_id
      ) p ON p.installment_id = i.id

      WHERE s.customer_id IN (?)
    `, [customerIds]);

    const today = new Date().toISOString().slice(0, 10);

    // 🔥 METRICS
    let total_amount = 0;
    let total_paid = 0;
    let total_pending = 0;

    let today_collection = 0;

    let pending_count = 0;
    let overdue_count = 0;
    let paid_count = 0;

    let overdue_amount = 0;

    // 🔥 NEW
    let today_pending_amount = 0;
    let today_overdue_amount = 0;

    let today_pending_count = 0;
    let today_overdue_count = 0;

    rows.forEach(r => {
      const amount = Number(r.installment_amount);
      const paid = Number(r.paid_amount);
      const pending = Number(r.pending_amount);
      const dueDate = r.due_date;

      total_amount += amount;
      total_paid += paid;
      total_pending += pending;

      today_collection += Number(r.today_collection || 0);

      // 🔹 STATUS
      if (paid >= amount) {
        paid_count++;
      } 
      else if (dueDate < today) {
        overdue_count++;
        overdue_amount += pending;

        // 🔥 TODAY OVERDUE
        today_overdue_amount += pending;
        today_overdue_count++;
      } 
      else if (dueDate === today) {
        pending_count++;

        // 🔥 TODAY PENDING
        today_pending_amount += pending;
        today_pending_count++;
      } 
      else {
        pending_count++;
      }
    });

    const response = {
      customers_count: customerIds.length,

      total_amount,
      total_paid,
      total_pending,

      today_collection,

      pending_count,
      overdue_count,
      paid_count,

      overdue_amount,

      // 🔥 NEW FIELDS
      today_pending_amount,
      today_pending_count,

      today_overdue_amount,
      today_overdue_count,

      overdue_percentage:
        total_amount > 0
          ? ((overdue_amount / total_amount) * 100).toFixed(2)
          : 0,

      recovery_rate:
        total_amount > 0
          ? ((total_paid / total_amount) * 100).toFixed(2)
          : 0
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
