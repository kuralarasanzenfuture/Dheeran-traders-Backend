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
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized: User not authenticated",
        });
    }

    const { user_id, area_id, user_ids, area_ids, remarks } = req.body;

    // Build pairs of [user_id, area_id]
    const pairs = [];

    if (user_id && area_id) {
      // Single assignment
      pairs.push({
        userId: parseInt(user_id, 10),
        areaId: parseInt(area_id, 10),
      });
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
        message:
          "Provide user_id & area_id, or user_id & area_ids[], or area_id & user_ids[]",
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
      return res
        .status(400)
        .json({ success: false, message: "No valid user-area pairs provided" });
    }

    const processedAssignments = [];

    for (const pair of validPairs) {
      // 1. Verify User exists
      const [userRows] = await connection.query(
        "SELECT id, username, status FROM users_roles WHERE id = ?",
        [pair.userId],
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
        [pair.areaId],
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
        [pair.userId, pair.areaId],
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
          [assigned_by, assigned_by, assignmentId],
        );
      } else {
        const [insertResult] = await connection.query(
          `INSERT INTO user_area_assignments
           (user_id, area_id, assigned_by, is_active)
           VALUES (?, ?, ?, TRUE)`,
          [pair.userId, pair.areaId, assigned_by],
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
        [assignmentId],
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
      data:
        processedAssignments.length === 1
          ? processedAssignments[0]
          : processedAssignments,
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
      const activeFlag =
        is_active === "true" || is_active === "1" || is_active === true;
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
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized: User not authenticated",
        });
    }

    // Check user role
    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [userId],
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
          (SELECT COUNT(*) FROM chit_customers c WHERE c.area_id = a.id) AS chit_customer_count,
          (SELECT COUNT(*) FROM customers c WHERE c.area_id = a.id) AS billing_customer_count,
          (SELECT COUNT(*) FROM chit_customers c WHERE c.area_id = a.id) AS customer_count,
          (
            SELECT COUNT(*) 
            FROM chit_customer_subscriptions ccs 
            JOIN chit_customers c ON c.id = ccs.customer_id 
            WHERE c.area_id = a.id 
              AND (ccs.is_maturity_paid = FALSE OR ccs.is_maturity_paid IS NULL OR ccs.is_maturity_paid = 0)
          ) AS active_subscriptions_count
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
         (SELECT COUNT(*) FROM chit_customers c WHERE c.area_id = a.id) AS chit_customer_count,
         (SELECT COUNT(*) FROM customers c WHERE c.area_id = a.id) AS billing_customer_count,
         (SELECT COUNT(*) FROM chit_customers c WHERE c.area_id = a.id) AS customer_count,
         (
           SELECT COUNT(*) 
           FROM chit_customer_subscriptions ccs 
           JOIN chit_customers c ON c.id = ccs.customer_id 
           WHERE c.area_id = a.id 
             AND (ccs.is_maturity_paid = FALSE OR ccs.is_maturity_paid IS NULL OR ccs.is_maturity_paid = 0)
         ) AS active_subscriptions_count
       FROM user_area_assignments uaa
       JOIN areas a ON a.id = uaa.area_id
       WHERE uaa.user_id = ? 
         AND uaa.is_active = TRUE
         AND a.status = 'ACTIVE'
       ORDER BY a.name ASC`,
      [userId],
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
      return res
        .status(400)
        .json({ success: false, message: "Valid assignment ID is required" });
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
      [id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
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
      return res
        .status(400)
        .json({ success: false, message: "Valid user ID is required" });
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
      const activeFlag =
        is_active === "true" || is_active === "1" || is_active === true;
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
      return res
        .status(400)
        .json({ success: false, message: "Valid area ID is required" });
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
      const activeFlag =
        is_active === "true" || is_active === "1" || is_active === true;
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
    const updated_by = req.user?.id || null;

    /* ================= VALIDATION ================= */

    if (!id || isNaN(id)) {
      throw new Error("Valid assignment ID is required");
    }

    /* ================= GET EXISTING ================= */

    const [existingRows] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE id = ?",
      [Number(id)],
    );

    if (!existingRows.length) {
      throw new Error("Assignment not found");
    }

    const oldData = existingRows[0];

    /* ================= NORMALIZE ================= */

    const targetUserId =
      user_id !== undefined ? Number(user_id) : oldData.user_id;

    const targetAreaId =
      area_id !== undefined ? Number(area_id) : oldData.area_id;

    let targetIsActive = oldData.is_active;

    if (is_active !== undefined) {
      if (
        is_active === true ||
        is_active === 1 ||
        is_active === "1" ||
        is_active === "true"
      ) {
        targetIsActive = 1;
      } else if (
        is_active === false ||
        is_active === 0 ||
        is_active === "0" ||
        is_active === "false"
      ) {
        targetIsActive = 0;
      } else {
        throw new Error("Invalid is_active value");
      }
    }

    /* ================= FK CHECK ================= */

    const [[userExists]] = await connection.query(
      "SELECT id FROM users_roles WHERE id = ?",
      [targetUserId],
    );

    if (!userExists) {
      throw new Error("Invalid user_id");
    }

    const [[areaExists]] = await connection.query(
      "SELECT id FROM areas WHERE id = ?",
      [targetAreaId],
    );

    if (!areaExists) {
      throw new Error("Invalid area_id");
    }

    /* ================= DUPLICATE CHECK ================= */

    if (targetUserId !== oldData.user_id || targetAreaId !== oldData.area_id) {
      const [duplicate] = await connection.query(
        `SELECT id 
         FROM user_area_assignments 
         WHERE user_id = ? AND area_id = ? AND id != ?`,
        [targetUserId, targetAreaId, Number(id)],
      );

      if (duplicate.length > 0) {
        throw new Error("Assignment already exists for this user and area");
      }
    }

    /* ================= NO CHANGE CHECK ================= */

    if (
      targetUserId === oldData.user_id &&
      targetAreaId === oldData.area_id &&
      targetIsActive === oldData.is_active
    ) {
      await connection.rollback();
      return res.json({
        success: true,
        message: "No changes detected",
        data: oldData,
      });
    }

    /* ================= UPDATE ================= */

    await connection.query(
      `UPDATE user_area_assignments
       SET user_id = ?,
           area_id = ?,
           is_active = ?,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [targetUserId, targetAreaId, targetIsActive, updated_by, Number(id)],
    );

    /* ================= FETCH UPDATED ================= */

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
      [Number(id)],
    );

    const newData = updatedRows[0];

    /* ================= AUDIT ================= */

    await AuditLog({
      connection,
      table: "user_area_assignments",
      recordId: Number(id),
      action: "UPDATE",
      oldData,
      newData,
      userId: updated_by,
      remarks: remarks || "Assignment updated",
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

    return res.status(400).json({
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
      return res
        .status(400)
        .json({ success: false, message: "Valid assignment ID is required" });
    }

    const [existing] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE id = ?",
      [id],
    );

    if (!existing.length) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    const oldData = existing[0];
    const newStatus =
      is_active !== undefined ? Boolean(is_active) : !oldData.is_active;

    await connection.query(
      `UPDATE user_area_assignments
       SET is_active = ?,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [newStatus, updated_by, id],
    );

    const [updated] = await connection.query(
      `SELECT uaa.*, a.name AS area_name, u.username
       FROM user_area_assignments uaa
       JOIN areas a ON a.id = uaa.area_id
       JOIN users_roles u ON u.id = uaa.user_id
       WHERE uaa.id = ?`,
      [id],
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
      return res
        .status(400)
        .json({ success: false, message: "Valid assignment ID is required" });
    }

    const [existing] = await connection.query(
      "SELECT * FROM user_area_assignments WHERE id = ?",
      [id],
    );

    if (!existing.length) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    const oldData = existing[0];

    if (isHardDelete) {
      await connection.query("DELETE FROM user_area_assignments WHERE id = ?", [
        id,
      ]);
    } else {
      await connection.query(
        `UPDATE user_area_assignments
         SET is_active = FALSE,
             updated_by = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [updated_by, id],
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
      remarks: isHardDelete
        ? "Assignment permanently deleted"
        : "Assignment deactivated (soft deleted)",
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
      [userId, areaId],
    );

    if (!existing.length) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    const oldData = existing[0];

    if (isHardDelete) {
      await connection.query("DELETE FROM user_area_assignments WHERE id = ?", [
        oldData.id,
      ]);
    } else {
      await connection.query(
        `UPDATE user_area_assignments
         SET is_active = FALSE,
             updated_by = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [updated_by, oldData.id],
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

/**
 * ============================================================================
 * 11. GET USER ASSIGNED AREA CUSTOMERS (Chit / Billing Customers with Filters)
 * GET /api/user-area-assignments/my-customers
 * GET /api/user-area-assignments/customers
 * ============================================================================
 * Retrieves all customers belonging to areas assigned to the user.
 * References user_chit_customer_assignments for direct customer assignment details.
 */
export const getUserAssignedAreaCustomers = async (req, res) => {
  try {
    const customerType = String(req.query.customer_type || "").trim().toLowerCase();
    if (customerType === "billing") {
      return getUserAssignedAreaBillingCustomers(req, res);
    }

    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    // Role check
    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    const {
      search,
      area_id,
      area_ids,
      place,
      district,
      state,
      pincode,
      user_id,
      has_subscriptions,
      has_active_subscriptions,
      is_directly_assigned,
      startDate,
      endDate,
      customer_type = "chit", // 'chit' | 'billing' | 'all'
      sort_by = "name",
      sort_order = "ASC",
      page = 1,
      limit = 10,
    } = req.query;

    let targetUserId = null;
    if (isAdmin) {
      if (user_id) targetUserId = parseInt(user_id, 10);
    } else {
      targetUserId = authUserId;
    }

    const whereConditions = ["c.area_id IS NOT NULL"];
    const params = [];

    // User assignment to area filter
    if (targetUserId) {
      whereConditions.push(`uaa.user_id = ?`);
      params.push(targetUserId);
      whereConditions.push(`uaa.is_active = TRUE`);
    } else {
      whereConditions.push(`uaa.is_active = TRUE`);
    }

    // Area filters
    if (area_id) {
      whereConditions.push(`c.area_id = ?`);
      params.push(parseInt(area_id, 10));
    } else if (area_ids) {
      const ids = String(area_ids)
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id) && id > 0);
      if (ids.length > 0) {
        whereConditions.push(`c.area_id IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      }
    }

    // Location filters
    if (place && place.trim()) {
      whereConditions.push(`c.place LIKE ?`);
      params.push(`%${place.trim()}%`);
    }
    if (district && district.trim()) {
      whereConditions.push(`c.district LIKE ?`);
      params.push(`%${district.trim()}%`);
    }
    if (state && state.trim()) {
      whereConditions.push(`c.state LIKE ?`);
      params.push(`%${state.trim()}%`);
    }
    if (pincode && pincode.trim()) {
      whereConditions.push(`c.pincode = ?`);
      params.push(pincode.trim());
    }

    // Date filters
    if (startDate) {
      whereConditions.push(`DATE(c.created_at) >= ?`);
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`DATE(c.created_at) <= ?`);
      params.push(endDate);
    }

    // Search filter across profile and area fields
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.name LIKE ? OR c.phone LIKE ? OR c.aadhar LIKE ? OR c.pan_number LIKE ? OR c.place LIKE ? OR c.door_no LIKE ? OR c.address LIKE ? OR a.name LIKE ? OR a.code LIKE ?)`
      );
      params.push(term, term, term, term, term, term, term, term, term);
    }

    // Subscription filters
    if (has_subscriptions !== undefined) {
      const hasSubsBool =
        has_subscriptions === "true" ||
        has_subscriptions === "1" ||
        has_subscriptions === true;
      whereConditions.push(
        `(SELECT COUNT(*) FROM chit_customer_subscriptions ccs WHERE ccs.customer_id = c.id) ${hasSubsBool ? ">" : "="} 0`
      );
    }

    if (has_active_subscriptions !== undefined) {
      const activeSubsBool =
        has_active_subscriptions === "true" ||
        has_active_subscriptions === "1" ||
        has_active_subscriptions === true;
      whereConditions.push(
        `(SELECT COUNT(*) FROM chit_customer_subscriptions ccs WHERE ccs.customer_id = c.id AND (ccs.is_maturity_paid = FALSE OR ccs.is_maturity_paid IS NULL OR ccs.is_maturity_paid = 0)) ${activeSubsBool ? ">" : "="} 0`
      );
    }

    // Direct assignment filter (references user_chit_customer_assignments)
    const directCheckUserId = targetUserId || authUserId;
    if (is_directly_assigned !== undefined) {
      const isDirectBool =
        is_directly_assigned === "true" ||
        is_directly_assigned === "1" ||
        is_directly_assigned === true;
      whereConditions.push(
        `${isDirectBool ? "EXISTS" : "NOT EXISTS"} (SELECT 1 FROM user_chit_customer_assignments uca WHERE uca.customer_id = c.id AND uca.user_id = ? AND uca.is_active = TRUE)`
      );
      params.push(directCheckUserId);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count Query
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) AS total_count,
             COUNT(DISTINCT a.id) AS total_areas_count
      FROM chit_customers c
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      WHERE ${whereClause}
    `;

    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0]?.total_count || 0;
    const totalAreasCount = countResult[0]?.total_areas_count || 0;

    // Sorting
    const allowedSortFields = {
      name: "c.name",
      customer_name: "c.name",
      created_at: "c.created_at",
      place: "c.place",
      phone: "c.phone",
      area_name: "a.name",
      id: "c.id",
      total_subscriptions: "total_subscriptions",
    };
    const sortColumn = allowedSortFields[sort_by] || "c.name";
    const sortDirection = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Pagination
    const isUnpaginated =
      String(limit).toLowerCase() === "all" ||
      parseInt(limit, 10) === 0 ||
      parseInt(limit, 10) < 0;

    let paginationClause = "";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let pageLimit = 10;

    if (!isUnpaginated) {
      pageLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;
      paginationClause = `LIMIT ${pageLimit} OFFSET ${offset}`;
    }

    // Main Query
    const mainQuery = `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.door_no,
        c.address,
        c.place,
        c.state,
        c.district,
        c.pincode,
        c.aadhar,
        c.pan_number,
        c.created_at AS customer_created_at,

        a.id AS area_id,
        a.name AS area_name,
        a.code AS area_code,
        a.status AS area_status,

        uaa.id AS area_assignment_id,
        uaa.assigned_at AS area_assigned_at,
        uaa.is_active AS area_assignment_active,
        uaa.user_id AS assigned_user_id,
        u.username AS assigned_user_name,

        (SELECT COUNT(*) FROM chit_customer_subscriptions ccs WHERE ccs.customer_id = c.id) AS total_subscriptions,
        (SELECT COUNT(*) FROM chit_customer_subscriptions ccs WHERE ccs.customer_id = c.id AND (ccs.is_maturity_paid = FALSE OR ccs.is_maturity_paid IS NULL OR ccs.is_maturity_paid = 0)) AS active_subscriptions,
        (SELECT COALESCE(SUM(ccs.total_installment_amount), 0) FROM chit_customer_subscriptions ccs WHERE ccs.customer_id = c.id) AS total_installment_amount,

        CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_chit_customer_assignments uca 
            WHERE uca.customer_id = c.id 
              AND uca.user_id = uaa.user_id 
              AND uca.is_active = TRUE
          ) THEN TRUE 
          ELSE FALSE 
        END AS is_directly_assigned,

        (
          SELECT uca.id FROM user_chit_customer_assignments uca 
          WHERE uca.customer_id = c.id 
            AND uca.user_id = uaa.user_id 
            AND uca.is_active = TRUE
          LIMIT 1
        ) AS direct_assignment_id

      FROM chit_customers c
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      JOIN users_roles u ON uaa.user_id = u.id
      WHERE ${whereClause}
      GROUP BY c.id, a.id, uaa.user_id
      ORDER BY ${sortColumn} ${sortDirection}
      ${paginationClause}
    `;

    const [rows] = await db.query(mainQuery, params);

    const totalPages = isUnpaginated ? 1 : Math.ceil(totalCount / pageLimit);

    return res.status(200).json({
      success: true,
      message: "User assigned area customers retrieved successfully",
      summary: {
        total_customers: totalCount,
        total_assigned_areas: totalAreasCount,
        user_id: targetUserId,
        view_mode: isAdmin && !user_id ? "ADMIN_ALL" : "USER_SPECIFIC",
      },
      pagination: {
        total_records: totalCount,
        current_page: isUnpaginated ? 1 : pageNum,
        limit: isUnpaginated ? totalCount : pageLimit,
        total_pages: totalPages,
        has_next_page: !isUnpaginated && pageNum < totalPages,
        has_prev_page: !isUnpaginated && pageNum > 1,
      },
      data: rows,
    });
  } catch (err) {
    console.error("getUserAssignedAreaCustomers Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area assigned customers",
    });
  }
};

/**
 * ============================================================================
 * 12. GET CUSTOMERS BY AREA ID (With Assignment Verification)
 * GET /api/user-area-assignments/area/:areaId/customers
 * ============================================================================
 */
export const getAreaCustomersByAreaId = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    const { areaId } = req.params;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!areaId || isNaN(areaId)) {
      return res.status(400).json({ success: false, message: "Valid areaId parameter is required" });
    }

    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    // If not admin, check if user is assigned to this area
    if (!isAdmin) {
      const [assignment] = await db.query(
        `SELECT id FROM user_area_assignments WHERE user_id = ? AND area_id = ? AND is_active = TRUE`,
        [authUserId, parseInt(areaId, 10)]
      );
      if (!assignment.length) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this area",
        });
      }
    }

    req.query.area_id = areaId;
    return getUserAssignedAreaCustomers(req, res);
  } catch (err) {
    console.error("getAreaCustomersByAreaId Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching customers for area",
    });
  }
};

/**
 * ============================================================================
 * 13. GET CUSTOMERS BY USER ID (All Areas Assigned to User)
 * GET /api/user-area-assignments/user/:userId/customers
 * ============================================================================
 */
export const getAreaCustomersByUserId = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    const { userId } = req.params;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId parameter is required" });
    }

    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    // Non-admin can only view their own customers
    if (!isAdmin && parseInt(userId, 10) !== authUserId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only view customers in your own assigned areas",
      });
    }

    req.query.user_id = userId;
    return getUserAssignedAreaCustomers(req, res);
  } catch (err) {
    console.error("getAreaCustomersByUserId Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area customers for user",
    });
  }
};

/**
 * ============================================================================
 * 14. GET AREA ASSIGNED CHIT COLLECTIONS (Collections & Installment Dues)
 * GET /api/user-area-assignments/my-collections
 * GET /api/user-area-assignments/collections
 * ============================================================================
 * Returns customers in user's assigned areas who have active chit subscriptions,
 * with due installments, amounts paid, pending amounts, and direct assignment info.
 */
export const getAreaAssignedCollections = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    const {
      area_id,
      search,
      due_only,
      user_id,
      sort_by = "customer_name",
      sort_order = "ASC",
      page = 1,
      limit = 10,
    } = req.query;

    const targetUserId = isAdmin && user_id ? parseInt(user_id, 10) : (!isAdmin ? authUserId : null);

    const whereConditions = [
      "c.area_id IS NOT NULL",
      "uaa.is_active = TRUE",
      "(ccs.is_maturity_paid = FALSE OR ccs.is_maturity_paid IS NULL OR ccs.is_maturity_paid = 0)",
    ];
    const params = [];

    if (targetUserId) {
      whereConditions.push("uaa.user_id = ?");
      params.push(targetUserId);
    }

    if (area_id) {
      whereConditions.push("c.area_id = ?");
      params.push(parseInt(area_id, 10));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        "(c.name LIKE ? OR c.phone LIKE ? OR c.place LIKE ? OR b.batch_name LIKE ? OR p.plan_name LIKE ? OR a.name LIKE ?)"
      );
      params.push(term, term, term, term, term, term);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count Query
    const countQuery = `
      SELECT COUNT(DISTINCT ccs.id) AS total_count
      FROM chit_customer_subscriptions ccs
      JOIN chit_customers c ON ccs.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      LEFT JOIN batches b ON ccs.batch_id = b.id
      LEFT JOIN plans p ON ccs.plan_id = p.id
      WHERE ${whereClause}
    `;

    const [countRows] = await db.query(countQuery, params);
    const totalCount = countRows[0]?.total_count || 0;

    // Sorting
    const allowedSortFields = {
      customer_name: "c.name",
      installment_amount: "ccs.installment_amount",
      start_date: "ccs.start_date",
      end_date: "ccs.end_date",
      area_name: "a.name",
      subscription_id: "ccs.id",
    };
    const sortColumn = allowedSortFields[sort_by] || "c.name";
    const sortDir = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Pagination
    const isUnpaginated =
      String(limit).toLowerCase() === "all" ||
      parseInt(limit, 10) === 0 ||
      parseInt(limit, 10) < 0;

    let paginationClause = "";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let pageLimit = 10;

    if (!isUnpaginated) {
      pageLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;
      paginationClause = `LIMIT ${pageLimit} OFFSET ${offset}`;
    }

    const mainQuery = `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.door_no,
        c.address,

        a.id AS area_id,
        a.name AS area_name,
        a.code AS area_code,

        ccs.id AS subscription_id,
        ccs.batch_id,
        b.batch_name,
        ccs.plan_id,
        p.plan_name,
        ccs.chit_quantity,
        ccs.installment_amount,
        ccs.total_installment_amount,
        ccs.start_date,
        ccs.end_date,
        ccs.duration,
        ccs.nominee_name,
        ccs.nominee_phone,

        (
          SELECT COUNT(*) 
          FROM chit_collections_payments ccp 
          WHERE ccp.subscription_id = ccs.id
        ) AS payments_count,

        (
          SELECT COALESCE(SUM(ccp.total_amount), 0) 
          FROM chit_collections_payments ccp 
          WHERE ccp.subscription_id = ccs.id
        ) AS total_paid_amount,

        GREATEST(
          0, 
          ccs.total_installment_amount - COALESCE(
            (SELECT SUM(ccp.total_amount) FROM chit_collections_payments ccp WHERE ccp.subscription_id = ccs.id), 
            0
          )
        ) AS total_due_amount,

        (
          SELECT MIN(ci.due_date) 
          FROM chit_customer_installments ci 
          WHERE ci.subscription_id = ccs.id 
            AND ci.due_date >= CURDATE()
        ) AS next_due_date,

        GREATEST(
          0,
          ccs.duration - COALESCE(
            (SELECT COUNT(*) FROM chit_collections_payments ccp WHERE ccp.subscription_id = ccs.id),
            0
          )
        ) AS pending_installments_count,

        CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_chit_customer_assignments uca 
            WHERE uca.customer_id = c.id 
              AND uca.user_id = uaa.user_id 
              AND uca.is_active = TRUE
          ) THEN TRUE 
          ELSE FALSE 
        END AS is_directly_assigned,

        (
          SELECT uca.id FROM user_chit_customer_assignments uca 
          WHERE uca.customer_id = c.id 
            AND uca.user_id = uaa.user_id 
            AND uca.is_active = TRUE 
          LIMIT 1
        ) AS direct_assignment_id

      FROM chit_customer_subscriptions ccs
      JOIN chit_customers c ON ccs.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      LEFT JOIN batches b ON ccs.batch_id = b.id
      LEFT JOIN plans p ON ccs.plan_id = p.id
      WHERE ${whereClause}
      GROUP BY ccs.id, c.id, a.id, uaa.user_id
      ORDER BY ${sortColumn} ${sortDir}
      ${paginationClause}
    `;

    const [rows] = await db.query(mainQuery, params);

    const totalPages = isUnpaginated ? 1 : Math.ceil(totalCount / pageLimit);

    return res.status(200).json({
      success: true,
      message: "Area assigned collections retrieved successfully",
      summary: {
        total_subscriptions: totalCount,
        effective_user_id: targetUserId,
      },
      pagination: {
        total_records: totalCount,
        current_page: isUnpaginated ? 1 : pageNum,
        limit: isUnpaginated ? totalCount : pageLimit,
        total_pages: totalPages,
        has_next_page: !isUnpaginated && pageNum < totalPages,
        has_prev_page: !isUnpaginated && pageNum > 1,
      },
      data: rows,
    });
  } catch (err) {
    console.error("getAreaAssignedCollections Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area assigned collections",
    });
  }
};

/**
 * ============================================================================
 * 15. GET USER ASSIGNED AREA BILLING CUSTOMERS
 * GET /api/user-area-assignments/my-billing-customers
 * GET /api/user-area-assignments/billing-customers
 * ============================================================================
 * Retrieves billing customers belonging to areas assigned to the logged-in user.
 * References user_bill_customer_assignments for direct customer assignment details
 * (same schema and table as assignedBillCustomer.routes.js).
 */
export const getUserAssignedAreaBillingCustomers = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    // Role check
    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    const {
      search,
      area_id,
      area_ids,
      place,
      district,
      state,
      pincode,
      user_id,
      is_directly_assigned,
      has_bills,
      has_pending_dues,
      startDate,
      endDate,
      sort_by = "customer_name",
      sort_order = "ASC",
      page = 1,
      limit = 10,
    } = req.query;

    let targetUserId = null;
    if (isAdmin) {
      if (user_id) targetUserId = parseInt(user_id, 10);
    } else {
      targetUserId = authUserId;
    }

    const whereConditions = ["c.area_id IS NOT NULL"];
    const params = [];

    // Area assignment filtering
    if (targetUserId) {
      whereConditions.push("uaa.user_id = ?");
      params.push(targetUserId);
      whereConditions.push("uaa.is_active = TRUE");
    } else {
      // Admin viewing all assigned areas
      whereConditions.push("uaa.is_active = TRUE");
    }

    // Area filters
    if (area_id) {
      whereConditions.push("c.area_id = ?");
      params.push(parseInt(area_id, 10));
    } else if (area_ids) {
      const ids = String(area_ids)
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id) && id > 0);
      if (ids.length > 0) {
        whereConditions.push(`c.area_id IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      }
    }

    // Location filters
    if (place && place.trim()) {
      whereConditions.push("c.place LIKE ?");
      params.push(`%${place.trim()}%`);
    }
    if (district && district.trim()) {
      whereConditions.push("c.district LIKE ?");
      params.push(`%${district.trim()}%`);
    }
    if (state && state.trim()) {
      whereConditions.push("c.state LIKE ?");
      params.push(`%${state.trim()}%`);
    }
    if (pincode && pincode.trim()) {
      whereConditions.push("c.pincode = ?");
      params.push(pincode.trim());
    }

    // Date filters (customer creation date)
    if (startDate) {
      whereConditions.push("DATE(c.created_at) >= ?");
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push("DATE(c.created_at) <= ?");
      params.push(endDate);
    }

    // Live search (search by first_name, last_name, phone, email, place, address, district, area name, code)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        `(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.place LIKE ? OR c.address LIKE ? OR c.district LIKE ? OR a.name LIKE ? OR a.code LIKE ?)`
      );
      params.push(term, term, term, term, term, term, term, term, term);
    }

    // Direct assignment filter (references user_bill_customer_assignments)
    const directCheckUserId = targetUserId || authUserId;
    if (is_directly_assigned !== undefined) {
      const isDirectBool =
        is_directly_assigned === "true" ||
        is_directly_assigned === "1" ||
        is_directly_assigned === true;
      whereConditions.push(
        `${isDirectBool ? "EXISTS" : "NOT EXISTS"} (
          SELECT 1 FROM user_bill_customer_assignments ubca 
          WHERE ubca.customer_id = c.id 
            AND ubca.user_id = ? 
            AND ubca.is_active = TRUE
        )`
      );
      params.push(directCheckUserId);
    }

    // Bills filters
    if (has_bills !== undefined) {
      const hasBillsBool =
        has_bills === "true" || has_bills === "1" || has_bills === true;
      whereConditions.push(
        `(SELECT COUNT(*) FROM customerBilling cb WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE') ${hasBillsBool ? ">" : "="} 0`
      );
    }

    if (has_pending_dues !== undefined) {
      const hasDuesBool =
        has_pending_dues === "true" ||
        has_pending_dues === "1" ||
        has_pending_dues === true;
      whereConditions.push(
        `(SELECT COUNT(*) FROM customerBilling cb WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE' AND cb.balance_due > 0) ${hasDuesBool ? ">" : "="} 0`
      );
    }

    const whereClause = whereConditions.join(" AND ");

    // Count Query
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) AS total_count,
             COUNT(DISTINCT a.id) AS total_areas_count
      FROM customers c
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      WHERE ${whereClause}
    `;

    const [countResult] = await db.query(countQuery, params);
    const totalCount = countResult[0]?.total_count || 0;
    const totalAreasCount = countResult[0]?.total_areas_count || 0;

    // Sorting
    const allowedSortFields = {
      name: "c.first_name",
      customer_name: "c.first_name",
      first_name: "c.first_name",
      last_name: "c.last_name",
      created_at: "c.created_at",
      place: "c.place",
      phone: "c.phone",
      email: "c.email",
      area_name: "a.name",
      id: "c.id",
      total_balance_due: "total_balance_due",
      total_billed_amount: "total_billed_amount",
    };
    const sortColumn = allowedSortFields[sort_by] || "c.first_name";
    const sortDirection = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Pagination
    const isUnpaginated =
      String(limit).toLowerCase() === "all" ||
      parseInt(limit, 10) === 0 ||
      parseInt(limit, 10) < 0;

    let paginationClause = "";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let pageLimit = 10;

    if (!isUnpaginated) {
      pageLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;
      paginationClause = `LIMIT ${pageLimit} OFFSET ${offset}`;
    }

    // Main Query
    const mainQuery = `
      SELECT 
        c.id AS customer_id,
        c.first_name,
        c.last_name,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS customer_name,
        c.phone,
        c.email,
        c.address,
        c.place,
        c.district,
        c.state,
        c.pincode,
        c.country,
        c.latitude,
        c.longitude,
        c.google_maps_url,
        c.created_at AS customer_created_at,

        a.id AS area_id,
        a.name AS area_name,
        a.code AS area_code,
        a.status AS area_status,

        uaa.id AS area_assignment_id,
        uaa.assigned_at AS area_assigned_at,
        uaa.is_active AS area_assignment_active,
        uaa.user_id AS assigned_user_id,
        u.username AS assigned_user_name,

        -- Direct Billing Customer Assignment (user_bill_customer_assignments)
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_bill_customer_assignments ubca 
            WHERE ubca.customer_id = c.id 
              AND ubca.user_id = uaa.user_id 
              AND ubca.is_active = TRUE
          ) THEN TRUE 
          ELSE FALSE 
        END AS is_directly_assigned,

        (
          SELECT ubca.id FROM user_bill_customer_assignments ubca 
          WHERE ubca.customer_id = c.id 
            AND ubca.user_id = uaa.user_id 
            AND ubca.is_active = TRUE
          LIMIT 1
        ) AS direct_assignment_id,

        (
          SELECT ubca.assigned_at FROM user_bill_customer_assignments ubca 
          WHERE ubca.customer_id = c.id 
            AND ubca.user_id = uaa.user_id 
            AND ubca.is_active = TRUE
          LIMIT 1
        ) AS direct_assigned_at,

        (
          SELECT ab.username FROM user_bill_customer_assignments ubca
          LEFT JOIN users_roles ab ON ab.id = ubca.assigned_by
          WHERE ubca.customer_id = c.id 
            AND ubca.user_id = uaa.user_id 
            AND ubca.is_active = TRUE
          LIMIT 1
        ) AS direct_assigned_by_name,

        -- Customer Billing summary
        (
          SELECT COUNT(*) 
          FROM customerBilling cb 
          WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE'
        ) AS total_bills,

        (
          SELECT COALESCE(SUM(cb.grand_total), 0) 
          FROM customerBilling cb 
          WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE'
        ) AS total_billed_amount,

        (
          SELECT COALESCE(SUM(cb.grand_total - cb.balance_due), 0) 
          FROM customerBilling cb 
          WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE'
        ) AS total_paid_amount,

        (
          SELECT COALESCE(SUM(cb.balance_due), 0) 
          FROM customerBilling cb 
          WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE' AND cb.balance_due > 0
        ) AS total_balance_due,

        (
          SELECT COUNT(*) 
          FROM customerBilling cb 
          WHERE cb.customer_id = c.id AND cb.status = 'ACTIVE' AND cb.balance_due > 0
        ) AS pending_bills_count

      FROM customers c
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      JOIN users_roles u ON uaa.user_id = u.id
      WHERE ${whereClause}
      GROUP BY c.id, a.id, uaa.user_id
      ORDER BY ${sortColumn} ${sortDirection}
      ${paginationClause}
    `;

    const [rows] = await db.query(mainQuery, params);

    const totalPages = isUnpaginated ? 1 : Math.ceil(totalCount / pageLimit);

    return res.status(200).json({
      success: true,
      message: "User assigned area billing customers retrieved successfully",
      summary: {
        total_customers: totalCount,
        total_assigned_areas: totalAreasCount,
        user_id: targetUserId,
        view_mode: isAdmin && !user_id ? "ADMIN_ALL" : "USER_SPECIFIC",
      },
      pagination: {
        total_records: totalCount,
        current_page: isUnpaginated ? 1 : pageNum,
        limit: isUnpaginated ? totalCount : pageLimit,
        total_pages: totalPages,
        has_next_page: !isUnpaginated && pageNum < totalPages,
        has_prev_page: !isUnpaginated && pageNum > 1,
      },
      data: rows,
    });
  } catch (err) {
    console.error("getUserAssignedAreaBillingCustomers Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area assigned billing customers",
    });
  }
};

/**
 * ============================================================================
 * 16. GET BILLING CUSTOMERS BY AREA ID (With Assignment Verification)
 * GET /api/user-area-assignments/area/:areaId/billing-customers
 * ============================================================================
 */
export const getAreaBillingCustomersByAreaId = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    const { areaId } = req.params;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!areaId || isNaN(areaId)) {
      return res.status(400).json({ success: false, message: "Valid areaId parameter is required" });
    }

    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    // If not admin, check if user is assigned to this area
    if (!isAdmin) {
      const [assignment] = await db.query(
        `SELECT id FROM user_area_assignments WHERE user_id = ? AND area_id = ? AND is_active = TRUE`,
        [authUserId, parseInt(areaId, 10)]
      );
      if (!assignment.length) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this area",
        });
      }
    }

    req.query.area_id = areaId;
    return getUserAssignedAreaBillingCustomers(req, res);
  } catch (err) {
    console.error("getAreaBillingCustomersByAreaId Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching billing customers for area",
    });
  }
};

/**
 * ============================================================================
 * 17. GET BILLING CUSTOMERS BY USER ID (All Areas Assigned to User)
 * GET /api/user-area-assignments/user/:userId/billing-customers
 * ============================================================================
 */
export const getAreaBillingCustomersByUserId = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    const { userId } = req.params;

    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId parameter is required" });
    }

    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    // Non-admin can only view their own customers
    if (!isAdmin && parseInt(userId, 10) !== authUserId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only view billing customers in your own assigned areas",
      });
    }

    req.query.user_id = userId;
    return getUserAssignedAreaBillingCustomers(req, res);
  } catch (err) {
    console.error("getAreaBillingCustomersByUserId Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area billing customers for user",
    });
  }
};

/**
 * ============================================================================
 * 18. GET AREA ASSIGNED BILLING COLLECTIONS (Pending Bills & Balances)
 * GET /api/user-area-assignments/my-billing-collections
 * GET /api/user-area-assignments/billing-collections
 * ============================================================================
 */
export const getAreaAssignedBillingCollections = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [roleRows] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [authUserId],
    );
    const roleName = String(roleRows[0]?.role_name || "").toUpperCase();
    const isAdmin = roleName === "ADMIN";

    const {
      area_id,
      search,
      user_id,
      sort_by = "invoice_date",
      sort_order = "DESC",
      page = 1,
      limit = 10,
    } = req.query;

    const targetUserId = isAdmin && user_id ? parseInt(user_id, 10) : (!isAdmin ? authUserId : null);

    const whereConditions = [
      "c.area_id IS NOT NULL",
      "uaa.is_active = TRUE",
      "cb.status = 'ACTIVE'",
      "cb.balance_due > 0",
    ];
    const params = [];

    if (targetUserId) {
      whereConditions.push("uaa.user_id = ?");
      params.push(targetUserId);
    }

    if (area_id) {
      whereConditions.push("c.area_id = ?");
      params.push(parseInt(area_id, 10));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        "(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR c.place LIKE ? OR cb.invoice_number LIKE ? OR a.name LIKE ?)"
      );
      params.push(term, term, term, term, term, term);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count Query
    const countQuery = `
      SELECT COUNT(DISTINCT cb.id) AS total_count,
             COALESCE(SUM(cb.balance_due), 0) AS total_pending_amount
      FROM customerBilling cb
      JOIN customers c ON cb.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      WHERE ${whereClause}
    `;

    const [countRows] = await db.query(countQuery, params);
    const totalCount = countRows[0]?.total_count || 0;
    const totalPendingAmount = countRows[0]?.total_pending_amount || 0;

    // Sorting
    const allowedSortFields = {
      customer_name: "c.first_name",
      invoice_date: "cb.invoice_date",
      invoice_number: "cb.invoice_number",
      grand_total: "cb.grand_total",
      balance_due: "cb.balance_due",
      area_name: "a.name",
      id: "cb.id",
    };
    const sortColumn = allowedSortFields[sort_by] || "cb.invoice_date";
    const sortDir = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Pagination
    const isUnpaginated =
      String(limit).toLowerCase() === "all" ||
      parseInt(limit, 10) === 0 ||
      parseInt(limit, 10) < 0;

    let paginationClause = "";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    let pageLimit = 10;

    if (!isUnpaginated) {
      pageLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * pageLimit;
      paginationClause = `LIMIT ${pageLimit} OFFSET ${offset}`;
    }

    const mainQuery = `
      SELECT 
        cb.id AS invoice_id,
        cb.invoice_number,
        cb.invoice_date,
        cb.grand_total,
        cb.advance_paid,
        cb.balance_due,
        cb.payment_status,
        cb.status AS bill_status,
        cb.created_at AS bill_created_at,

        c.id AS customer_id,
        c.first_name,
        c.last_name,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS customer_name,
        c.phone,
        c.place,
        c.address,

        a.id AS area_id,
        a.name AS area_name,
        a.code AS area_code,

        uaa.id AS area_assignment_id,
        uaa.user_id AS assigned_user_id,
        u.username AS assigned_user_name,

        CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_bill_customer_assignments ubca 
            WHERE ubca.customer_id = c.id 
              AND ubca.user_id = uaa.user_id 
              AND ubca.is_active = TRUE
          ) THEN TRUE 
          ELSE FALSE 
        END AS is_directly_assigned,

        (
          SELECT ubca.id FROM user_bill_customer_assignments ubca 
          WHERE ubca.customer_id = c.id 
            AND ubca.user_id = uaa.user_id 
            AND ubca.is_active = TRUE 
          LIMIT 1
        ) AS direct_assignment_id

      FROM customerBilling cb
      JOIN customers c ON cb.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      JOIN user_area_assignments uaa ON uaa.area_id = a.id
      JOIN users_roles u ON uaa.user_id = u.id
      WHERE ${whereClause}
      GROUP BY cb.id, c.id, a.id, uaa.user_id
      ORDER BY ${sortColumn} ${sortDir}
      ${paginationClause}
    `;

    const [rows] = await db.query(mainQuery, params);

    const totalPages = isUnpaginated ? 1 : Math.ceil(totalCount / pageLimit);

    return res.status(200).json({
      success: true,
      message: "Area assigned billing collections retrieved successfully",
      summary: {
        total_pending_invoices: totalCount,
        total_pending_amount: totalPendingAmount,
        effective_user_id: targetUserId,
      },
      pagination: {
        total_records: totalCount,
        current_page: isUnpaginated ? 1 : pageNum,
        limit: isUnpaginated ? totalCount : pageLimit,
        total_pages: totalPages,
        has_next_page: !isUnpaginated && pageNum < totalPages,
        has_prev_page: !isUnpaginated && pageNum > 1,
      },
      data: rows,
    });
  } catch (err) {
    console.error("getAreaAssignedBillingCollections Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching area assigned billing collections",
    });
  }
};


