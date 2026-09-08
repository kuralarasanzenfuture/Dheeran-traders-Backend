// import db from "../../config/db.js";

// /* CREATE PLAN */
// // export const createPlan = async (req, res) => {
// //   try {
// //     const { plan_name, plan_duration } = req.body;

// //     if (!plan_name || !plan_duration) {
// //       return res.status(400).json({ message: "All fields required" });
// //     }

// //     const [result] = await db.query(
// //       "INSERT INTO plans (plan_name, plan_duration) VALUES (?, ?)",
// //       [plan_name, plan_duration]
// //     );

// //     res.status(201).json({
// //       message: "Plan created successfully",
// //       id: result.insertId
// //     });

// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };

// export const createPlan = async (req, res) => {
//   try {
//     let { plan_name, plan_duration } = req.body;

//     if (!plan_name || !plan_duration) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     // convert to uppercase
//     plan_name = plan_name.trim().toUpperCase();

//     // check duplicate
//     const [exists] = await db.query(
//       "SELECT id FROM plans WHERE plan_name = ? AND plan_duration = ?",
//       [plan_name , plan_duration]
//     );

//     if (exists.length > 0) {
//       return res.status(409).json({ message: "Plan already exists" });
//     }

//     const [result] = await db.query(
//       "INSERT INTO plans (plan_name, plan_duration) VALUES (?, ?)",
//       [plan_name, plan_duration]
//     );

//     res.status(201).json({
//       message: "Plan created successfully",
//       id: result.insertId,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* GET ALL PLANS */
// export const getAllPlans = async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM plans ORDER BY id DESC");
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* GET PLAN BY ID */
// export const getPlanById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query("SELECT * FROM plans WHERE id = ?", [id]);

//     if (rows.length === 0) {
//       return res.status(404).json({ message: "Plan not found" });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* UPDATE PLAN */
// // export const updatePlan = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { plan_name, plan_duration } = req.body;

// //     const [result] = await db.query(
// //       "UPDATE plans SET plan_name=?, plan_duration=? WHERE id=?",
// //       [plan_name, plan_duration, id]
// //     );

// //     if (result.affectedRows === 0) {
// //       return res.status(404).json({ message: "Plan not found" });
// //     }

// //     res.json({ message: "Plan updated successfully" });
// //   } catch (err) {
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };

// export const updatePlan = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let { plan_name, plan_duration } = req.body;

//     if (!plan_name || !plan_duration) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     // convert to uppercase
//     plan_name = plan_name.trim().toUpperCase();

//     // check duplicate except current record
//     const [exists] = await db.query(
//       "SELECT id FROM plans WHERE plan_name = ? AND plan_duration = ? AND id != ?",
//       [plan_name, plan_duration, id]
//     );

//     if (exists.length > 0) {
//       return res.status(409).json({ message: "Plan already exists" });
//     }

//     const [result] = await db.query(
//       "UPDATE plans SET plan_name = ?, plan_duration = ? WHERE id = ?",
//       [plan_name, plan_duration, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Plan not found" });
//     }

//     res.json({ message: "Plan updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* DELETE PLAN */
// export const deletePlan = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [result] = await db.query(
//       "DELETE FROM plans WHERE id=?",
//       [id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Plan not found" });
//     }

//     res.json({ message: "Plan deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// ----------------------------------------------------------------------------------------
import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

/* CREATE PLAN */
// export const createPlan = async (req, res) => {
//   try {
//     let { plan_name, duration_days, collection_type, total_installments } = req.body;

//     if (!plan_name || !duration_days || !collection_type || !total_installments) {
//       return res.status(400).json({
//         message: "plan_name, duration_days, collection_type and total_installments are required",
//       });
//     }

//     plan_name = plan_name.trim().toUpperCase();
//     collection_type = collection_type.toUpperCase();

//     const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "SINGLE"];

//     if (!allowedTypes.includes(collection_type)) {
//       return res.status(400).json({
//         message: "collection_type must be DAILY, WEEKLY, MONTHLY or SINGLE",
//       });
//     }

//     if (isNaN(duration_days) || duration_days <= 0) {
//       return res.status(400).json({
//         message: "duration_days must be a positive number",
//       });
//     }

//     if (isNaN(total_installments) || total_installments <= 0) {
//       return res.status(400).json({
//         message: "total_installments must be a positive number",
//       });
//     }

//     const [exists] = await db.query(
//       `SELECT id FROM plans
//        WHERE plan_name = ?
//        AND duration_days = ?
//        AND collection_type = ?`,
//       [plan_name, duration_days, collection_type]
//     );

//     if (exists.length > 0) {
//       return res.status(409).json({
//         message: "Plan already exists",
//       });
//     }

//     const [result] = await db.query(
//       `INSERT INTO plans
//        (plan_name, duration_days, collection_type, total_installments)
//        VALUES (?, ?, ?, ?)`,
//       [plan_name, duration_days, collection_type, total_installments]
//     );

//     const [newPlan] = await db.query(
//       `SELECT * FROM plans WHERE id = ?`,
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Plan created successfully",
//       data: newPlan[0],
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

/* GET ALL PLANS */
export const getAllPlans = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        id,
        plan_name,
        duration_days,
        collection_type,
        total_installments,
        created_at
       FROM plans
       ORDER BY id DESC`,
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* GET PLAN BY ID */
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`SELECT * FROM plans WHERE id = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Plan not found",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* UPDATE PLAN */
// export const updatePlan = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let { plan_name, duration_days, collection_type, total_installments } =
//       req.body;

//     if (
//       !plan_name ||
//       !duration_days ||
//       !collection_type ||
//       !total_installments
//     ) {
//       return res.status(400).json({
//         message: "All fields are required",
//       });
//     }

//     plan_name = plan_name.trim().toUpperCase();
//     collection_type = collection_type.toUpperCase();

//     const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "SINGLE"];

//     if (!allowedTypes.includes(collection_type)) {
//       return res.status(400).json({
//         message: "Invalid collection type",
//       });
//     }

//     const [exists] = await db.query(
//       `SELECT id FROM plans
//        WHERE plan_name = ?
//        AND duration_days = ?
//        AND collection_type = ?
//        AND id != ?`,
//       [plan_name, duration_days, collection_type, id],
//     );

//     if (exists.length > 0) {
//       return res.status(409).json({
//         message: "Another plan with same details already exists",
//       });
//     }

//     const [result] = await db.query(
//       `UPDATE plans
//        SET plan_name = ?, duration_days = ?, collection_type = ?, total_installments = ?
//        WHERE id = ?`,
//       [plan_name, duration_days, collection_type, total_installments, id],
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         message: "Plan not found",
//       });
//     }

//     const [updated] = await db.query(`SELECT * FROM plans WHERE id = ?`, [id]);

//     res.json({
//       message: "Plan updated successfully",
//       data: updated[0],
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

/* DELETE PLAN */
// export const deletePlan = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [plan] = await db.query(`SELECT * FROM plans WHERE id = ?`, [id]);

//     if (plan.length === 0) {
//       return res.status(404).json({
//         message: "Plan not found",
//       });
//     }

//     await db.query(`DELETE FROM plans WHERE id = ?`, [id]);

//     res.json({
//       message: "Plan deleted successfully",
//       deleted_data: plan[0],
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// -------------------------------------- hard delete-------------------------------------------------------

export const createPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let {
      plan_name,
      duration_days,
      collection_type,
      total_installments,
      remarks,
    } = req.body;
    const userId = req.user?.id;

    if (
      !plan_name ||
      !duration_days ||
      !collection_type ||
      !total_installments
    ) {
      return res.status(400).json({ message: "All fields required" });
    }

    plan_name = plan_name.trim().toUpperCase();
    collection_type = collection_type.toUpperCase();

    const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY", "SINGLE"];

    if (!allowedTypes.includes(collection_type)) {
      return res.status(400).json({ message: "Invalid collection type" });
    }

    const [exists] = await connection.query(
      `SELECT id FROM plans 
       WHERE plan_name = ? AND duration_days = ? AND collection_type = ?`,
      [plan_name, duration_days, collection_type],
    );

    if (exists.length) {
      return res.status(409).json({ message: "Plan already exists" });
    }

    const [result] = await connection.query(
      `INSERT INTO plans (plan_name, duration_days, collection_type, total_installments, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [plan_name, duration_days, collection_type, total_installments, userId],
    );

    const [newPlan] = await connection.query(
      `SELECT * FROM plans WHERE id = ?`,
      [result.insertId],
    );

    // ✅ AUDIT
    await AuditLog({
      connection,
      table: "plans",
      recordId: result.insertId,
      action: "INSERT",
      newData: newPlan[0],
      userId: userId,
      remarks: remarks || "Plan created",
    });

    await connection.commit();

    res.status(201).json({
      message: "Plan created successfully",
      data: newPlan[0],
    });
  } catch (err) {
    console.error(`Create plan error: ${err}`);
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

export const updatePlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let {
      plan_name,
      duration_days,
      collection_type,
      total_installments,
      remarks,
    } = req.body;
    const userId = req.user?.id;

    const [oldPlanRows] = await connection.query(
      `SELECT * FROM plans WHERE id = ?`,
      [id],
    );

    if (!oldPlanRows.length) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const oldPlan = oldPlanRows[0];

    plan_name = plan_name.trim().toUpperCase();
    collection_type = collection_type.toUpperCase();

    await connection.query(
      `UPDATE plans
       SET plan_name = ?, duration_days = ?, collection_type = ?, total_installments = ?, updated_by = ?
       WHERE id = ?`,
      [
        plan_name,
        duration_days,
        collection_type,
        total_installments,
        userId,
        id,
      ],
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM plans WHERE id = ?`,
      [id],
    );

    const updatedPlan = updatedRows[0];

    // ✅ AUDIT
    await AuditLog({
      connection,
      table: "plans",
      recordId: id,
      action: "UPDATE",
      oldData: oldPlan,
      newData: updatedPlan,
      userId: userId,
      remarks: remarks || "Plan updated",
    });

    await connection.commit();

    res.json({
      message: "Plan updated",
      data: updatedPlan,
    });
  } catch (err) {
    console.error(`Update plan error: ${err}`);
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

export const deletePlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    const [rows] = await connection.query(`SELECT * FROM plans WHERE id = ?`, [
      id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const oldPlan = rows[0];

    await connection.query(`DELETE FROM plans WHERE id = ?`, [id]);

    // ✅ AUDIT
    await AuditLog({
      connection,
      table: "plans",
      recordId: id,
      action: "DELETE",
      oldData: oldPlan,
      userId: userId,
      remarks: remarks || "Plan deleted",
    });

    await connection.commit();

    res.json({
      message: "Plan deleted",
      deleted_data: oldPlan,
    });
  } catch (err) {
    console.error(`Delete plan error: ${err}`);
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};
