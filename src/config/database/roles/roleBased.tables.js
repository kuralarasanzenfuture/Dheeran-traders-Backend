
export const createRoleBasedTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS role_based (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_name VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
        `);

  await db.query(`
    INSERT INTO role_based (role_name)
    SELECT 'ADMIN'
    WHERE NOT EXISTS (
      SELECT 1 FROM role_based WHERE role_name = 'ADMIN'
    )
  `);




};

