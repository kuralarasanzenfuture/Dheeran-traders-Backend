import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

/**
 * CREATE PLAN AMOUNT
 */
export const createPlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let { plan_id, installment_amount, is_active = true, remarks } = req.body;
    const userId = req.user?.id || null;

    // 1. Validation: Required fields
    if (plan_id === undefined || plan_id === null || installment_amount === undefined || installment_amount === null) {
      return res.status(400).json({
        success: false,
        message: "plan_id and installment_amount are required",
      });
    }

    // 2. Type and range validations
    plan_id = Number(plan_id);
    if (isNaN(plan_id) || !Number.isInteger(plan_id) || plan_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "plan_id must be a valid positive integer",
      });
    }

    installment_amount = Number(installment_amount);
    if (isNaN(installment_amount) || installment_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "installment_amount must be a valid positive number greater than 0",
      });
    }

    // Normalize installment_amount to 2 decimal places
    installment_amount = Number(installment_amount.toFixed(2));

    // Boolean normalization
    is_active = is_active === true || is_active === "true" || is_active === 1 || is_active === "1";

    // 3. Verify plan exists
    const [planRows] = await connection.query(
      `SELECT id, plan_name, duration_days, collection_type, total_installments 
       FROM plans WHERE id = ?`,
      [plan_id]
    );

    if (planRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Plan with ID ${plan_id} not found`,
      });
    }

    // 4. Duplicate check (unique_plan_amount constraint)
    const [exists] = await connection.query(
      `SELECT id FROM plan_amounts WHERE plan_id = ? AND installment_amount = ?`,
      [plan_id, installment_amount]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Installment amount ${installment_amount} already exists for plan ID ${plan_id}`,
      });
    }

    // 5. Insert plan amount
    const [result] = await connection.query(
      `INSERT INTO plan_amounts (plan_id, installment_amount, is_active, created_by)
       VALUES (?, ?, ?, ?)`,
      [plan_id, installment_amount, is_active, userId]
    );

    const [newRows] = await connection.query(
      `SELECT pa.*, p.plan_name, p.duration_days, p.collection_type, p.total_installments
       FROM plan_amounts pa
       JOIN plans p ON pa.plan_id = p.id
       WHERE pa.id = ?`,
      [result.insertId]
    );

    const newRecord = newRows[0];

    // 6. Audit Log
    await AuditLog({
      connection,
      table: "plan_amounts",
      recordId: result.insertId,
      action: "INSERT",
      newData: newRecord,
      userId,
      remarks: remarks || `Created plan amount ${installment_amount} for plan ${planRows[0].plan_name}`,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Plan amount created successfully",
      data: newRecord,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating plan amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET ALL PLAN AMOUNTS (with optional filters)
 */
export const getAllPlanAmounts = async (req, res) => {
  try {
    const { plan_id, is_active } = req.query;

    let query = `
      SELECT 
        pa.id,
        pa.plan_id,
        pa.installment_amount,
        pa.is_active,
        pa.created_by,
        pa.updated_by,
        pa.created_at,
        pa.updated_at,
        p.plan_name,
        p.duration_days,
        p.collection_type,
        p.total_installments
      FROM plan_amounts pa
      JOIN plans p ON pa.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (plan_id) {
      query += ` AND pa.plan_id = ?`;
      params.push(Number(plan_id));
    }

    if (is_active !== undefined) {
      const activeBool = is_active === "true" || is_active === "1" || is_active === true;
      query += ` AND pa.is_active = ?`;
      params.push(activeBool ? 1 : 0);
    }

    query += ` ORDER BY p.id ASC, pa.installment_amount ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get plan amounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching plan amounts",
    });
  }
};

/**
 * GET PLAN AMOUNT BY ID
 */
export const getPlanAmountById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan amount ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        pa.id,
        pa.plan_id,
        pa.installment_amount,
        pa.is_active,
        pa.created_by,
        pa.updated_by,
        pa.created_at,
        pa.updated_at,
        p.plan_name,
        p.duration_days,
        p.collection_type,
        p.total_installments
       FROM plan_amounts pa
       JOIN plans p ON pa.plan_id = p.id
       WHERE pa.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan amount not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get plan amount by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching plan amount",
    });
  }
};

/**
 * GET AMOUNTS BY PLAN ID (Convenience endpoint for subscriptions)
 */
export const getPlanAmountsByPlanId = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const { all } = req.query;

    if (!plan_id || isNaN(plan_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan ID is required",
      });
    }

    const [plan] = await db.query(`SELECT id, plan_name FROM plans WHERE id = ?`, [Number(plan_id)]);
    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    let query = `
      SELECT id, plan_id, installment_amount, is_active, created_at, updated_at
      FROM plan_amounts
      WHERE plan_id = ?
    `;
    const params = [Number(plan_id)];

    // By default only return active amounts unless ?all=true
    if (all !== "true" && all !== "1") {
      query += ` AND is_active = TRUE`;
    }

    query += ` ORDER BY installment_amount ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      plan: plan[0],
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get plan amounts by plan id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching amounts for plan",
    });
  }
};

/**
 * UPDATE PLAN AMOUNT
 */
export const updatePlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;
    let { plan_id, installment_amount, is_active, remarks } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan amount ID is required",
      });
    }

    // 1. Check existing record
    const [existingRows] = await connection.query(
      `SELECT * FROM plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan amount not found",
      });
    }

    const oldData = existingRows[0];

    // 2. Validate & normalize inputs
    const targetPlanId = plan_id !== undefined && plan_id !== null ? Number(plan_id) : oldData.plan_id;
    if (isNaN(targetPlanId) || !Number.isInteger(targetPlanId) || targetPlanId <= 0) {
      return res.status(400).json({
        success: false,
        message: "plan_id must be a valid positive integer",
      });
    }

    // Verify target plan exists if changed
    if (targetPlanId !== oldData.plan_id) {
      const [targetPlan] = await connection.query(`SELECT id FROM plans WHERE id = ?`, [targetPlanId]);
      if (targetPlan.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Plan with ID ${targetPlanId} not found`,
        });
      }
    }

    let targetAmount = oldData.installment_amount;
    if (installment_amount !== undefined && installment_amount !== null) {
      targetAmount = Number(installment_amount);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "installment_amount must be a valid positive number greater than 0",
        });
      }
      targetAmount = Number(targetAmount.toFixed(2));
    }

    let targetIsActive = oldData.is_active;
    if (is_active !== undefined && is_active !== null) {
      targetIsActive = is_active === true || is_active === "true" || is_active === 1 || is_active === "1";
    }

    // 3. Duplicate check if plan_id or installment_amount changed
    if (targetPlanId !== oldData.plan_id || targetAmount !== Number(oldData.installment_amount)) {
      const [duplicate] = await connection.query(
        `SELECT id FROM plan_amounts WHERE plan_id = ? AND installment_amount = ? AND id != ?`,
        [targetPlanId, targetAmount, Number(id)]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Installment amount ${targetAmount} already exists for plan ID ${targetPlanId}`,
        });
      }
    }

    // 4. Update
    await connection.query(
      `UPDATE plan_amounts
       SET plan_id = ?, installment_amount = ?, is_active = ?, updated_by = ?
       WHERE id = ?`,
      [targetPlanId, targetAmount, targetIsActive, userId, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT pa.*, p.plan_name, p.duration_days, p.collection_type, p.total_installments
       FROM plan_amounts pa
       JOIN plans p ON pa.plan_id = p.id
       WHERE pa.id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // 5. Audit Log
    await AuditLog({
      connection,
      table: "plan_amounts",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Updated plan amount ID ${id}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Plan amount updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating plan amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * TOGGLE ACTIVE STATUS
 */
export const togglePlanAmountStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || null;
    const { is_active, remarks } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan amount ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan amount not found",
      });
    }

    const oldData = rows[0];
    const newStatus = is_active !== undefined 
      ? (is_active === true || is_active === "true" || is_active === 1 || is_active === "1")
      : !oldData.is_active;

    await connection.query(
      `UPDATE plan_amounts SET is_active = ?, updated_by = ? WHERE id = ?`,
      [newStatus, userId, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT pa.*, p.plan_name FROM plan_amounts pa JOIN plans p ON pa.plan_id = p.id WHERE pa.id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    await AuditLog({
      connection,
      table: "plan_amounts",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks: remarks || `Toggled plan amount status to ${newStatus ? "active" : "inactive"}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Plan amount ${newStatus ? "activated" : "deactivated"} successfully`,
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle plan amount status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating status",
    });
  } finally {
    connection.release();
  }
};

/**
 * DELETE PLAN AMOUNT
 */
export const deletePlanAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid plan amount ID is required",
      });
    }

    const [rows] = await connection.query(
      `SELECT * FROM plan_amounts WHERE id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan amount not found",
      });
    }

    const oldData = rows[0];

    // Safety validation: Check if any subscription uses this plan_id and installment_amount
    const [usedInSubscriptions] = await connection.query(
      `SELECT id FROM chit_customer_subscriptions 
       WHERE plan_id = ? AND installment_amount = ? 
       LIMIT 1`,
      [oldData.plan_id, oldData.installment_amount]
    );

    if (usedInSubscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan amount ₹${oldData.installment_amount}: It is in use by existing customer subscriptions. Deactivate it instead using PATCH /plan-amounts/${id}/status.`,
      });
    }

    // Delete record
    await connection.query(`DELETE FROM plan_amounts WHERE id = ?`, [Number(id)]);

    // Audit Log
    await AuditLog({
      connection,
      table: "plan_amounts",
      recordId: Number(id),
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || `Deleted plan amount ID ${id}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Plan amount deleted successfully",
      deleted_data: oldData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete plan amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting plan amount",
    });
  } finally {
    connection.release();
  }
};
