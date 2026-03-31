
import db from "../../config/db.js";

// export const assignUserToCustomer = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { user_id, customer_id } = req.body;
//     const assigned_by = req.user?.id;

//     // 🔴 BASIC VALIDATION
//     if (!user_id) throw new Error("user_id is required");
//     if (!customer_id) throw new Error("customer_id is required");
//     if (!assigned_by) throw new Error("Unauthorized");

//     // 🔴 CHECK USER EXISTS
//     const [userRows] = await connection.query(
//       `SELECT id FROM users_roles WHERE id = ?`,
//       [user_id]
//     );

//     if (!userRows.length) {
//       throw new Error("User not found");
//     }

//     // 🔴 CHECK CUSTOMER EXISTS
//     const [customerRows] = await connection.query(
//       `SELECT id FROM chit_customers WHERE id = ?`,
//       [customer_id]
//     );

//     if (!customerRows.length) {
//       throw new Error("Customer not found");
//     }

//     // 🔴 CHECK ALREADY ASSIGNED (HANDLE UNIQUE BEFORE DB ERROR)
//     const [existing] = await connection.query(
//       `SELECT id, is_active 
//        FROM user_chit_customer_assignments
//        WHERE user_id = ? AND customer_id = ?`,
//       [user_id, customer_id]
//     );

//     if (existing.length) {
//       if (existing[0].is_active) {
//         throw new Error("User already assigned to this customer");
//       } else {
//         // ✅ Reactivate instead of duplicate insert
//         await connection.query(
//           `UPDATE user_chit_customer_assignments
//            SET is_active = TRUE,
//                assigned_by = ?,
//                assigned_at = NOW()
//            WHERE id = ?`,
//           [assigned_by, existing[0].id]
//         );

//         await connection.commit();

//         return res.json({
//           success: true,
//           message: "Assignment reactivated successfully",
//         });
//       }
//     }

//     // 🔴 INSERT NEW
//     await connection.query(
//       `INSERT INTO user_chit_customer_assignments
//        (user_id, customer_id, assigned_by)
//        VALUES (?, ?, ?)`,
//       [user_id, customer_id, assigned_by]
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: "User assigned to customer successfully",
//     });

//   } catch (err) {
//     await connection.rollback();

//     // 🔥 HANDLE DB UNIQUE ERROR (safety fallback)
//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(400).json({
//         success: false,
//         message: "Duplicate assignment: user already assigned to this customer",
//       });
//     }

//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

// export const getMyCustomers = async (req, res) => {
//   try {
//     const user_id = req.user?.id;

//     if (!user_id) throw new Error("Unauthorized");

//     const [rows] = await db.query(
//       `SELECT 
//         c.id,
//         c.name,
//         c.phone,
//         c.place,
//         c.address

//       FROM chit_customers c

//       JOIN user_chit_customer_assignments uca
//         ON c.id = uca.customer_id

//       WHERE uca.user_id = ?
//         AND uca.is_active = TRUE

//       ORDER BY c.name ASC`,
//       [user_id]
//     );

//     return res.json({
//       success: true,
//       data: rows,
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// export const removeUserFromCustomer = async (req, res) => {
//   try {
//     const { user_id, customer_id } = req.body;

//     if (!user_id || !customer_id) {
//       throw new Error("user_id and customer_id required");
//     }

//     const [result] = await db.query(
//       `UPDATE user_chit_customer_assignments
//        SET is_active = FALSE
//        WHERE user_id = ? AND customer_id = ?`,
//       [user_id, customer_id]
//     );

//     if (result.affectedRows === 0) {
//       throw new Error("Assignment not found");
//     }

//     return res.json({
//       success: true,
//       message: "Assignment removed successfully",
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// --------------------------------------------------------------------

export const assignUserToCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { user_id, customer_id } = req.body;
    const assigned_by = req.user?.id;
    const assigned_by_role = req.user?.role;

    if (!user_id) throw new Error("user_id is required");
    if (!customer_id) throw new Error("customer_id is required");
    if (!assigned_by) throw new Error("Unauthorized");

    // ❌ ADMIN CANNOT BE ASSIGNED
    const [userRows] = await connection.query(
      `SELECT id, role_id FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!userRows.length) throw new Error("User not found");

    const targetUser = userRows[0];

    // 👉 CHANGE THIS BASED ON YOUR ROLE TABLE
    if (targetUser.role_id === 1) {
      throw new Error("Admin users cannot be assigned to customers");
    }

    // 🔴 CHECK CUSTOMER
    const [customerRows] = await connection.query(
      `SELECT id FROM chit_customers WHERE id = ?`,
      [customer_id]
    );

    if (!customerRows.length) throw new Error("Customer not found");

    // 🔴 CHECK EXISTING
    const [existing] = await connection.query(
      `SELECT id, is_active 
       FROM user_chit_customer_assignments
       WHERE user_id = ? AND customer_id = ?`,
      [user_id, customer_id]
    );

    if (existing.length) {
      if (existing[0].is_active) {
        throw new Error("User already assigned to this customer");
      } else {
        await connection.query(
          `UPDATE user_chit_customer_assignments
           SET is_active = TRUE,
               assigned_by = ?,
               assigned_at = NOW()
           WHERE id = ?`,
          [assigned_by, existing[0].id]
        );

        await connection.commit();

        return res.json({
          success: true,
          message: "Assignment reactivated successfully",
        });
      }
    }

    // 🔴 INSERT
    await connection.query(
      `INSERT INTO user_chit_customer_assignments
       (user_id, customer_id, assigned_by)
       VALUES (?, ?, ?)`,
      [user_id, customer_id, assigned_by]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "User assigned to customer successfully",
    });

  } catch (err) {
    await connection.rollback();

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Duplicate assignment: user already assigned",
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

// export const getMyCustomers = async (req, res) => {
//   try {
//     const user_id = req.user?.id;
//     const role = req.user?.role;

//     if (!user_id) throw new Error("Unauthorized");

//     // ✅ ADMIN → GET ALL CUSTOMERS
//     if (role === "admin") {
//       const [rows] = await db.query(
//         `SELECT id, name, phone, place, address
//          FROM chit_customers
//          ORDER BY name ASC`
//       );

//       return res.json({
//         success: true,
//         data: rows,
//       });
//     }

//     // ✅ NON-ADMIN → FILTERED
//     const [rows] = await db.query(
//       `SELECT 
//         c.id,
//         c.name,
//         c.phone,
//         c.place,
//         c.address

//       FROM chit_customers c

//       JOIN user_chit_customer_assignments uca
//         ON c.id = uca.customer_id

//       WHERE uca.user_id = ?
//         AND uca.is_active = TRUE

//       ORDER BY c.name ASC`,
//       [user_id]
//     );

//     return res.json({
//       success: true,
//       data: rows,
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const getMyCustomers = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const role = req.user?.role;

    if (!user_id) throw new Error("Unauthorized");

    // ✅ ADMIN → GET ALL WITH FULL DETAILS
    if (role === "admin") {
      const [rows] = await db.query(`
        SELECT 
          uca.id AS assignment_id,

          c.id AS customer_id,
          c.name AS customer_name,
          c.phone,
          c.place,
          c.address,

          u.id AS user_id,
          u.username AS user_name,
          u.email AS user_email,

          ab.id AS assigned_by_id,
          ab.username AS assigned_by_name,

          uca.assigned_at,
          uca.is_active

        FROM user_chit_customer_assignments uca

        JOIN chit_customers c 
          ON c.id = uca.customer_id

        JOIN users_roles u 
          ON u.id = uca.user_id

        LEFT JOIN users_roles ab 
          ON ab.id = uca.assigned_by

        ORDER BY uca.assigned_at DESC
      `);

      return res.json({
        success: true,
        data: rows,
      });
    }

    // ✅ NON-ADMIN → ONLY HIS ASSIGNMENTS
    const [rows] = await db.query(
      `
      SELECT 
        uca.id AS assignment_id,

        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        c.place,
        c.address,

        u.id AS user_id,
        u.username AS user_name,

        ab.id AS assigned_by_id,
        ab.username AS assigned_by_name,

        uca.assigned_at,
        uca.is_active

      FROM user_chit_customer_assignments uca

      JOIN chit_customers c 
        ON c.id = uca.customer_id

      JOIN users_roles u 
        ON u.id = uca.user_id

      LEFT JOIN users_roles ab 
        ON ab.id = uca.assigned_by

      WHERE uca.user_id = ?
        AND uca.is_active = TRUE

      ORDER BY uca.assigned_at DESC
      `,
      [user_id]
    );

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


export const removeUserFromCustomer = async (req, res) => {
  try {
    const { user_id, customer_id } = req.body;

    if (!user_id || !customer_id) {
      throw new Error("user_id and customer_id required");
    }

    // ❌ PREVENT ADMIN REMOVAL LOGIC
    const [userRows] = await db.query(
      `SELECT role_id FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!userRows.length) throw new Error("User not found");

    if (userRows[0].role_id === 1) {
      throw new Error("Admin cannot be part of assignments");
    }

    const [result] = await db.query(
      `UPDATE user_chit_customer_assignments
       SET is_active = FALSE
       WHERE user_id = ? AND customer_id = ?`,
      [user_id, customer_id]
    );

    if (result.affectedRows === 0) {
      throw new Error("Assignment not found");
    }

    return res.json({
      success: true,
      message: "Assignment removed successfully",
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

