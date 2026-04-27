import db from "../../../config/db.js";

// export const getAllReturns = async (req, res) => {
//   try {
//     const {
//       from_date,
//       to_date,
//       billing_id,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     const offset = (page - 1) * limit;

//     let where = `WHERE 1=1`;
//     const params = [];

//     if (billing_id) {
//       where += ` AND r.billing_id=?`;
//       params.push(billing_id);
//     }

//     if (from_date && to_date) {
//       where += ` AND r.return_date BETWEEN ? AND ?`;
//       params.push(from_date, to_date);
//     }

//     const [rows] = await db.query(
//       `SELECT 
//         r.*,
//         b.invoice_number,
//         b.customer_name
//       FROM customerBillingReturns r
//       JOIN customerBilling b ON b.id = r.billing_id
//       ${where}
//       ORDER BY r.id DESC
//       LIMIT ? OFFSET ?`,
//       [...params, Number(limit), Number(offset)]
//     );

//     res.json({ data: rows });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

export const getAllReturns = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        r.*,
        b.invoice_number,
        b.customer_name,
        b.phone_number
      FROM customerBillingReturns r
      JOIN customerBilling b ON b.id = r.billing_id
      ORDER BY r.id DESC`
    );

    res.json({
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Get All Returns Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[returnData]] = await db.query(
      `SELECT * FROM customerBillingReturns WHERE id=?`,
      [id],
    );

    if (!returnData) {
      return res.status(404).json({ message: "Return not found" });
    }

    // const [products] = await db.query(
    //   `SELECT
    //     rp.*,
    //     p.product_name,
    //     p.brand,
    //     p.category,
    //     p.quantity
    //   FROM customerBillingReturnsProducts rp
    //   JOIN products p ON p.id = rp.product_id
    //   WHERE rp.return_id=?`,
    //   [id],
    // );

    // const [products] = await db.query(
    //   `SELECT
    //     rp.*,
    //     p.product_name,
    //     p.product_brand AS brand,
    //     p.product_category AS category,
    //     p.quantity,
    //     p.product_quantity,
    //     p.rate AS original_rate,
    //     p.total AS original_total
    //   FROM customerBillingReturnsProducts rp
    //   JOIN customerBillingProducts p ON p.id = rp.product_id
    //   WHERE rp.return_id = ?`,
    //   [id],
    // );

    const [products] = await db.query(`
  SELECT 
    rp.*,
    p.product_name,
    p.product_brand AS brand,
    p.product_category AS category,
    p.quantity,
    p.product_quantity,
    p.rate AS original_rate,
    p.total AS original_total,

    -- 🔥 total paid for billing
    (cb.advance_paid + COALESCE(SUM(pay.total_amount), 0)) AS total_paid,

    -- 🔥 total pending for billing
    (
      cb.grand_total - 
      (cb.advance_paid + COALESCE(SUM(pay.total_amount), 0))
    ) AS total_pending_amount,

    -- 🔥 product paid
    (
      (p.total / NULLIF(cb.grand_total, 0)) * 
      (cb.advance_paid + COALESCE(SUM(pay.total_amount), 0))
    ) AS product_paid_amount,

    -- 🔥 product pending
    (
      p.total - 
      (
        (p.total / NULLIF(cb.grand_total, 0)) * 
        (cb.advance_paid + COALESCE(SUM(pay.total_amount), 0))
      )
    ) AS product_pending_amount

  FROM customerBillingReturnsProducts rp

  JOIN customerBillingProducts p 
    ON p.id = rp.billing_product_id

  JOIN customerBilling cb 
    ON cb.id = p.billing_id

  LEFT JOIN customerBillingPayment pay 
    ON pay.billing_id = cb.id

  WHERE rp.return_id = ?

  GROUP BY rp.id
`, [id]);

    res.json({
      data: {
        ...returnData,
        products,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReturnsByBillingId = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [returns] = await db.query(
      `SELECT * FROM customerBillingReturns WHERE billing_id=? ORDER BY id DESC`,
      [billing_id]
    );

    res.json({ data: returns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReturnSummary = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        cbp.id AS billing_product_id,
        cbp.product_id,
        cbp.product_name,
        cbp.quantity AS sold_qty,
        COALESCE(cbp.returned_quantity,0) AS returned_qty,
        (cbp.quantity - COALESCE(cbp.returned_quantity,0)) AS remaining_qty
      FROM customerBillingProducts cbp
      WHERE cbp.billing_id=?`,
      [billing_id]
    );

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReturnWithInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const [[data]] = await db.query(
      `SELECT 
        r.*,
        b.invoice_number,
        b.customer_name,
        b.phone_number
      FROM customerBillingReturns r
      JOIN customerBilling b ON b.id = r.billing_id
      WHERE r.id=?`,
      [id]
    );

    if (!data) {
      return res.status(404).json({ message: "Return not found" });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
