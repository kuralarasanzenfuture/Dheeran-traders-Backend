export const createAdminTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS AdminLogin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','user') DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    INSERT INTO AdminLogin (username, email, password, role)
    SELECT 'admin', 'admin@gmail.com', 'admin', 'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM AdminLogin WHERE email = 'admin@gmail.com'
    )
  `);
};
