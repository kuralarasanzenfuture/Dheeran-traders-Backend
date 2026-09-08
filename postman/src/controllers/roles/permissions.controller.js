// permissions.controller.js

/* =========================
   ASSIGN ROLE PERMISSIONS
========================= */
export const assignRolePermissions = async (req, res) => {
  const connection = await req.db.getConnection();

  try {
    await connection.beginTransaction();

    const { role_id, permissions } = req.body;

    if (!role_id || !permissions?.length) {
      throw new Error("Invalid payload");
    }

    for (const perm of permissions) {
      const { module_code, actions } = perm;

      const [[module]] = await connection.query(
        `SELECT id FROM modules WHERE code=?`,
        [module_code]
      );

      if (!module) continue;

      const [actionRows] = await connection.query(
        `SELECT id, action_code FROM module_actions WHERE module_id=?`,
        [module.id]
      );

      for (const action of actionRows) {
        const allowed = actions[action.action_code] ?? false;

        await connection.query(
          `INSERT INTO role_permissions 
           (role_id, module_id, action_id, is_allowed)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`,
          [role_id, module.id, action.id, allowed]
        );
      }
    }

    await connection.commit();

    res.json({ success: true, message: "Role permissions updated" });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

/* =========================
   ASSIGN USER PERMISSIONS
========================= */
export const assignUserPermissions = async (req, res) => {
  const connection = await req.db.getConnection();

  try {
    await connection.beginTransaction();

    const { user_id, permissions } = req.body;

    if (!user_id || !permissions?.length) {
      throw new Error("Invalid payload");
    }

    for (const perm of permissions) {
      const { module_code, actions } = perm;

      const [[module]] = await connection.query(
        `SELECT id FROM modules WHERE code=?`,
        [module_code]
      );

      if (!module) continue;

      const [actionRows] = await connection.query(
        `SELECT id, action_code FROM module_actions WHERE module_id=?`,
        [module.id]
      );

      for (const action of actionRows) {
        const allowed = actions[action.action_code];

        await connection.query(
          `INSERT INTO user_permissions 
           (user_id, module_id, action_id, is_allowed)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`,
          [user_id, module.id, action.id, allowed ?? null]
        );
      }
    }

    await connection.commit();

    res.json({ success: true, message: "User permissions updated" });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

/* =========================
   GET ROLE PERMISSIONS (UI)
========================= */
export const getRolePermissions = async (req, res) => {
  try {
    const { role_id } = req.params;

    const [rows] = await req.db.query(`
      SELECT 
        m.code AS module_code,
        a.action_code,
        rp.is_allowed
      FROM modules m
      JOIN module_actions a ON a.module_id = m.id
      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = a.id 
        AND rp.role_id = ?
      ORDER BY m.id
    `, [role_id]);

    const result = {};

    for (const row of rows) {
      if (!result[row.module_code]) {
        result[row.module_code] = {};
      }

      result[row.module_code][row.action_code] = !!row.is_allowed;
    }

    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET USER PERMISSIONS (MERGED)
========================= */
export const getUserPermissions = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [[user]] = await req.db.query(
      `SELECT role_id FROM users_roles WHERE id=?`,
      [user_id]
    );

    if (!user) throw new Error("User not found");

    const [rows] = await req.db.query(`
      SELECT 
        m.code AS module_code,
        a.action_code,
        COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
      FROM modules m
      JOIN module_actions a ON a.module_id = m.id
      LEFT JOIN role_permissions rp 
        ON rp.module_id = m.id 
        AND rp.action_id = a.id 
        AND rp.role_id = ?
      LEFT JOIN user_permissions up
        ON up.module_id = m.id
        AND up.action_id = a.id
        AND up.user_id = ?
      ORDER BY m.id
    `, [user.role_id, user_id]);

    const result = {};

    for (const row of rows) {
      if (!result[row.module_code]) {
        result[row.module_code] = {};
      }

      result[row.module_code][row.action_code] = !!row.is_allowed;
    }

    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};