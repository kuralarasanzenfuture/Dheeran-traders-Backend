import db from "../../../config/db.js";

// Assign / Update permissions (bulk)

// export const saveRolePermissions = async (req, res) => {
//   try {
//     const { role_id, permissions } = req.body;

//     if (!role_id || !Array.isArray(permissions)) {
//       return res.status(400).json({ message: "Invalid data" });
//     }

//     // ✅ 1. Check role exists
//     const [[role]] = await db.query(
//       `SELECT id, role_name FROM role_based WHERE id = ?`,
//       [role_id]
//     );

//     if (!role) {
//       return res.status(404).json({ message: "Role not found" });
//     }

//     // ❌ 2. Block ADMIN role
//     if (role.role_name === "ADMIN") {
//       return res.status(403).json({
//         message: "Admin permissions cannot be modified or create"
//       });
//     }

//     for (const perm of permissions) {

//       const { module_id, action_id, is_allowed } = perm;

//       // ✅ 3. Validate module exists
//       const [[module]] = await db.query(
//         `SELECT id FROM modules WHERE id = ?`,
//         [module_id]
//       );

//       if (!module) {
//         return res.status(400).json({
//           message: `Invalid module_id: ${module_id}`
//         });
//       }

//       // ✅ 4. Validate action belongs to module
//       const [[action]] = await db.query(
//         `SELECT id FROM module_actions 
//          WHERE id = ? AND module_id = ?`,
//         [action_id, module_id]
//       );

//       if (!action) {
//         return res.status(400).json({
//           message: `Invalid action_id ${action_id} for module ${module_id}`
//         });
//       }

//       // ✅ 5. Insert / Update
//       await db.query(`
//         INSERT INTO role_permissions (role_id, module_id, action_id, is_allowed)
//         VALUES (?, ?, ?, ?)
//         ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)
//       `, [role_id, module_id, action_id, is_allowed]);
//     }

//     res.json({ message: "Permissions saved successfully" });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const saveRolePermissions = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { role_id, permissions } = req.body;

    if (!role_id || !Array.isArray(permissions)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // 🔒 Admin protection
    const ADMIN_ROLE_ID = 1;
    if (role_id === ADMIN_ROLE_ID) {
      return res.status(403).json({
        message: "Admin permissions cannot be modified"
      });
    }

    await connection.beginTransaction();

    // ✅ Fetch once
    const [modules] = await connection.query(`SELECT id FROM modules`);
    const [actions] = await connection.query(`SELECT id, module_id FROM module_actions`);

    const moduleSet = new Set(modules.map(m => m.id));
    const actionMap = new Map();

    actions.forEach(a => {
      actionMap.set(a.id, a.module_id);
    });

    // ✅ Process
    for (const perm of permissions) {
      const { module_id, action_id, is_allowed } = perm;

      if (!moduleSet.has(module_id)) {
        throw new Error(`Invalid module_id: ${module_id}`);
      }

      if (actionMap.get(action_id) !== module_id) {
        throw new Error(`Invalid action ${action_id} for module ${module_id}`);
      }

      await connection.query(`
        INSERT INTO role_permissions (role_id, module_id, action_id, is_allowed)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)
      `, [role_id, module_id, action_id, is_allowed]);
    }

    await connection.commit();

    res.json({
      message: "Permissions saved successfully",
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


export const updatetogglePermission = async (req, res) => {
  try {
    const { role_id, module_id, action_id, is_allowed } = req.body;

    if (!role_id || !module_id || !action_id) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // ✅ Check role
    const [[role]] = await db.query(
      `SELECT role_name FROM role_based WHERE id = ?`,
      [role_id]
    );

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // ❌ Block ADMIN
    if (role.role_name === "ADMIN") {
      return res.status(403).json({
        message: "Admin permissions cannot be changed"
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

    // ✅ Validate action belongs to module
    const [[action]] = await db.query(
      `SELECT id FROM module_actions WHERE id = ? AND module_id = ?`,
      [action_id, module_id]
    );

    if (!action) {
      return res.status(400).json({
        message: "Action does not belong to module"
      });
    }

    // ✅ Insert / Update
    await db.query(`
      INSERT INTO role_permissions (role_id, module_id, action_id, is_allowed)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE is_allowed = ?
    `, [role_id, module_id, action_id, is_allowed, is_allowed]);

    res.json({ message: "Permission updated" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// export const getRolePermissionsById = async (req, res) => {
//   try {
//     const { role_id } = req.params;

//     const [rows] = await db.query(`
//       SELECT 
//         m.id AS module_id,
//         m.name AS module_name,
//         m.code AS module_code,
//         ma.id AS action_id,
//         ma.action_code,
//         IFNULL(rp.is_allowed, FALSE) AS is_allowed
//       FROM modules m
//       JOIN module_actions ma ON ma.module_id = m.id
//       LEFT JOIN role_permissions rp 
//         ON rp.module_id = m.id 
//         AND rp.action_id = ma.id 
//         AND rp.role_id = ?
//       ORDER BY m.id
//     `, [role_id]);

//     res.json(rows);

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };


export const getRolePermissionsById = async (req, res) => {
  try {
    const { role_id } = req.params;

    // ✅ 1. Validate role_id
    if (!role_id || isNaN(role_id)) {
      return res.status(400).json({
        message: "Invalid role_id"
      });
    }

    // ✅ 2. Check role exists
    const [[role]] = await db.query(
      `SELECT id, role_name FROM role_based WHERE id = ?`,
      [role_id]
    );

    if (!role) {
      return res.status(404).json({
        message: "Role not found"
      });
    }

    // ❌ OPTIONAL: Block ADMIN fetch (if needed)
    // if (role.role_name === "ADMIN") {
    //   return res.status(403).json({
    //     message: "Admin permissions cannot be viewed/modified"
    //   });
    // }

    // ✅ 3. Fetch permissions
    const [rows] = await db.query(`
      SELECT 
        m.id AS module_id,
        m.name AS module_name,
        m.code AS module_code,
        m.parent_id,

        ma.id AS action_id,
        ma.action_code,
        ma.action_name,

        IFNULL(rp.is_allowed, FALSE) AS is_allowed

      FROM modules m

      JOIN module_actions ma 
        ON ma.module_id = m.id

      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = ma.id 
        AND rp.role_id = ?

      ORDER BY m.parent_id, m.id, ma.id
    `, [role_id]);

    // ✅ 4. Optional: Structure into tree (better for frontend)
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

    res.json({
      role: {
        id: role.id,
        name: role.role_name
      },
      permissions: structured
    });

  } catch (error) {
    console.error("getRolePermissionsById error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};