import db from "../../../../config/db.js";
import { AuditLog } from "../../../../services/audit.service.js";
import { formatDateOnly } from "../../../../utils/generateInvestmentSchedule.js";

const VALID_SCHEDULE_STATUSES = ["PENDING", "APPROVED", "PAID", "CANCELLED"];

/**
 * GET SCHEDULES BY SUBSCRIPTION ID
 * Filters: status, from_date, to_date
 */
export const getSchedulesBySubscriptionId = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const { status, from_date, to_date } = req.query;

    if (!subscription_id || isNaN(subscription_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription_id is required",
      });
    }

    // Verify subscription
    const [subRows] = await db.query(
      `SELECT s.id, s.customer_id, s.plan_id, s.principal_amount, s.status,
              c.name AS customer_name, c.phone AS customer_phone,
              p.plan_name, p.plan_code
       FROM investment_subscriptions s
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE s.id = ?`,
      [Number(subscription_id)]
    );

    if (subRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Investment subscription #${subscription_id} not found`,
      });
    }

    let query = `
      SELECT 
        iis.id,
        iis.subscription_id,
        iis.installment_no,
        iis.interest_due_date,
        iis.interest_amount,
        iis.status,
        iis.paid_date,
        iis.paid_amount,
        iis.payment_id,
        iis.payment_mode,
        iis.remarks,
        iis.interest_updated_by,
        iis.interest_updated_at,
        iis.created_at,
        iis.updated_at
      FROM investment_interest_schedules iis
      WHERE iis.subscription_id = ?
    `;
    const params = [Number(subscription_id)];

    if (status && VALID_SCHEDULE_STATUSES.includes(status.toUpperCase())) {
      query += ` AND iis.status = ?`;
      params.push(status.toUpperCase());
    }

    if (from_date) {
      query += ` AND iis.interest_due_date >= ?`;
      params.push(formatDateOnly(from_date));
    }

    if (to_date) {
      query += ` AND iis.interest_due_date <= ?`;
      params.push(formatDateOnly(to_date));
    }

    query += ` ORDER BY iis.installment_no ASC`;

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      subscription: subRows[0],
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get schedules by subscription id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching interest schedules",
    });
  }
};

/**
 * GET SINGLE SCHEDULE BY ID
 */
export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid schedule ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT 
        iis.*,
        s.customer_id,
        s.plan_id,
        s.principal_amount,
        s.status AS subscription_status,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code
       FROM investment_interest_schedules iis
       JOIN investment_subscriptions s ON iis.subscription_id = s.id
       JOIN chit_customers c ON s.customer_id = c.id
       JOIN investment_plans p ON s.plan_id = p.id
       WHERE iis.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Interest schedule not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get schedule by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching schedule",
    });
  }
};

/**
 * UPDATE DYNAMIC INTEREST AMOUNT FOR A SCHEDULE
 * Allowed only for PENDING schedules within plan min/max interest range.
 */
export const updateScheduleInterestAmount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { interest_amount, remarks } = req.body;
    const userId = req.user?.id || null;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid schedule ID is required",
      });
    }

    if (interest_amount === undefined || isNaN(interest_amount)) {
      return res.status(400).json({
        success: false,
        message: "Valid interest_amount is required",
      });
    }

    const newAmount = Number(Number(interest_amount).toFixed(2));
    if (newAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "interest_amount cannot be negative",
      });
    }

    // Fetch existing schedule with subscription and plan tier limits
    const [rows] = await connection.query(
      `SELECT 
        iis.*,
        pa.minimum_interest_amount,
        pa.maximum_interest_amount
       FROM investment_interest_schedules iis
       JOIN investment_subscriptions s ON iis.subscription_id = s.id
       JOIN investment_plan_amounts pa ON s.plan_amount_id = pa.id
       WHERE iis.id = ?`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Interest schedule not found",
      });
    }

    const oldData = rows[0];

    // Cannot modify if already paid or cancelled
    if (oldData.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify interest amount for an installment that is already PAID",
      });
    }

    if (oldData.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify interest amount for a CANCELLED installment",
      });
    }

    // Validate min/max limits
    const minAllowed = Number(oldData.minimum_interest_amount);
    const maxAllowed = Number(oldData.maximum_interest_amount);

    if (newAmount < minAllowed) {
      return res.status(400).json({
        success: false,
        message: `interest_amount (₹${newAmount}) cannot be less than plan minimum allowed ₹${minAllowed}`,
      });
    }

    if (maxAllowed > 0 && newAmount > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `interest_amount (₹${newAmount}) cannot exceed plan maximum allowed ₹${maxAllowed}`,
      });
    }

    // Update
    await connection.query(
      `UPDATE investment_interest_schedules 
       SET interest_amount = ?,
           interest_updated_by = ?,
           interest_updated_at = NOW(),
           updated_by = ?,
           remarks = ?
       WHERE id = ?`,
      [newAmount, userId, userId, remarks || oldData.remarks, Number(id)]
    );

    const [updatedRows] = await connection.query(
      `SELECT * FROM investment_interest_schedules WHERE id = ?`,
      [Number(id)]
    );

    const updatedData = updatedRows[0];

    // Audit Log
    await AuditLog({
      connection,
      table: "investment_interest_schedules",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData: updatedData,
      userId,
      remarks:
        remarks ||
        `Updated interest amount for installment #${oldData.installment_no} from ₹${oldData.interest_amount} to ₹${newAmount}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Schedule interest amount updated successfully",
      data: updatedData,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update schedule interest amount error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating interest amount",
    });
  } finally {
    connection.release();
  }
};

/**
 * BULK APPROVE OR UPDATE STATUS OF SCHEDULES
 * E.g. Approve pending schedules for payout
 */
export const bulkUpdateScheduleStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { schedule_ids, status, remarks } = req.body;
    const userId = req.user?.id || null;

    if (!Array.isArray(schedule_ids) || schedule_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "schedule_ids must be a non-empty array of IDs",
      });
    }

    if (!status || !VALID_SCHEDULE_STATUSES.includes(String(status).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_SCHEDULE_STATUSES.join(", ")}`,
      });
    }

    const targetStatus = String(status).toUpperCase();

    // Check schedules
    const [existing] = await connection.query(
      `SELECT id, status, installment_no, subscription_id, paid_amount 
       FROM investment_interest_schedules 
       WHERE id IN (?)`,
      [schedule_ids]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching schedules found",
      });
    }

    // Prevent changing already PAID schedules
    const alreadyPaid = existing.filter((s) => s.status === "PAID");
    if (alreadyPaid.length > 0 && targetStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of already PAID installments (IDs: ${alreadyPaid.map((s) => s.id).join(", ")})`,
      });
    }

    const idsToUpdate = existing.map((s) => s.id);

    await connection.query(
      `UPDATE investment_interest_schedules 
       SET status = ?, updated_by = ?, remarks = COALESCE(?, remarks)
       WHERE id IN (?)`,
      [targetStatus, userId, remarks || null, idsToUpdate]
    );

    // Audit Log for the batch
    await AuditLog({
      connection,
      table: "investment_interest_schedules",
      recordId: idsToUpdate[0],
      action: "UPDATE",
      newData: { updated_ids: idsToUpdate, target_status: targetStatus },
      userId,
      remarks: remarks || `Bulk updated ${idsToUpdate.length} schedules to ${targetStatus}`,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${idsToUpdate.length} schedule(s) to ${targetStatus}`,
      updated_count: idsToUpdate.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Bulk update schedule status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while bulk updating schedules",
    });
  } finally {
    connection.release();
  }
};

/**
 * GET UPCOMING / DUE SCHEDULES ACROSS ALL SUBSCRIPTIONS
 * Useful for weekly payout processing (e.g. find all schedules due by given date)
 */
export const getUpcomingDueSchedules = async (req, res) => {
  try {
    const { due_date, status = "PENDING", limit = 100 } = req.query;

    let query = `
      SELECT 
        iis.id,
        iis.subscription_id,
        iis.installment_no,
        iis.interest_due_date,
        iis.interest_amount,
        iis.status,
        s.principal_amount,
        s.customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        p.plan_name,
        p.plan_code,
        p.payout_day
      FROM investment_interest_schedules iis
      JOIN investment_subscriptions s ON iis.subscription_id = s.id
      JOIN chit_customers c ON s.customer_id = c.id
      JOIN investment_plans p ON s.plan_id = p.id
      WHERE s.status IN ('ACTIVE', 'INTEREST_STARTED')
    `;
    const params = [];

    if (status) {
      query += ` AND iis.status = ?`;
      params.push(status.toUpperCase());
    }

    if (due_date) {
      query += ` AND iis.interest_due_date <= ?`;
      params.push(formatDateOnly(due_date));
    }

    query += ` ORDER BY iis.interest_due_date ASC, iis.subscription_id ASC LIMIT ?`;
    params.push(Number(limit) || 100);

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Get upcoming due schedules error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching due schedules",
    });
  }
};
