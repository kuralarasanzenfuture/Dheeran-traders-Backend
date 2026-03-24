import db from "../config/db.js";

export const canAccess = async (user_id, module_code, action_code) => {
  try {
    // ✅ 1. Validate inputs
    if (!user_id || !module_code || !action_code) {
      return false;
    }

    // ✅ 2. Get user + role
    const [[user]] = await db.query(
      `SELECT id, role_id FROM users_roles WHERE id = ?`,
      [user_id]
    );

    if (!user) return false;

    // ✅ 3. Get permission (single optimized query)
    const [[result]] = await db.query(`
      SELECT 
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
      WHERE m.code = ? 
        AND ma.action_code = ?
      LIMIT 1
    `, [user.role_id, user_id, module_code, action_code]);

    return result?.is_allowed === 1;

  } catch (error) {
    console.error("canAccess error:", error);
    return false;
  }
};