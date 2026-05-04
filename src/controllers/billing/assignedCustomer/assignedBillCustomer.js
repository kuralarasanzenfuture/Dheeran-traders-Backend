import db from "../../../config/db.js";

export const assignUserToCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { user_id, customer_id } = req.body;
    const assigned_by = req.user?.id;

    console.log("REQ.USER:", req.user);

    if (!user_id) throw new Error("user_id is required");
    if (!customer_id) throw new Error("customer_id is required");
    if (!assigned_by) throw new Error("Unauthorized");

    // 🔴 CHECK USER
    const [userRows] = await connection.query(
      `SELECT role_id FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!userRows.length) throw new Error("User not found");
    if (userRows[0].role_id === 1) {
      throw new Error("Admin cannot be assigned");
    }

    // 🔴 CHECK CUSTOMER (FIXED TABLE)
    const [customerRows] = await connection.query(
      `SELECT id FROM customers WHERE id = ?`,
      [customer_id]
    );

    if (!customerRows.length) throw new Error("Customer not found");

    // 🔴 DEACTIVATE OLD ACTIVE ASSIGNMENT (CRITICAL)
    await connection.query(
      `UPDATE user_bill_customer_assignments
       SET is_active = FALSE,
           updated_by = ?,
           updated_at = NOW()
       WHERE customer_id = ?
         AND is_active = TRUE`,
      [assigned_by, customer_id]
    );

    // 🔴 CHECK EXISTING SAME USER
    const [existing] = await connection.query(
      `SELECT id FROM user_bill_customer_assignments
       WHERE user_id = ? AND customer_id = ?`,
      [user_id, customer_id]
    );

    if (existing.length) {
      await connection.query(
        `UPDATE user_bill_customer_assignments
         SET is_active = TRUE,
             assigned_by = ?,
             assigned_at = NOW(),
             updated_by = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [assigned_by, assigned_by, existing[0].id]
      );
    } else {
      await connection.query(
        `INSERT INTO user_bill_customer_assignments
         (user_id, customer_id, assigned_by)
         VALUES (?, ?, ?)`,
        [user_id, customer_id, assigned_by]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Customer assigned successfully",
    });

  } catch (err) {
    await connection.rollback();

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Only one active user allowed per customer",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

export const getMyCustomers = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    const [roleRow] = await db.query(
      `SELECT r.role_name 
       FROM users_roles u
       JOIN role_based r ON r.id = u.role_id
       WHERE u.id = ?`,
      [user_id]
    );

    if (!roleRow.length) throw new Error("User role not found");

    const roleName = roleRow[0].role_name;

    // ✅ ADMIN → ALL
    if (roleName === "ADMIN") {
      const [rows] = await db.query(`
        SELECT 
          uca.id AS assignment_id,

          c.id AS customer_id,
          c.first_name,
          c.last_name,
          c.phone,
          c.place,
          c.address,

          u.id AS user_id,
          u.username AS user_name,

          ab.username AS assigned_by_name,

          uca.assigned_at,
          uca.is_active

        FROM user_bill_customer_assignments uca
        JOIN customers c ON c.id = uca.customer_id
        JOIN users_roles u ON u.id = uca.user_id
        LEFT JOIN users_roles ab ON ab.id = uca.assigned_by

        ORDER BY uca.assigned_at DESC
      `);

      return res.json({ success: true, data: rows });
    }

    // ✅ USER → ONLY HIS
    const [rows] = await db.query(
      `
      SELECT 
        uca.id AS assignment_id,

        c.id AS customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.place,
        c.address,

        uca.assigned_at

      FROM user_bill_customer_assignments uca
      JOIN customers c ON c.id = uca.customer_id

      WHERE uca.user_id = ?
        AND uca.is_active = TRUE

      ORDER BY uca.assigned_at DESC
      `,
      [user_id]
    );

    return res.json({ success: true, data: rows });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const removeUserFromCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updated_by = req.user?.id;

    if (!id) throw new Error("assignment_id is required");

    const [rows] = await db.query(
      `SELECT * FROM user_bill_customer_assignments WHERE id = ?`,
      [id]
    );

    if (!rows.length) throw new Error("Assignment not found");

    await db.query(
      `UPDATE user_bill_customer_assignments
       SET is_active = FALSE,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [updated_by, id]
    );

    return res.json({
      success: true,
      message: "Assignment removed",
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateAssignment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { user_id, is_active } = req.body;
    const updated_by = req.user?.id;

    if (!id) throw new Error("assignment_id is required");
    if (!updated_by) throw new Error("Unauthorized");

    // 🔴 GET EXISTING
    const [rows] = await connection.query(
      `SELECT * FROM user_bill_customer_assignments WHERE id = ?`,
      [id]
    );

    if (!rows.length) throw new Error("Assignment not found");

    const assignment = rows[0];

    let newUserId = assignment.user_id;
    let newStatus = assignment.is_active;

    // 🔴 HANDLE USER CHANGE (REASSIGN)
    if (user_id !== undefined) {
      const [userRows] = await connection.query(
        `SELECT role_id FROM users_roles WHERE id = ?`,
        [user_id]
      );

      if (!userRows.length) throw new Error("User not found");

      if (userRows[0].role_id === 1) {
        throw new Error("Admin cannot be assigned");
      }

      // 🚨 DEACTIVATE OTHER ACTIVE ASSIGNMENTS FOR SAME CUSTOMER
      await connection.query(
        `UPDATE user_bill_customer_assignments
         SET is_active = FALSE,
             updated_by = ?,
             updated_at = NOW()
         WHERE customer_id = ?
           AND is_active = TRUE
           AND id != ?`,
        [updated_by, assignment.customer_id, id]
      );

      newUserId = user_id;
      newStatus = true; // force active on reassignment
    }

    // 🔴 HANDLE ACTIVE STATUS CHANGE
    if (typeof is_active === "boolean") {
      newStatus = is_active;

      // 🚨 IF ACTIVATING → DEACTIVATE OTHERS
      if (is_active === true) {
        await connection.query(
          `UPDATE user_bill_customer_assignments
           SET is_active = FALSE,
               updated_by = ?,
               updated_at = NOW()
           WHERE customer_id = ?
             AND is_active = TRUE
             AND id != ?`,
          [updated_by, assignment.customer_id, id]
        );
      }
    }

    // 🔴 UPDATE FINAL
    await connection.query(
      `UPDATE user_bill_customer_assignments
       SET user_id = ?,
           is_active = ?,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [newUserId, newStatus, updated_by, id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Assignment updated successfully",
    });

  } catch (err) {
    await connection.rollback();

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Duplicate assignment not allowed",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};