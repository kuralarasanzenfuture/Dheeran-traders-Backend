import db from "../../config/db.js";
import formatDate from "../../services/formatDate.service.js";

// 1️⃣ Create Installments (Bulk)
export const createInstallments = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { subscription_id, installments } = req.body;

    if (!subscription_id || !installments?.length) {
      throw new Error("subscription_id and installments required");
    }

    // 🚫 Prevent duplicate generation
    const [[existing]] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM chit_customer_installments 
       WHERE subscription_id = ?`,
      [subscription_id],
    );

    if (existing.count > 0) {
      throw new Error("Installments already exist for this subscription");
    }

    const values = installments.map((inst) => [
      subscription_id,
      inst.installment_number,
      inst.due_date,
      inst.installment_amount,
    ]);

    await connection.query(
      `INSERT INTO chit_customer_installments 
       (subscription_id, installment_number, due_date, installment_amount)
       VALUES ?`,
      [values],
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Installments created successfully",
    });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

// 2️⃣ Get All Installments
// export const getAllInstallments = async (req, res) => {
//   try {
//     const { status, subscription_id } = req.query;

//     let query = `SELECT * FROM chit_customer_installments WHERE 1=1`;
//     let params = [];

//     if (status) {
//       query += ` AND status = ?`;
//       params.push(status);
//     }

//     if (subscription_id) {
//       query += ` AND subscription_id = ?`;
//       params.push(subscription_id);
//     }

//     query += ` ORDER BY installment_number ASC`;

//     const [rows] = await db.query(query, params);

//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const getAllInstallments = async (req, res) => {
  try {
    const { status, subscription_id } = req.query;

    let query = `
      SELECT 
        i.id,
        i.subscription_id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
        i.installment_amount,

        COALESCE(SUM(a.allocated_amount), 0) AS paid_amount,

        (i.installment_amount - COALESCE(SUM(a.allocated_amount), 0)) AS pending_amount,

        CASE
          WHEN COALESCE(SUM(a.allocated_amount), 0) = 0 
               AND CURDATE() > i.due_date THEN 'OVERDUE'

          WHEN COALESCE(SUM(a.allocated_amount), 0) = 0 
               THEN 'PENDING'

          WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount 
               AND CURDATE() > i.due_date THEN 'OVERDUE'

          WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount 
               THEN 'PARTIAL'

          WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount 
               AND DATE(MAX(p.payment_datetime)) < i.due_date THEN 'BEFOREPAID'

          WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount 
               THEN 'PAID'

          ELSE 'PENDING'
        END AS status

      FROM chit_customer_installments i

      LEFT JOIN chit_payment_allocations a 
        ON i.id = a.installment_id

      LEFT JOIN chit_collections_payments p 
        ON a.payment_id = p.id

      WHERE 1=1
    `;

    const params = [];

    if (subscription_id) {
      query += ` AND i.subscription_id = ?`;
      params.push(subscription_id);
    }

    query += ` GROUP BY i.id`;

    // 🔥 FILTER AFTER STATUS CALCULATION
    if (status) {
      query = `SELECT * FROM (${query}) AS temp WHERE status = ?`;
      params.push(status);
    }

    query += ` ORDER BY installment_number ASC`;

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 3️⃣ Get Installments by Subscription
// export const getInstallmentsBySubscription = async (req, res) => {
//   try {
//     const { subscription_id } = req.params;

//     const [rows] = await db.query(
//       `SELECT * FROM chit_customer_installments
//        WHERE subscription_id = ?
//        ORDER BY installment_number ASC`,
//       [subscription_id]
//     );

//     const formattedData = rows.map((item) => ({
//       ...item,
//       due_date: item.due_date ? formatDate(item.due_date) : null,
//     }));

//     // ✅ send formatted data
//     res.json({ success: true, data: formattedData });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const getInstallmentsBySubscription = async (req, res) => {
  try {
    const { subscription_id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        i.id,
        i.installment_number,
        DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
        i.installment_amount,

        COALESCE(SUM(a.allocated_amount), 0) AS paid_amount,

        (i.installment_amount - COALESCE(SUM(a.allocated_amount), 0)) AS pending_amount,

        CASE
          WHEN COALESCE(SUM(a.allocated_amount), 0) = 0 
               AND CURDATE() > i.due_date THEN 'OVERDUE'

          WHEN COALESCE(SUM(a.allocated_amount), 0) = 0 
               THEN 'PENDING'

          WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount 
               AND CURDATE() > i.due_date THEN 'OVERDUE'

          WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount 
               THEN 'PARTIAL'

          WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount 
               AND DATE(MAX(p.payment_datetime)) < i.due_date THEN 'BEFOREPAID'

          WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount 
               THEN 'PAID'

          ELSE 'PENDING'
        END AS status

      FROM chit_customer_installments i

      LEFT JOIN chit_payment_allocations a 
        ON i.id = a.installment_id

      LEFT JOIN chit_collections_payments p 
        ON a.payment_id = p.id

      WHERE i.subscription_id = ?

      GROUP BY i.id
      ORDER BY i.installment_number ASC`,
      [subscription_id],
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 4️⃣ Get Single Installment
// export const getInstallmentById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query(
//       `SELECT * FROM chit_customer_installments WHERE id = ?`,
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Installment not found",
//       });
//     }

//     res.json({ success: true, data: rows[0] });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getInstallmentById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query(
//       `SELECT
//         i.id,
//         i.subscription_id,
//         i.installment_number,
//         DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
//         i.installment_amount,

//         COALESCE(SUM(a.allocated_amount), 0) AS paid_amount,

//         (i.installment_amount - COALESCE(SUM(a.allocated_amount), 0)) AS pending_amount,

//         COUNT(a.id) AS payments_count,

//         DATE(MAX(p.payment_datetime)) AS last_payment_date,

//         CASE
//           WHEN COALESCE(SUM(a.allocated_amount), 0) = 0
//                AND CURDATE() > i.due_date THEN 'OVERDUE'

//           WHEN COALESCE(SUM(a.allocated_amount), 0) = 0
//                THEN 'PENDING'

//           WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount
//                AND CURDATE() > i.due_date THEN 'OVERDUE'

//           WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount
//                THEN 'PARTIAL'

//           WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount
//                AND DATE(MAX(p.payment_datetime)) < i.due_date THEN 'BEFOREPAID'

//           WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount
//                THEN 'PAID'

//           ELSE 'PENDING'
//         END AS status

//       FROM chit_customer_installments i

//       LEFT JOIN chit_payment_allocations a
//         ON i.id = a.installment_id

//       LEFT JOIN chit_collections_payments p
//         ON a.payment_id = p.id

//       WHERE i.id = ?

//       GROUP BY i.id`,
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({
//         success: false,
//         message: "Installment not found",
//       });
//     }

//     return res.json({
//       success: true,
//       data: rows[0],
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// show installment summary bit payments
export const getInstallmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ 1. INSTALLMENT SUMMARY
    // const [rows] = await db.query(
    //   `SELECT
    //     i.id,
    //     i.subscription_id,
    //     i.installment_number,
    //     DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
    //     i.installment_amount,

    //     COALESCE(SUM(a.allocated_amount), 0) AS paid_amount,

    //     (i.installment_amount - COALESCE(SUM(a.allocated_amount), 0)) AS pending_amount,

    //     COUNT(a.id) AS payments_count,

    //     DATE(MAX(p.payment_datetime)) AS last_payment_date,

    //     CASE
    //       WHEN COALESCE(SUM(a.allocated_amount), 0) = 0
    //            AND CURDATE() > i.due_date THEN 'OVERDUE'

    //       WHEN COALESCE(SUM(a.allocated_amount), 0) = 0
    //            THEN 'PENDING'

    //       WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount
    //            AND CURDATE() > i.due_date THEN 'OVERDUE'

    //       WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount
    //            THEN 'PARTIAL'

    //       WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount
    //            AND DATE(MAX(p.payment_datetime)) < i.due_date THEN 'BEFOREPAID'

    //       WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount
    //            THEN 'PAID'

    //       ELSE 'PENDING'
    //     END AS status

    //   FROM chit_customer_installments i

    //   LEFT JOIN chit_payment_allocations a
    //     ON i.id = a.installment_id

    //   LEFT JOIN chit_collections_payments p
    //     ON a.payment_id = p.id

    //   WHERE i.id = ?

    //   GROUP BY i.id`,
    //   [id]
    // );

    //   const [rows] = await db.query(
    //     `SELECT
    //   i.id,
    //   i.subscription_id,
    //   i.installment_number,
    //   DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
    //   i.installment_amount,

    //   COALESCE(SUM(a.allocated_amount), 0) AS paid_amount,

    //   (i.installment_amount - COALESCE(SUM(a.allocated_amount), 0)) AS pending_amount,

    //   COUNT(a.id) AS payments_count,

    //   DATE(MAX(p.payment_datetime)) AS last_payment_date,

    //   -- ✅ PAID DATE (ONLY WHEN FULLY PAID)
    //   CASE
    //     WHEN COALESCE(SUM(a.allocated_amount), 0) >= i.installment_amount
    //     THEN DATE(MAX(p.payment_datetime))
    //     ELSE NULL
    //   END AS fully_paid_date,

    //   CASE
    //     WHEN COALESCE(SUM(a.allocated_amount), 0) = 0
    //          AND CURDATE() > i.due_date THEN 'OVERDUE'

    //     WHEN COALESCE(SUM(a.allocated_amount), 0) = 0
    //          THEN 'PENDING'

    //     WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount
    //          AND CURDATE() > i.due_date THEN 'OVERDUE'

    //     WHEN COALESCE(SUM(a.allocated_amount), 0) < i.installment_amount
    //          THEN 'PARTIAL'

    //     WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount
    //          AND DATE(MAX(p.payment_datetime)) < i.due_date THEN 'BEFOREPAID'

    //     WHEN COALESCE(SUM(a.allocated_amount), 0) = i.installment_amount
    //          THEN 'PAID'

    //     ELSE 'PENDING'
    //   END AS status

    // FROM chit_customer_installments i

    // LEFT JOIN chit_payment_allocations a
    //   ON i.id = a.installment_id

    // LEFT JOIN chit_collections_payments p
    //   ON a.payment_id = p.id

    // WHERE i.id = ?

    // GROUP BY i.id`,
    //     [id],
    //   );

    const [rows] = await db.query(
      `SELECT 
    i.id,
    i.subscription_id,
    i.installment_number,

    DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,

    i.installment_amount,

    paid.total_paid AS paid_amount,

    (i.installment_amount - paid.total_paid) AS pending_amount,

    paid.payments_count,

    -- ✅ FIXED LAST PAYMENT DATE (NO UTC ISSUE)
    DATE_FORMAT(paid.last_payment_datetime, '%Y-%m-%d %H:%i:%s') AS last_payment_date,

    -- ✅ FULLY PAID DATE (ONLY WHEN COMPLETED)
    CASE
      WHEN paid.total_paid >= i.installment_amount
      THEN DATE_FORMAT(paid.last_payment_datetime, '%Y-%m-%d %H:%i:%s')
      ELSE NULL
    END AS fully_paid_date,

    -- ✅ CLEAN STATUS LOGIC
    CASE
      WHEN paid.total_paid = 0 AND CURDATE() > i.due_date THEN 'OVERDUE'
      WHEN paid.total_paid = 0 THEN 'PENDING'

      WHEN paid.total_paid < i.installment_amount AND CURDATE() > i.due_date THEN 'OVERDUE'
      WHEN paid.total_paid < i.installment_amount THEN 'PARTIAL'

      WHEN paid.total_paid = i.installment_amount 
           AND DATE(paid.last_payment_datetime) < i.due_date THEN 'BEFOREPAID'

      WHEN paid.total_paid = i.installment_amount THEN 'PAID'

      ELSE 'PENDING'
    END AS status

  FROM chit_customer_installments i

  -- ✅ AGGREGATION SUBQUERY (IMPORTANT FIX)
  LEFT JOIN (
    SELECT 
      a.installment_id,
      SUM(a.allocated_amount) AS total_paid,
      COUNT(a.id) AS payments_count,
      MAX(p.payment_datetime) AS last_payment_datetime
    FROM chit_payment_allocations a
    LEFT JOIN chit_collections_payments p 
      ON a.payment_id = p.id
    GROUP BY a.installment_id
  ) paid ON i.id = paid.installment_id

  WHERE i.id = ?`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Installment not found",
      });
    }

    // ✅ 2. PAYMENT HISTORY (THIS IS WHAT YOU WERE MISSING)
    const [payments] = await db.query(
      `SELECT 
        p.id AS payment_id,
        DATE_FORMAT(p.payment_datetime, '%Y-%m-%d %H:%i:%s') AS payment_datetime,

        a.allocated_amount,

        p.pay_cash,
        p.pay_upi,
        p.pay_cheque,
        p.pay_upi_reference,

        p.total_amount,
        p.remarks

      FROM chit_payment_allocations a

      INNER JOIN chit_collections_payments p 
        ON a.payment_id = p.id

      WHERE a.installment_id = ?

      ORDER BY p.payment_datetime DESC`,
      [id],
    );

    return res.json({
      success: true,
      data: {
        installment: rows[0],
        payments: payments,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// 5️⃣ Update Installment
export const updateInstallment = async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date, installment_amount, status } = req.body;

    const [result] = await db.query(
      `UPDATE chit_customer_installments
       SET due_date = ?, installment_amount = ?, status = ?
       WHERE id = ?`,
      [due_date, installment_amount, status, id],
    );

    res.json({
      success: true,
      message: "Installment updated",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6️⃣ Delete Installment
export const deleteInstallment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`DELETE FROM chit_customer_installments WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: "Installment deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7️⃣ Pay Installment (CORE LOGIC)
// export const payInstallment = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { amount } = req.body;

//     const [[installment]] = await db.query(
//       `SELECT * FROM chit_customer_installments WHERE id = ?`,
//       [id]
//     );

//     if (!installment) {
//       return res.status(404).json({
//         success: false,
//         message: "Installment not found",
//       });
//     }

//     let newPaid = parseFloat(installment.paid_amount) + parseFloat(amount);

//     let newStatus = "PENDING";

//     if (newPaid === installment.installment_amount) {
//       newStatus = "PAID";
//     } else if (newPaid < installment.installment_amount) {
//       newStatus = "PARTIAL";
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: "Overpayment not allowed",
//       });
//     }

//     await db.query(
//       `UPDATE chit_customer_installments
//        SET paid_amount = ?, status = ?
//        WHERE id = ?`,
//       [newPaid, newStatus, id]
//     );

//     res.json({
//       success: true,
//       message: "Payment updated",
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const payInstallment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let { amount } = req.body;

    // 🔒 Basic validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    amount = Number(parseFloat(amount).toFixed(2));

    // 🔒 Lock row to prevent concurrent updates
    const [[installment]] = await connection.query(
      `SELECT * FROM chit_customer_installments WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!installment) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Installment not found",
      });
    }

    const installmentAmount = Number(installment.installment_amount);
    const paidAmount = Number(installment.paid_amount);

    // 🚫 Already fully paid
    if (paidAmount >= installmentAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Installment already fully paid",
      });
    }

    // ➕ Add payment safely
    let newPaid = Number((paidAmount + amount).toFixed(2));

    // 🚫 Overpayment check
    if (newPaid > installmentAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Overpayment not allowed",
      });
    }

    // 🎯 Status logic
    let newStatus = "PARTIAL";

    if (Math.abs(newPaid - installmentAmount) < 0.01) {
      newPaid = installmentAmount; // normalize
      newStatus = "PAID";
    }

    // 💾 Update installment
    await connection.query(
      `UPDATE chit_customer_installments
       SET paid_amount = ?, status = ?
       WHERE id = ?`,
      [newPaid, newStatus, id],
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Payment updated successfully",
      data: {
        installment_id: id,
        paid_amount: newPaid,
        status: newStatus,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
