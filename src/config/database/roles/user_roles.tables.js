import bcrypt from "bcryptjs";

export const createUserRolesTables = async (db) => {
    
    const hash = await bcrypt.hash("admin", 10);

await db.query(`
    CREATE TABLE IF NOT EXISTS users_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,

      username VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE,
      phone VARCHAR(20) UNIQUE,
      password VARCHAR(255) NOT NULL,

      role_id INT NOT NULL,

      status ENUM('active', 'inactive') DEFAULT 'active',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP NULL,

      CONSTRAINT fk_users_role
      FOREIGN KEY (role_id)
      REFERENCES role_based(id)
      ON DELETE RESTRICT,

      UNIQUE KEY uq_username (username),
      UNIQUE KEY uq_email (email),
      UNIQUE KEY uq_phone (phone)
    )
  `);

  await db.query(`
  INSERT IGNORE INTO users_roles (username,email,password,role_id)
  SELECT 'admin','admin@gmail.com',?,1
  WHERE NOT EXISTS (
    SELECT 1 FROM users_roles WHERE email='admin@gmail.com'
  )
`,[hash]);
};