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

        const formattedData = rows.map(row => ({
            batch_id: row.batch_id,
            batch_name: row.batch_name,
            plan: row.plan_name,
            start_date: row.start_date,
            end_date: row.end_date,
            members: row.total_members,
            total_investment: row.total_investment,
            total_collected: row.total_collected,
            installments: `${row.installments_done}/${row.total_installments}`,
            status: row.status
        }));

        return res.status(200).json({
            success: true,
            message: "Batch report fetched successfully",
            data: formattedData
        });

    } catch (error) {
        console.error("Batch Report Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
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

        rows.forEach(row => {

            if (!result[row.agent_staff_id]) {
                result[row.agent_staff_id] = {
                    agent_staff_id: row.agent_staff_id,
                    name: row.agent_name,
                    mobile: row.agent_phone,
                    reference_type: row.reference_mode,
                    status: row.status === 'active' ? 'Active' : 'Inactive',
                    total_referrals: 0,
                    total_chit_value: 0,
                    customers: []
                };
            }

            // If customer exists
            if (row.customer_id) {
                result[row.agent_staff_id].customers.push({
                    customer_id: row.customer_id,
                    customer_name: row.customer_name,
                    mobile: row.customer_phone,
                    investment_amount: row.investment_amount
                });

                result[row.agent_staff_id].total_referrals += 1;
                result[row.agent_staff_id].total_chit_value += Number(row.investment_amount || 0);
            }

        });

        return res.status(200).json({
            success: true,
            message: "Agent/Staff report with customers fetched successfully",
            data: Object.values(result)
        });

    } catch (error) {
        console.error("Agent/Staff Report Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
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

        rows.forEach(row => {

            if (!result[row.customer_id]) {
                result[row.customer_id] = {
                    customer_id: row.customer_id,
                    name: row.customer_name,
                    mobile: row.phone,
                    total_subscriptions: 0,
                    total_investment: 0,
                    subscriptions: []
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
                    investment_amount: row.investment_amount
                });

                result[row.customer_id].total_subscriptions += 1;
                result[row.customer_id].total_investment += Number(row.investment_amount || 0);
            }

        });

        return res.status(200).json({
            success: true,
            message: "Customer report fetched successfully",
            data: Object.values(result)
        });

    } catch (error) {
        console.error("Customer Report Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
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

        rows.forEach(row => {

            if (!result[row.plan_id]) {
                result[row.plan_id] = {
                    plan_id: row.plan_id,
                    plan_name: row.plan_name,
                    collection_type: row.collection_type,
                    total_installments: row.total_installments,
                    total_subscriptions: 0,
                    total_investment: 0,
                    subscriptions: []
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
                    investment_amount: row.investment_amount
                });

                result[row.plan_id].total_subscriptions += 1;
                result[row.plan_id].total_investment += Number(row.investment_amount || 0);
            }

        });

        return res.status(200).json({
            success: true,
            message: "Plan report fetched successfully",
            data: Object.values(result)
        });

    } catch (error) {
        console.error("Plan Report Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
