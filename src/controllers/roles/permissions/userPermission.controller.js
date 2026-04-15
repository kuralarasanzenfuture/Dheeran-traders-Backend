import db from "../../../config/db.js";


// ✅ SAVE (Bulk)
// export const saveUserPermissions = async (req, res) => {
//   try {
//     const { user_id, permissions } = req.body;

//     if (!user_id || !Array.isArray(permissions)) {
//       return res.status(400).json({ message: "Invalid data" });
//     }

//     // ✅ Check user
//     const [[user]] = await db.query(
//       `SELECT id, role_id FROM users_roles WHERE id = ?`,
//       [user_id]
//     );

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // ✅ Check role
//     const [[role]] = await db.query(
//       `SELECT role_name FROM role_based WHERE id = ?`,
//       [user.role_id]
//     );

//     // ❌ Block ADMIN override
//     if (role?.role_name === "ADMIN") {
//       return res.status(403).json({
//         message: "Cannot override ADMIN user permissions"
//       });
//     }

//     for (const perm of permissions) {
//       const { module_id, action_id, is_allowed } = perm;

//       if (!module_id || !action_id) {
//         return res.status(400).json({
//           message: "Invalid permission data"
//         });
//       }

//       // ✅ Validate module
//       const [[module]] = await db.query(
//         `SELECT id FROM modules WHERE id = ?`,
//         [module_id]
//       );

//       if (!module) {
//         return res.status(400).json({
//           message: `Invalid module_id: ${module_id}`
//         });
//       }

//       // ✅ Validate action belongs to module
//       const [[action]] = await db.query(
//         `SELECT id FROM module_actions 
//          WHERE id = ? AND module_id = ?`,
//         [action_id, module_id]
//       );

//       if (!action) {
//         return res.status(400).json({
//           message: `Invalid action ${action_id} for module ${module_id}`
//         });
//       }

//       // ✅ Upsert
//       await db.query(`
//         INSERT INTO user_permissions (user_id, module_id, action_id, is_allowed)
//         VALUES (?, ?, ?, ?)
//         ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)
//       `, [user_id, module_id, action_id, is_allowed]);
//     }

// /*************  ✨ Windsurf Command ⭐  *************/
// /**
//  * Update a single user permission
//  * @param {Object} req.body - user_id, module_id, action_id, is_allowed
//  * @returns {Object} - success, message
//  * @throws {Error} - 400 if missing fields, 404 if user not found, 403 if ADMIN user, 400 if invalid module or action, 500 if server error
//  */
// /*******  e3c3d00a-3bc1-459c-bbe3-e205f05cf911  *******/    res.json({ message: "User permissions saved successfully" });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const saveUserPermissions = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { user_id, permissions } = req.body;

    if (!user_id || !Array.isArray(permissions)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    await connection.beginTransaction();

    // ✅ Validate user
    const [[user]] = await connection.query(
      `SELECT id, role_id FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!user) {
      throw new Error("User not found");
    }

    // 🔒 Strong ADMIN protection
    const ADMIN_ROLE_ID = 1;
    if (user.role_id === ADMIN_ROLE_ID) {
      throw new Error("Cannot override ADMIN user permissions");
    }

    // ✅ Fetch all modules & actions once
    const [modules] = await connection.query(`SELECT id FROM modules`);
    const [actions] = await connection.query(
      `SELECT id, module_id FROM module_actions`
    );

    const moduleSet = new Set(modules.map(m => m.id));
    const actionMap = new Map();

    actions.forEach(a => {
      actionMap.set(a.id, a.module_id);
    });

    // ✅ Prepare bulk insert
    const values = [];

    for (const perm of permissions) {
      const { module_id, action_id, is_allowed } = perm;

      if (!module_id || !action_id) {
        throw new Error("Invalid permission data");
      }

      if (!moduleSet.has(module_id)) {
        throw new Error(`Invalid module_id: ${module_id}`);
      }

      if (actionMap.get(action_id) !== module_id) {
        throw new Error(`Invalid action ${action_id} for module ${module_id}`);
      }

      values.push([user_id, module_id, action_id, is_allowed]);
    }

    // 🔥 Bulk upsert (massive performance gain)
    if (values.length > 0) {
      await connection.query(`
        INSERT INTO user_permissions (user_id, module_id, action_id, is_allowed)
        VALUES ?
        ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)
      `, [values]);
    }

    await connection.commit();

    res.json({
      message: "User permissions saved successfully",
      total: permissions.length
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);

    res.status(500).json({
      message: error.message || "Server error"
    });

  } finally {
    connection.release();
  }
};


// ✅ TOGGLE (Single)
export const updatetoggleUserPermission = async (req, res) => {
  try {
    const { user_id, module_id, action_id, is_allowed } = req.body;

    if (!user_id || !module_id || !action_id) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // ✅ Validate user
    const [[user]] = await db.query(
      `SELECT id, role_id FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Block ADMIN
    const [[role]] = await db.query(
      `SELECT role_name FROM role_based WHERE id = ?`,
      [user.role_id]
    );

    if (role?.role_name === "ADMIN") {
      return res.status(403).json({
        message: "Cannot modify ADMIN user permissions"
      });
    }

    // ✅ Validate module
    const [[module]] = await db.query(
      `SELECT id FROM modules WHERE id = ?`,
      [module_id]
    );

    if (!module) {
      return res.status(400).json({ message: "Invalid module" });
    }

    // ✅ Validate action
    const [[action]] = await db.query(
      `SELECT id FROM module_actions 
       WHERE id = ? AND module_id = ?`,
      [action_id, module_id]
    );

    if (!action) {
      return res.status(400).json({
        message: "Action does not belong to module"
      });
    }

    // ✅ Upsert
    await db.query(`
      INSERT INTO user_permissions (user_id, module_id, action_id, is_allowed)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE is_allowed = ?
    `, [user_id, module_id, action_id, is_allowed, is_allowed]);

    res.json({ message: "User permission updated" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET (User Permissions)

// export const getUserPermissionsById = async (req, res) => {
//   try {
//     const { user_id } = req.params;

//     // ✅ Validate user
//     const [[user]] = await db.query(
//       `SELECT id, role_id FROM users_roles WHERE id = ?`,
//       [user_id]
//     );

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const [rows] = await db.query(`
//       SELECT 
//         m.id AS module_id,
//         m.name AS module_name,
//         m.code AS module_code,
//         ma.id AS action_id,
//         ma.action_code,
//         COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
//       FROM modules m
//       JOIN module_actions ma ON ma.module_id = m.id
//       LEFT JOIN role_permissions rp 
//         ON rp.module_id = m.id 
//         AND rp.action_id = ma.id 
//         AND rp.role_id = ?
//       LEFT JOIN user_permissions up
//         ON up.module_id = m.id 
//         AND up.action_id = ma.id 
//         AND up.user_id = ?
//       ORDER BY m.id
//     `, [user.role_id, user_id]);

//     res.json(rows);

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const getUserPermissionsById = async (req, res) => {
  try {
    const { user_id } = req.params;

    // ✅ 1. Validate user_id
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        message: "Invalid user_id"
      });
    }

    // ✅ 2. Check user exists
    const [[user]] = await db.query(
      `SELECT * FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // ✅ 3. Get role info
    const [[role]] = await db.query(
      `SELECT id, role_name FROM role_based WHERE id = ?`,
      [user.role_id]
    );

    if (!role) {
      return res.status(404).json({
        message: "User role not found"
      });
    }

    // ❌ Optional: block ADMIN user fetch
    // if (role.role_name === "ADMIN") {
    //   return res.status(403).json({
    //     message: "Admin permissions cannot be modified"
    //   });
    // }

    // ✅ 4. Fetch permissions (user override > role)
    const [rows] = await db.query(`
      SELECT 
        m.id AS module_id,
        m.name AS module_name,
        m.code AS module_code,
        m.parent_id,

        ma.id AS action_id,
        ma.action_code,
        ma.action_name,

        COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed

      FROM modules m

      JOIN module_actions ma 
        ON ma.module_id = m.id

      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = ma.id 
        AND rp.role_id = ?

      LEFT JOIN user_permissions up
        ON up.module_id = m.id 
        AND up.action_id = ma.id 
        AND up.user_id = ?

      ORDER BY m.parent_id, m.id, ma.id
    `, [user.role_id, user_id]);

    // ✅ 5. Structure response (module → actions)
    const structured = [];
    const moduleMap = {};

    for (const row of rows) {
      if (!moduleMap[row.module_id]) {
        moduleMap[row.module_id] = {
          module_id: row.module_id,
          module_name: row.module_name,
          module_code: row.module_code,
          parent_id: row.parent_id,
          actions: []
        };
        structured.push(moduleMap[row.module_id]);
      }

      moduleMap[row.module_id].actions.push({
        action_id: row.action_id,
        action_code: row.action_code,
        action_name: row.action_name,
        is_allowed: !!row.is_allowed
      });
    }

    // ✅ 6. Final response
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: role.role_name
      },
      permissions: structured
    });

  } catch (error) {
    console.error("getUserPermissionsById error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};

export const getUserOverridePermissions = async (req, res) => {
  try {
    const { user_id } = req.params;

    // ✅ Validate
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        message: "Invalid user_id"
      });
    }

    // ✅ Check user exists
    const [[user]] = await db.query(
      `SELECT * FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // ✅ Fetch ONLY overrides
    const [rows] = await db.query(`
      SELECT 
        up.id,
        up.user_id,
        up.module_id,
        m.name AS module_name,
        m.code AS module_code,
        m.parent_id,

        up.action_id,
        ma.action_code,
        ma.action_name,

        up.is_allowed

      FROM user_permissions up

      JOIN modules m 
        ON m.id = up.module_id

      JOIN module_actions ma 
        ON ma.id = up.action_id

      WHERE up.user_id = ?

      ORDER BY m.parent_id, m.id, ma.id
    `, [user_id]);

    // ✅ Structure: module → actions
    const structured = [];
    const moduleMap = {};

    for (const row of rows) {
      if (!moduleMap[row.module_id]) {
        moduleMap[row.module_id] = {
          module_id: row.module_id,
          module_name: row.module_name,
          module_code: row.module_code,
          parent_id: row.parent_id,
          actions: []
        };
        structured.push(moduleMap[row.module_id]);
      }

      moduleMap[row.module_id].actions.push({
        action_id: row.action_id,
        action_code: row.action_code,
        action_name: row.action_name,
        is_allowed: !!row.is_allowed
      });
    }

    // ✅ Response
    res.json({
      success: true,
      user_id,
      count: rows.length,
      overrides: structured
    });

  } catch (error) {
    console.error("getUserOverridePermissions error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};
