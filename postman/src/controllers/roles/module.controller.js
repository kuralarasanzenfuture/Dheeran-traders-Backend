import db from "../../config/db.js";
// utils: build tree
const buildTree = (modules, parentId = null) => {
  return modules
    .filter(m => m.parent_id === parentId)
    .map(m => ({
      id: m.id,
      name: m.name,
      code: m.code,
      parent_id: m.parent_id,
      children: buildTree(modules, m.id)
    }));
};


// GET FULL TREE (IMPORTANT)

export const getAllModulesTree = async (req, res) => {
  try {
    const [modules] = await db.query(`
      SELECT id, name, code, parent_id 
      FROM modules 
      WHERE is_active = TRUE
      ORDER BY id ASC
    `);

    const tree = buildTree(modules);

    console.table(tree);

    res.json({
      success: true,
      data: tree
    });

  } catch (err) {
    console.error("getAllModulesTree error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// GET FLAT LIST (ADMIN USE)

export const getAllModulesFlat = async (req, res) => {
  try {
    const [modules] = await db.query(`
      SELECT id, name, code, parent_id 
      FROM modules
      ORDER BY parent_id ASC, id ASC
    `);

    console.table(modules);

    res.json({
      success: true,
      count: modules.length,
      data: modules
    });

  } catch (err) {
    console.error("getAllModulesFlat error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// GET CHILD MODULES BY PARENT
export const getModulesByParent = async (req, res) => {
  try {
    const { parent_id } = req.params;

    const [modules] = await db.query(`
      SELECT id, name, code, parent_id
      FROM modules
      WHERE parent_id = ?
    `, [parent_id]);

    console.table(modules);

    res.json({
      success: true,
      data: modules
    });

  } catch (err) {
    console.error("getModulesByParent error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Get modules by USER (with permissions)
export const getUserModules = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const [modules] = await db.query(`
      SELECT DISTINCT m.id, m.name, m.code, m.parent_id
      FROM modules m

      -- action mapping
      JOIN module_actions ma 
        ON ma.module_id = m.id

      -- user override
      LEFT JOIN user_permissions up 
        ON up.module_id = m.id 
        AND up.action_id = ma.id 
        AND up.user_id = ?

      -- role permissions
      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = ma.id

      -- user role (IMPORTANT: adjust if your table differs)
      LEFT JOIN users_roles ur 
        ON ur.role_id = rp.role_id 
        AND ur.id = ?

      WHERE 
        ma.action_name = 'view'
        AND (
          up.is_allowed = TRUE
          OR (up.id IS NULL AND rp.is_allowed = TRUE)
        )

      ORDER BY m.id ASC
    `, [userId, userId]);

    const tree = buildTree(modules);

    return res.json({
      success: true,
      data: tree
    });

  } catch (err) {
    console.error("getUserModules error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// export const getUserModules = async (req, res) => {
//   try {
//     const userId = req.params.user_id;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized"
//       });
//     }

//     const [modules] = await db.query(`
//       SELECT DISTINCT m.id, m.name, m.code, m.parent_id
//       FROM modules m

//       -- action mapping
//       JOIN module_actions ma 
//         ON ma.module_id = m.id

//       -- user override
//       LEFT JOIN user_permissions up 
//         ON up.module_id = m.id 
//         AND up.action_id = ma.id 
//         AND up.user_id = ?

//       -- role permissions
//       LEFT JOIN role_permissions rp 
//         ON rp.module_id = m.id 
//         AND rp.action_id = ma.id

//       -- user role (IMPORTANT: adjust if your table differs)
//       LEFT JOIN users_roles ur 
//         ON ur.role_id = rp.role_id 
//         AND ur.id = ?

//       WHERE 
//         ma.action_name = 'view'
//         AND (
//           up.is_allowed = TRUE
//           OR (up.id IS NULL AND rp.is_allowed = TRUE)
//         )

//       ORDER BY m.id ASC
//     `, [userId, userId]);

//     const tree = buildTree(modules);

//     return res.json({
//       success: true,
//       data: tree
//     });

//   } catch (err) {
//     console.error("getUserModules error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };


