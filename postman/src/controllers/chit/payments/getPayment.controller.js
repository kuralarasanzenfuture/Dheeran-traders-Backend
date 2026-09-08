import db from "../../../config/db.js";

// export const getPaymentById = async (req, res) => {
//   try {
//     const { payment_id } = req.params;

//     if (!payment_id) throw new Error("payment_id required");

//     // 🔹 PAYMENT INFO
//     const [payments] = await db.query(
//       `SELECT
//         p.*,
//         c.name AS customer_name,
//         c.phone AS customer_phone,
//         c.address AS customer_address
//       FROM chit_collections_payments p
//       LEFT JOIN chit_customers c
//         ON c.id = p.customer_id
//       WHERE p.id = ?`,
//       [payment_id]
//     );

//     if (!payments.length) {
//       throw new Error("Payment not found");
//     }

//     const payment = payments[0];

//     // 🔥 CORRECT INSTALLMENT DATA
//     const [allocations] = await db.query(
//       `SELECT
//         i.id AS installment_id,
//         i.installment_number,
//         i.installment_amount,

//         -- paid in this payment
//         a.allocated_amount AS paid_now,

//         -- total paid so far
//         COALESCE(SUM(a2.allocated_amount), 0) AS total_paid,

//         -- pending
//         (i.installment_amount - COALESCE(SUM(a2.allocated_amount), 0)) AS pending_amount,

//         -- status
//         CASE
//           WHEN SUM(a2.allocated_amount) >= i.installment_amount THEN 'PAID'
//           WHEN SUM(a2.allocated_amount) > 0 THEN 'PARTIAL'
//           ELSE 'PENDING'
//         END AS status

//       FROM chit_payment_allocations a

//       JOIN chit_customer_installments i
//         ON i.id = a.installment_id

//       LEFT JOIN chit_payment_allocations a2
//         ON a2.installment_id = i.id

//       WHERE a.payment_id = ?

//       GROUP BY i.id, a.allocated_amount`,
//       [payment_id]
//     );

//     return res.json({
//       success: true,
//       data: {
//         payment,
//         installments: allocations,
//       },
//     });

//   } catch (err) {
//     console.log("chit getPaymentById", err);
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const getPaymentById = async (req, res) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) {
      throw new Error("payment_id required");
    }

    // ======================================================
    // PAYMENT INFO
    // ======================================================

    const [payments] = await db.query(
      `
      SELECT
        p.*,

        c.name AS customer_name,
        c.phone AS customer_phone,
        c.address AS customer_address

      FROM chit_collections_payments p

      LEFT JOIN chit_customers c
        ON c.id = p.customer_id

      WHERE p.id = ?
      `,
      [payment_id],
    );

    if (!payments.length) {
      throw new Error("Payment not found");
    }

    const payment = payments[0];

    // ======================================================
    // FIND SUBSCRIPTION
    // ======================================================

    const [[subscription]] = await db.query(
      `
      SELECT
        s.*,

        c.name AS customer_name,
        c.phone AS customer_phone,

        b.batch_name,

        pl.plan_name

      FROM chit_customer_subscriptions s

      LEFT JOIN chit_customers c
        ON c.id = s.customer_id

      LEFT JOIN batches b
        ON b.id = s.batch_id

      LEFT JOIN plans pl
        ON pl.id = s.plan_id

      WHERE s.id = (
        SELECT i.subscription_id

        FROM chit_payment_allocations a

        INNER JOIN chit_customer_installments i
          ON i.id = a.installment_id

        WHERE a.payment_id = ?

        LIMIT 1
      )
      `,
      [payment_id],
    );

    if (!subscription) {
      throw new Error(
        "Subscription not found for this payment",
      );
    }

    // ======================================================
    // ALL INSTALLMENTS
    // ======================================================

    const [allocations] = await db.query(
      `
      SELECT

        i.id AS installment_id,

        i.installment_number,

        i.due_date,

        i.installment_amount,

        /* -----------------------------------------------
           PAID IN CURRENT PAYMENT
        ------------------------------------------------ */

        COALESCE(
          SUM(
            CASE
              WHEN a.payment_id = ?
              THEN a.allocated_amount
              ELSE 0
            END
          ),
          0
        ) AS paid_now,

        /* -----------------------------------------------
           TOTAL PAID ACROSS ALL PAYMENTS
        ------------------------------------------------ */

        COALESCE(
          SUM(a.allocated_amount),
          0
        ) AS total_paid,

        /* -----------------------------------------------
           PENDING
        ------------------------------------------------ */

        GREATEST(
          i.installment_amount -
          COALESCE(SUM(a.allocated_amount), 0),
          0
        ) AS pending_amount,

        /* -----------------------------------------------
           STATUS
        ------------------------------------------------ */

        CASE

          WHEN COALESCE(SUM(a.allocated_amount), 0)
               >= i.installment_amount

            THEN 'PAID'

          WHEN COALESCE(SUM(a.allocated_amount), 0) > 0

            THEN 'PARTIAL'

          ELSE 'PENDING'

        END AS status

      FROM chit_customer_installments i

      LEFT JOIN chit_payment_allocations a
        ON a.installment_id = i.id

      WHERE i.subscription_id = ?

      GROUP BY
        i.id,
        i.installment_number,
        i.due_date,
        i.installment_amount

      ORDER BY
        i.installment_number ASC
      `,
      [
        payment_id,
        subscription.id,
      ],
    );

    // ======================================================
    // TODAY
    // ======================================================

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    // ======================================================
    // FORMAT INSTALLMENTS
    // ======================================================

    const formattedAllocations = allocations.map(
      (item) => {
        const dueDate = new Date(item.due_date);

        dueDate.setHours(0, 0, 0, 0);

        const pendingAmount =
          Number(item.pending_amount || 0);

        const isOverdue =
          pendingAmount > 0 &&
          dueDate < today;

        return {
          installment_id:
            item.installment_id,

          installment_number:
            item.installment_number,

          due_date:
            item.due_date,

          installment_amount:
            Number(item.installment_amount),

          paid_now:
            Number(item.paid_now),

          total_paid:
            Number(item.total_paid),

          pending_amount:
            pendingAmount,

          status:
            item.status,

          overdue:
            isOverdue,

          overdue_amount:
            isOverdue
              ? pendingAmount
              : 0,
        };
      },
    );

    // ======================================================
    // SUMMARY COUNTS
    // ======================================================

    const totalInstallments =
      formattedAllocations.length;

    const paidInstallments =
      formattedAllocations.filter(
        (item) => item.status === "PAID",
      ).length;

    const partialInstallments =
      formattedAllocations.filter(
        (item) => item.status === "PARTIAL",
      ).length;

    const pendingInstallments =
      formattedAllocations.filter(
        (item) =>
          item.status === "PENDING",
      ).length;

    const overdueInstallments =
      formattedAllocations.filter(
        (item) => item.overdue,
      ).length;

    // ======================================================
    // TOTAL PLAN AMOUNT
    // ======================================================

    const totalPlanAmount =
      formattedAllocations.reduce(
        (sum, item) =>
          sum +
          Number(
            item.installment_amount || 0,
          ),
        0,
      );

    // ======================================================
    // TOTAL PAID
    // ======================================================

    const totalPaidAmount =
      formattedAllocations.reduce(
        (sum, item) =>
          sum +
          Number(item.total_paid || 0),
        0,
      );

    // ======================================================
    // TOTAL PENDING
    // ======================================================

    const totalPendingAmount =
      Math.max(
        totalPlanAmount -
          totalPaidAmount,
        0,
      );

    // ======================================================
    // TOTAL OVERDUE
    // ======================================================

    const totalOverdueAmount =
      formattedAllocations.reduce(
        (sum, item) =>
          sum +
          Number(
            item.overdue_amount || 0,
          ),
        0,
      );

    // ======================================================
    // NON-OVERDUE PENDING
    // ======================================================

    const upcomingPendingAmount =
      Math.max(
        totalPendingAmount -
          totalOverdueAmount,
        0,
      );

    // ======================================================
    // PAID IN THIS PAYMENT
    // ======================================================

    const paidNow =
      formattedAllocations.reduce(
        (sum, item) =>
          sum +
          Number(item.paid_now || 0),
        0,
      );

    // ======================================================
    // REMAINING INSTALLMENTS
    // ======================================================

    const remainingInstallments =
      formattedAllocations.filter(
        (item) =>
          Number(
            item.pending_amount || 0,
          ) > 0,
      ).length;

    // ======================================================
    // PAYMENT PERCENTAGE
    // ======================================================

    const paymentPercentage =
      totalPlanAmount > 0
        ? Number(
            (
              (totalPaidAmount /
                totalPlanAmount) *
              100
            ).toFixed(2),
          )
        : 0;

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.json({
      success: true,

      data: {

        // ==================================================
        // PAYMENT
        // ==================================================

        payment,

        // ==================================================
        // SUBSCRIPTION
        // ==================================================

        subscription: {
          subscription_id:
            subscription.id,

          customer_id:
            subscription.customer_id,

          customer_name:
            subscription.customer_name,

          customer_phone:
            subscription.customer_phone,

          batch_id:
            subscription.batch_id,

          batch_name:
            subscription.batch_name,

          plan_id:
            subscription.plan_id,

          plan_name:
            subscription.plan_name,

          installment_amount:
            Number(
              subscription.installment_amount,
            ),

          investment_amount:
            Number(
              subscription.investment_amount,
            ),

          start_date:
            subscription.start_date,

          duration:
            subscription.duration,

          end_date:
            subscription.end_date,

          reference_mode:
            subscription.reference_mode,

          agent_staff_id:
            subscription.agent_staff_id,
        },

        // ==================================================
        // PAYMENT SUMMARY
        // ==================================================

        summary: {

          // Plan
          total_plan_amount:
            Number(
              totalPlanAmount.toFixed(2),
            ),

          // Installments
          total_installments:
            totalInstallments,

          paid_installments:
            paidInstallments,

          partial_installments:
            partialInstallments,

          pending_installments:
            pendingInstallments,

          remaining_installments:
            remainingInstallments,

          // Money
          total_paid_amount:
            Number(
              totalPaidAmount.toFixed(2),
            ),

          total_pending_amount:
            Number(
              totalPendingAmount.toFixed(2),
            ),

          paid_in_this_payment:
            Number(
              paidNow.toFixed(2),
            ),

          // Overdue
          overdue_installments:
            overdueInstallments,

          total_overdue_amount:
            Number(
              totalOverdueAmount.toFixed(2),
            ),

          // Future pending
          upcoming_pending_amount:
            Number(
              upcomingPendingAmount.toFixed(2),
            ),

          // Progress
          payment_percentage:
            paymentPercentage,
        },

        // ==================================================
        // INSTALLMENTS
        // ==================================================

        installments:
          formattedAllocations,
      },
    });

  } catch (err) {

    console.error(
      "chit getPaymentById",
      err,
    );

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    // 🔹 1. GET ALL PAYMENTS
    const [payments] = await db.query(
      `SELECT 
        p.id,
        p.customer_id,
        c.name AS customer_name,
        p.subscription_id,
        p.payment_type,
        p.total_amount,
        p.pay_cash,
        p.pay_upi,
        p.pay_cheque,
        p.payment_datetime
      FROM chit_collections_payments p
      LEFT JOIN chit_customers c 
        ON c.id = p.customer_id
      ORDER BY p.id DESC`,
    );

    if (!payments.length) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const paymentIds = payments.map((p) => p.id);

    // 🔹 2. GET ALL INSTALLMENT ALLOCATIONS
    const [rows] = await db.query(
      `SELECT 
        a.payment_id,
        i.installment_number,
        i.installment_amount,
        a.allocated_amount AS paid_now
      FROM chit_payment_allocations a
      JOIN chit_customer_installments i 
        ON i.id = a.installment_id
      WHERE a.payment_id IN (?)`,
      [paymentIds],
    );

    // 🔹 3. MAP INSTALLMENTS
    const map = {};

    for (let row of rows) {
      if (!map[row.payment_id]) {
        map[row.payment_id] = [];
      }

      map[row.payment_id].push({
        installment_number: row.installment_number,
        installment_amount: row.installment_amount,
        paid_now: row.paid_now,
      });
    }

    // 🔹 4. ATTACH TO PAYMENTS
    for (let payment of payments) {
      payment.installments = map[payment.id] || [];
    }

    return res.json({
      success: true,
      data: payments,
    });
  } catch (err) {
    console.log("chit getAllPayments", err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getPaymentWithInstallments = async (req, res) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) throw new Error("payment_id required");

    // 🔹 PAYMENT INFO
    const [paymentRows] = await db.query(
      `SELECT p.*, c.name AS customer_name
       FROM chit_collections_payments p
       LEFT JOIN chit_customers c ON c.id = p.customer_id
       WHERE p.id = ?`,
      [payment_id],
    );

    if (!paymentRows.length) {
      throw new Error("Payment not found");
    }

    const payment = paymentRows[0];

    // 🔥 INSTALLMENT DETAILS (IMPORTANT QUERY)
    const [installments] = await db.query(
      `SELECT 
        i.id AS installment_id,
        i.installment_number,
        i.installment_amount,

        -- amount paid in THIS payment
        COALESCE(a.allocated_amount, 0) AS paid_in_this_payment,

        -- total paid across ALL payments
        COALESCE(SUM(a2.allocated_amount), 0) AS total_paid,

        -- remaining balance
        (i.installment_amount - COALESCE(SUM(a2.allocated_amount), 0)) AS pending_amount,

        -- status
        CASE 
          WHEN SUM(a2.allocated_amount) >= i.installment_amount THEN 'PAID'
          WHEN SUM(a2.allocated_amount) > 0 THEN 'PARTIAL'
          ELSE 'PENDING'
        END AS status

      FROM chit_payment_allocations a

      JOIN chit_customer_installments i 
        ON i.id = a.installment_id

      LEFT JOIN chit_payment_allocations a2 
        ON a2.installment_id = i.id

      WHERE a.payment_id = ?

      GROUP BY i.id`,
      [payment_id],
    );

    return res.json({
      success: true,
      data: {
        payment,
        installments,
      },
    });
  } catch (err) {
    console.log("chit getPaymentWithInstallments", err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
