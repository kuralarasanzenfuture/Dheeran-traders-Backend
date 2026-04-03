import db from "../../config/db.js";


// 🔧 attach actions to modules
const attachActions = (modules, actions) => {
  const actionMap = {};

  actions.forEach(a => {
    if (!actionMap[a.module_id]) actionMap[a.module_id] = [];

    actionMap[a.module_id].push({
      id: a.id,
      code: a.action_code,
      name: a.action_name
    });
  });

  return modules.map(m => ({
    ...m,
    actions: actionMap[m.id] || []
  }));
};


// 🔧 build tree with actions
const buildTreeWithActions = (modules, parentId = null) => {
  return modules
    .filter(m => m.parent_id === parentId)
    .map(m => ({
      id: m.id,
      name: m.name,
      code: m.code,
      parent_id: m.parent_id,
      actions: m.actions || [],
      children: buildTreeWithActions(modules, m.id)
    }));
};

const flattenModules = (modules, level = 0, parent = null) => {
  let result = [];

  modules.forEach(m => {
    result.push({
      id: m.id,
      name: m.name,
      code: m.code,
      parent_id: m.parent_id,
      level,
      actions: m.actions.map(a => a.code).join(", ")
    });

    if (m.children?.length) {
      result = result.concat(flattenModules(m.children, level + 1, m.id));
    }
  });

  return result;
};



// ✅ GET FULL MODULE + ACTION TREE
export const getAllModuleActionsTree = async (req, res) => {
  try {

    const [modules] = await db.query(`
      SELECT id, name, code, parent_id 
      FROM modules 
      WHERE is_active = TRUE
      ORDER BY id ASC
    `);

    const [actions] = await db.query(`
      SELECT id, module_id, action_code, action_name
      FROM module_actions
    `);

    const modulesWithActions = attachActions(modules, actions);

    const tree = buildTreeWithActions(modulesWithActions);


    const flat = flattenModules(tree);

    console.table(flat);
    


    res.json({
      success: true,
      data: tree
    });

  } catch (err) {
    console.error("getAllModuleActionsTree error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



// ✅ GET FLAT (ADMIN USE)
export const getAllModuleActionsFlat = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT 
        m.id AS module_id,
        m.name AS module_name,
        m.code AS module_code,
        ma.id AS action_id,
        ma.action_code,
        ma.action_name
      FROM modules m
      LEFT JOIN module_actions ma 
        ON ma.module_id = m.id
      ORDER BY m.id ASC
    `);

    console.table(rows);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (err) {
    console.error("getAllModuleActionsFlat error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



// ✅ GET ACTIONS BY MODULE
export const getActionsByModule = async (req, res) => {
  try {
    const { module_id } = req.params;

    const [actions] = await db.query(`
      SELECT id, action_code, action_name
      FROM module_actions
      WHERE module_id = ?
    `, [module_id]);

    console.table(actions);

    res.json({
      success: true,
      data: actions
    });

  } catch (err) {
    console.error("getActionsByModule error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



// ✅ GET USER MODULES + ACTIONS (RBAC)
export const getUserModuleActions = async (req, res) => {
  try {

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // 🔹 get allowed module + actions
    const [rows] = await db.query(`
      SELECT DISTINCT 
        m.id,
        m.name,
        m.code,
        m.parent_id,
        ma.id AS action_id,
        ma.action_code,
        ma.action_name

      FROM modules m

      JOIN module_actions ma 
        ON ma.module_id = m.id

      LEFT JOIN user_permissions up 
        ON up.module_id = m.id 
        AND up.action_id = ma.id 
        AND up.user_id = ?

      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = ma.id

      LEFT JOIN users_roles ur 
        ON ur.role_id = rp.role_id 
        AND ur.user_id = ?

      WHERE 
        (
          up.is_allowed = TRUE
          OR (up.id IS NULL AND rp.is_allowed = TRUE)
        )

      ORDER BY m.id ASC
    `, [userId, userId]);


    // 🔧 group actions under modules
    const moduleMap = {};

    rows.forEach(r => {
      if (!moduleMap[r.id]) {
        moduleMap[r.id] = {
          id: r.id,
          name: r.name,
          code: r.code,
          parent_id: r.parent_id,
          actions: []
        };
      }

      moduleMap[r.id].actions.push({
        id: r.action_id,
        code: r.action_code,
        name: r.action_name
      });
    });

    const modules = Object.values(moduleMap);

    const tree = buildTreeWithActions(modules);

    return res.json({
      success: true,
      data: tree
    });

  } catch (err) {
    console.error("getUserModuleActions error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};