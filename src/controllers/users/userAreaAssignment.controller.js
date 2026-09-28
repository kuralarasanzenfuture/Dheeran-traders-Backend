import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

/**
 * ============================================================================
 * 1. ASSIGN USER TO AREA (Supports Single, Bulk Areas to User, Bulk Users to Area)
 * POST /api/user-area-assignments
 * ============================================================================
 */
export const assignUserToArea = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const assigned_by = req.user?.id;
    if (!assigned_by) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    }

    const { user_id, area_id, user_ids, area_ids, remarks } = req.body;

    // Build pairs of [user_id, area_id]
    const pairs = [];

    if (user_id && area_id) {
      // Single assignment
      pairs.push({ userId: parseInt(user_id, 10), areaId: parseInt(area_id, 10) });
    } else if (user_id && Array.isArray(area_ids) && area_ids.length > 0) {
      // Bulk areas to one user
      const uid = parseInt(user_id, 10);
      for (const aid of area_ids) {
        pairs.push({ userId: uid, areaId: parseInt(aid, 10) });
      }
    } else if (area_id && Array.isArray(user_ids) && user_ids.length > 0) {
      // Bulk users to one area
      const aid = parseInt(area_id, 10);
      for (const uid of user_ids) {
        pairs.push({ userId: parseInt(uid, 10), areaId: aid });
      }
    } else {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Provide user_id & area_id, or user_id & area_ids[], or area_id & user_ids[]",
      });
    }

    // Filter out invalid numbers and duplicates
    const uniquePairsMap = new Map();
    for (const p of pairs) {
      if (isNaN(p.userId) || isNaN(p.areaId)) continue;
      const key = `${p.userId}_${p.areaId}`;
      if (!uniquePairsMap.has(key)) {
        uniquePairsMap.set(key, p);
      }
    }

    const validPairs = Array.from(uniquePairsMap.values());
    if (validPairs.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "No valid user-area pairs provided" });
    }

    const processedAssignments = [];

    for (const pair of validPairs) {
      // 1. Verify User exists
      const [userRows] = await connection.query(
        "SELECT id, username, status FROM users_roles WHERE id = ?",
        [pair.userId]
      );
      if (!userRows.length) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `User ID ${pair.userId} not found`,
        });
      }

      // 2. Verify Area exists
      const [areaRows] = await connection.query(
        "SELECT id, name, code, status FROM areas WHERE id = ?",
        [pair.areaId]
      );
      if (!areaRows.length) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Area ID ${pair.areaId} not found`,
        });
      }

      // 3. Upsert assignment: If already exists (even if inactive), reactivate it
      const [existingRows] = await connection.query(
        "SELECT * FROM user_area_assignments WHERE user_id = ? AND area_id = ?",
        [pair.userId, pair.areaId]
      );

      let assignmentId = null;
      let actionType = "INSERT";
      let oldData = null;

      if (existingRows.length > 0) {
        oldData = existingRows[0];
        assignmentId = oldData.id;
        actionType = "UPDATE";

        await connection.query(
          `UPDATE user_area_assignments
           SET is_active = TRUE,
               assigned_by = ?,
               assigned_at = NOW(),
               updated_by = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [assigned_by, assigned_by, assignmentId]
        );
      } else {
        const [insertResult] = await connection.query(
          `INSERT INTO user_area_assignments
           (user_id, area_id, assigned_by, is_active)
           VALUES (?, ?, ?, TRUE)`,
          [pair.userId, pair.areaId, assigned_by]
        );
        assignmentId = insertResult.insertId;
      }

      // Fetch the updated/created assignment record with joined details
      const [savedRows] = await connection.query(
        `SELECT 
           uaa.id AS assignment_id,
           uaa.user_id,
           u.username,
           u.email AS user_email,
           u.phone AS user_phone,
           emp.employee_name,
           r.role_name,
           uaa.area_id,
           a.name AS area_name,
           a.code AS area_code,
           a.status AS area_status,
           uaa.is_active,
           uaa.assigned_at,
           uaa.updated_at,
           ab.username AS assigned_by_name
         FROM user_area_assignments uaa
         JOIN users_roles u ON u.id = uaa.user_id
         JOIN areas a ON a.id = uaa.area_id
         LEFT JOIN role_based r ON r.id = u.role_id
         LEFT JOIN employees_details emp ON emp.user_id = u.id
         LEFT JOIN users_roles ab ON ab.id = uaa.assigned_by
         WHERE uaa.id = ?`,
        [assignmentId]
      );

      const savedData = savedRows[0];
      processedAssignments.push(savedData);

      // Audit Log entry
      await AuditLog({
        connection,
        table: "user_area_assignments",
        recordId: assignmentId,
        action: actionType,
        oldData,
        newData: savedData,
        userId: assigned_by,
        remarks: remarks || `User assigned to area (${actionType})`,
      });
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `${processedAssignments.length} area assignment(s) saved successfully`,
      count: processedAssignments.length,
      data: processedAssignments.length === 1 ? processedAssignments[0] : processedAssignments,
    });
  } catch (err) {
    await connection.rollback();
    console.error("ASSIGN USER TO AREA ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error assigning user to area",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * 2. GET ALL USER-AREA ASSIGNMENTS (With Filters, Search, and Pagination)
 * GET /api/user-area-assignments
 * ============================================================================
 */
export const getUserAreaAssignments = async (req, res) => {
  try {
    const {
      user_id,
      area_id,
      status, // "ACTIVE", "INACTIVE", "ALL"
      is_active, // "true", "false", "1", "0"
      search,
      page,
      limit,
    } = req.query;

    let query = `
      SELECT 
        uaa.id AS assignment_id,
        uaa.user_id,
        u.username,
        u.email AS user_email,
        u.phone AS user_phone,
        emp.employee_name,
        emp.employee_code,
        r.role_name,
        uaa.area_id,
        a.name AS area_name,
        a.code AS area_code,
        a.status AS area_status,
        uaa.is_active,
        uaa.assigned_at,
        uaa.updated_at,
        ab.username AS assigned_by_name,
        ub.username AS updated_by_name
      FROM user_area_assignments uaa
      JOIN users_roles u ON u.id = uaa.user_id
      JOIN areas a ON a.id = uaa.area_id
      LEFT JOIN role_based r ON r.id = u.role_id
      LEFT JOIN employees_details emp ON emp.user_id = u.id
      LEFT JOIN users_roles ab ON ab.id = uaa.assigned_by
      LEFT JOIN users_roles ub ON ub.id = uaa.updated_by
    `;

    const conditions = [];
    const params = [];

    // Filter by user_id
    if (user_id) {
      conditions.push("uaa.user_id = ?");
      params.push(parseInt(user_id, 10));
    }

    // Filter by area_id
    if (area_id) {
      conditions.push("uaa.area_id = ?");
      params.push(parseInt(area_id, 10));
    }

    // Filter by active status
    if (status && status !== "ALL") {
      const activeFlag = status.toUpperCase() === "ACTIVE";
      conditions.push("uaa.is_active = ?");
      params.push(activeFlag);
    } else if (is_active !== undefined) {
      const activeFlag = is_active === "true" || is_active === "1" || is_active === true;
      conditions.push("uaa.is_active = ?");
      params.push(activeFlag);
    }

    // Live search (search by username, employee_name, area_name, area_code)
    if (search && search.trim()) {
      conditions.push(`(
        u.username LIKE ? OR
        emp.employee_name LIKE ? OR
        a.name LIKE ? OR
        a.code LIKE ?
      )`);
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY uaa.assigned_at DESC`;

    // Pagination if page & limit provided
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 10);
      const offset = (pageNum - 1) * limitNum;

      // Count query
      let countQuery = `
        SELECT COUNT(*) AS total
        FROM user_area_assignments uaa
        JOIN users_roles u ON u.id = uaa.user_id
        JOIN areas a ON a.id = uaa.area_id
        LEFT JOIN employees_details emp ON emp.user_id = u.id
      `;
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(" AND ")}`;
      }

      const [[{ total }]] = await db.query(countQuery, params);

      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);

      const [rows] = await db.query(query, params);

      return res.json({
        success: true,
        count: rows.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: rows,
      });
    }

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("GET USER AREA ASSIGNMENTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching user-area assignments",
    });
  }
};

/**
 * ============================================================================
 * 3. GET MY ASSIGNED AREAS (Logged-in User Profile)
 * GET /api/user-area-assignments/my-areas
 * ============================================================================
 */
export const getMyAssignedAreas = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    }

    // Check user role
    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [userId]
    );

    const roleName = roleRows[0]?.role_name;

    // For ADMIN users, if no specific assignments are assigned, return all active areas
    if (roleName === "ADMIN") {
      const [adminAreas] = await db.query(`
        SELECT 
          a.id AS area_id,
          a.name AS area_name,
          a.code AS area_code,
          a.status AS area_status,
          a.created_at,
          (SELECT COUNT(*) FROM customers c WHERE c.area_id = a.id) AS customer_count
        FROM areas a
        WHERE a.status = 'ACTIVE'
        ORDER BY a.name ASC
      `);

      return res.json({
        success: true,
        isAdmin: true,
        count: adminAreas.length,
        data: adminAreas,
      });
    }

    // For regular users / staff, return their active assigned areas
    const [assignedAreas] = await db.query(
      `SELECT 
         uaa.id AS assignment_id,
         uaa.assigned_at,
         a.id AS area_id,
         a.name AS area_name,
         a.code AS area_code,
         a.status AS area_status,
         (SELECT COUNT(*) FROM customers c WHERE c.area_id = a.id) AS customer_count
       FROM user_area_assignments uaa
       JOIN areas a ON a.id = uaa.area_id
       WHERE uaa.user_id = ? 
         AND uaa.is_active = TRUE
         AND a.status = 'ACTIVE'
       ORDER BY a.name ASC`,
      [userId]
    );

    return res.json({
      success: true,
      isAdmin: false,
      count: assignedAreas.length,
      data: assignedAreas,
    });
  } catch (err) {
    console.error("GET MY ASSIGNED AREAS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching assigned areas",
    });
  }
};

/**
 * ============================================================================
 * 4. GET ASSIGNMENT BY ID
 * GET /api/user-area-assignments/:id
 * ============================================================================
 */
export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "Valid assignment ID is required" });
    }

    const [rows] = await db.query(
      `SELECT 
         uaa.id AS assignment_id,
         uaa.user_id,
         u.username,
         u.email AS user_email,
         u.phone AS user_phone,
         emp.employee_name,
         emp.employee_code,
         r.role_name,
         uaa.area_id,
         a.name AS area_name,
         a.code AS area_code,
         a.status AS area_status,
         uaa.is_active,
         uaa.assigned_at,
         uaa.updated_at,
         ab.username AS assigned_by_name,
         ub.username AS updated_by_name
       FROM user_area_assignments uaa
       JOIN users_roles u ON u.id = uaa.user_id
       JOIN areas a ON a.id = uaa.area_id
       LEFT JOIN role_based r ON r.id = u.role_id
       LEFT JOIN employees_details emp ON emp.user_id = u.id
       LEFT JOIN users_roles ab ON ab.id = uaa.assigned_by
       LEFT JOIN users_roles ub ON ub.id = uaa.updated_by
       WHERE uaa.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("GET ASSIGNMENT BY ID ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching assignment",
    });
  }
};

/**
 * ============================================================================
 * 5. GET AREAS ASSIGNED TO SPECIFIC USER
 * GET /api/user-area-assignments/user/:userId
 * ============================================================================
 */
export const getAreasByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.query;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Valid user ID is required" });
    }

    let query = `
      SELECT 
        uaa.id AS assignment_id,
        uaa.is_active,
        uaa.assigned_at,
        a.id AS area_id,
        a.name AS area_name,
        a.code AS area_code,
        a.status AS area_status,
        (SELECT COUNT(*) FROM customers c WHERE c.area_id = a.id) AS customer_count
      FROM user_area_assignments uaa
      JOIN areas a ON a.id = uaa.area_id
      WHERE uaa.user_id = ?
    `;

    const params = [userId];

    if (is_active !== undefined) {
      const activeFlag = is_active === "true" || is_active === "1" || is_active === true;
      query += ` AND uaa.is_active = ?`;
      params.push(activeFlag);
    }

    query += ` ORDER BY a.name ASC`;

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      user_id: parseInt(userId, 10),
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("GET AREAS BY USER ID ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching user areas",
    });
  }
};

/**
 * ============================================================================
 * 6. GET USERS ASSIGNED TO SPECIFIC AREA
 * GET /api/user-area-assignments/area/:areaId
 * ============================================================================
 */
export const getUsersByAreaId = async (req, res) => {
  try {
    const { areaId } = req.params;
    const { is_active } = req.query;

    if (!areaId || isNaN(areaId)) {
      return res.status(400).json({ success: false, message: "Valid area ID is required" });
    }

    let query = `
      SELECT 
        uaa.id AS assignment_id,
        uaa.is_active,
        uaa.assigned_at,
        u.id AS user_id,
        u.username,
        u.email AS user_email,
        u.phone AS user_phone,
        emp.employee_name,
        emp.employee_code,
        r.role_name
      FROM user_area_assignments uaa
      JOIN users_roles u ON u.id = uaa.user_id
      LEFT JOIN role_based r ON r.id = u.role_id
      LEFT JOIN employees_details emp ON emp.user_id = u.id
      WHERE uaa.area_id = ?
    `;

    const params = [areaId];

    if (is_active !== undefined) {
      const activeFlag = is_active === "true" || is_active === "1" || is_active === true;
      query += ` AND uaa.is_active = ?`;
      params.push(activeFlag);
    }

    query += ` ORDER BY u.username ASC`;

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      area_id: parseInt(areaId, 10),
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("GET USERS BY AREA ID ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area users",
    });
  }
};

/**
 * ============================================================================
 * 7. UPDATE ASSIGNMENT (Change status, user, or area)
 * PUT /api/user-area-assignments/:id
 * ============================================================================
 */
export const updateAssignment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { user_id, area_id, is_active, remarks } = req.body;
    const updated_by = req.user?.id;

    if (!id || isNaN(id)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Valid assignment ID is required" });
    }

    // Get existing assignment
    const [existingRows] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE id = ?",
      [id]
    );

    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const oldData = existingRows[0];

    const targetUserId = user_id !== undefined ? parseInt(user_id, 10) : oldData.user_id;
    const targetAreaId = area_id !== undefined ? parseInt(area_id, 10) : oldData.area_id;
    const targetIsActive = is_active !== undefined ? Boolean(is_active) : oldData.is_active;

    // Duplicate check if user or area changed
    if (targetUserId !== oldData.user_id || targetAreaId !== oldData.area_id) {
      const [duplicate] = await connection.query(
        "SELECT id FROM user_area_assignments WHERE user_id = ? AND area_id = ? AND id != ?",
        [targetUserId, targetAreaId, id]
      );

      if (duplicate.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: "An assignment already exists for this user and area combination",
        });
      }
    }

    // Execute update
    await connection.query(
      `UPDATE user_area_assignments
       SET user_id = ?,
           area_id = ?,
           is_active = ?,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [targetUserId, targetAreaId, targetIsActive, updated_by, id]
    );

    // Fetch updated assignment
    const [updatedRows] = await connection.query(
      `SELECT 
         uaa.id AS assignment_id,
         uaa.user_id,
         u.username,
         uaa.area_id,
         a.name AS area_name,
         a.code AS area_code,
         uaa.is_active,
         uaa.assigned_at,
         uaa.updated_at,
         ab.username AS assigned_by_name,
         ub.username AS updated_by_name
       FROM user_area_assignments uaa
       JOIN users_roles u ON u.id = uaa.user_id
       JOIN areas a ON a.id = uaa.area_id
       LEFT JOIN users_roles ab ON ab.id = uaa.assigned_by
       LEFT JOIN users_roles ub ON ub.id = uaa.updated_by
       WHERE uaa.id = ?`,
      [id]
    );

    const newData = updatedRows[0];

    // Audit Log entry
    await AuditLog({
      connection,
      table: "user_area_assignments",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData,
      userId: updated_by,
      remarks: remarks || "User-area assignment updated",
    });

    await connection.commit();

    return res.json({
      success: true,
      message: "Assignment updated successfully",
      data: newData,
    });
  } catch (err) {
    await connection.rollback();
    console.error("UPDATE ASSIGNMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating assignment",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * 8. TOGGLE ASSIGNMENT STATUS (Activate / Deactivate)
 * PATCH /api/user-area-assignments/:id/status
 * ============================================================================
 */
export const toggleAssignmentStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { is_active } = req.body;
    const updated_by = req.user?.id;

    if (!id || isNaN(id)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Valid assignment ID is required" });
    }

    const [existing] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const oldData = existing[0];
    const newStatus = is_active !== undefined ? Boolean(is_active) : !oldData.is_active;

    await connection.query(
      `UPDATE user_area_assignments
       SET is_active = ?,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [newStatus, updated_by, id]
    );

    const [updated] = await connection.query(
      `SELECT uaa.*, a.name AS area_name, u.username
       FROM user_area_assignments uaa
       JOIN areas a ON a.id = uaa.area_id
       JOIN users_roles u ON u.id = uaa.user_id
       WHERE uaa.id = ?`,
      [id]
    );

    await AuditLog({
      connection,
      table: "user_area_assignments",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData: updated[0],
      userId: updated_by,
      remarks: `Assignment status toggled to ${newStatus ? "ACTIVE" : "INACTIVE"}`,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: `Assignment ${newStatus ? "activated" : "deactivated"} successfully`,
      data: updated[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error("TOGGLE STATUS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error toggling assignment status",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * 9. DELETE ASSIGNMENT (Supports soft-delete by default, hard-delete via ?hard=true)
 * DELETE /api/user-area-assignments/:id
 * ============================================================================
 */
export const deleteAssignment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { hard } = req.query;
    const isHardDelete = hard === "true" || hard === "1";
    const updated_by = req.user?.id;

    if (!id || isNaN(id)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Valid assignment ID is required" });
    }

    const [existing] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const oldData = existing[0];

    if (isHardDelete) {
      await connection.query("DELETE FROM user_area_assignments WHERE id = ?", [id]);
    } else {
      await connection.query(
        `UPDATE user_area_assignments
         SET is_active = FALSE,
             updated_by = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [updated_by, id]
      );
    }

    await AuditLog({
      connection,
      table: "user_area_assignments",
      recordId: id,
      action: isHardDelete ? "DELETE" : "UPDATE",
      oldData,
      newData: isHardDelete ? null : { ...oldData, is_active: false },
      userId: updated_by,
      remarks: isHardDelete ? "Assignment permanently deleted" : "Assignment deactivated (soft deleted)",
    });

    await connection.commit();

    return res.json({
      success: true,
      message: isHardDelete
        ? "Assignment permanently deleted"
        : "Assignment deactivated successfully",
    });
  } catch (err) {
    await connection.rollback();
    console.error("DELETE ASSIGNMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error deleting assignment",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * 10. UNASSIGN USER FROM AREA (By User ID & Area ID)
 * DELETE /api/user-area-assignments/user/:userId/area/:areaId
 * ============================================================================
 */
export const unassignUserFromArea = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { userId, areaId } = req.params;
    const { hard } = req.query;
    const isHardDelete = hard === "true" || hard === "1";
    const updated_by = req.user?.id;

    if (!userId || !areaId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Both userId and areaId parameters are required",
      });
    }

    const [existing] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE user_id = ? AND area_id = ?",
      [userId, areaId]
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const oldData = existing[0];

    if (isHardDelete) {
      await connection.query("DELETE FROM user_area_assignments WHERE id = ?", [oldData.id]);
    } else {
      await connection.query(
        `UPDATE user_area_assignments
         SET is_active = FALSE,
             updated_by = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [updated_by, oldData.id]
      );
    }

    await AuditLog({
      connection,
      table: "user_area_assignments",
      recordId: oldData.id,
      action: isHardDelete ? "DELETE" : "UPDATE",
      oldData,
      newData: isHardDelete ? null : { ...oldData, is_active: false },
      userId: updated_by,
      remarks: `User ${userId} unassigned from Area ${areaId}`,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: isHardDelete
        ? "User unassigned and record permanently deleted"
        : "User unassigned from area successfully",
    });
  } catch (err) {
    await connection.rollback();
    console.error("UNASSIGN USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error unassigning user from area",
    });
  } finally {
    connection.release();
  }
};
