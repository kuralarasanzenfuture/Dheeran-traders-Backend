import bcrypt from "bcryptjs";

export const createUserTables = async (db) => {
  const hash = await bcrypt.hash("admin", 10);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP NULL
    )
  `);

  await db.query(`
    INSERT INTO users (username, email, password, role)
    SELECT 'admin', 'admin@gmail.com', ?, 'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE email = 'admin@gmail.com'
    )
  `, [hash]);
};


