export const seedAdminPermissions = async (db) => {
  await db.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id, is_allowed)
    SELECT r.id, m.id, a.id, TRUE
    FROM role_based r
    JOIN modules m
    JOIN module_actions a ON a.module_id = m.id
    WHERE r.role_name = 'ADMIN'
    ON DUPLICATE KEY UPDATE is_allowed = TRUE;
  `);
};



export const createRolePermissionsTable = async (db) => {
    await db.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NOT NULL,
      module_id INT NOT NULL,
      action_id INT NOT NULL,
      is_allowed BOOLEAN DEFAULT FALSE,
      UNIQUE(role_id, module_id, action_id),
      FOREIGN KEY (role_id) REFERENCES role_based(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (action_id) REFERENCES module_actions(id) ON DELETE CASCADE
    );
  `);

  await seedAdminPermissions(db);

};