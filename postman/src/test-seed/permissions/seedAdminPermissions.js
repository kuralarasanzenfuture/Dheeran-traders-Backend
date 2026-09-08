export const seedAdminPermissions = async (db) => {
  await db.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id, is_allowed)
    SELECT
      r.id,
      m.id,
      a.id,
      TRUE
    FROM role_based r
    JOIN modules m
    JOIN module_actions a ON a.module_id = m.id
    WHERE r.role_name = 'ADMIN'
    ON DUPLICATE KEY UPDATE is_allowed = TRUE;
  `);
};