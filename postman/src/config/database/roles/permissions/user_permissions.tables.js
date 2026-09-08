export const createUserPermissionsTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      module_id INT NOT NULL,
      action_id INT NOT NULL,
      is_allowed BOOLEAN,
      UNIQUE(user_id, module_id, action_id),
      FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (action_id) REFERENCES module_actions(id) ON DELETE CASCADE
    );
  `);
};
