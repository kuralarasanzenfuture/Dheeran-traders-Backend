
export const createRoleBasedTables = async (db) => {
  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS role_based (
  //           id INT AUTO_INCREMENT PRIMARY KEY,
  //           role_name VARCHAR(100) UNIQUE NOT NULL,
  //           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //   )
  //       `);

  // await db.query(`
  //   INSERT INTO role_based (role_name)
  //   SELECT 'ADMIN'
  //   WHERE NOT EXISTS (
  //     SELECT 1 FROM role_based WHERE role_name = 'ADMIN'
  //   )
  // `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS role_based (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_name VARCHAR(100) UNIQUE NOT NULL,
            role_description TEXT,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
        `);

        await seedRoles(db);

await db.query(`
    INSERT IGNORE INTO role_based (role_name, role_description)
    SELECT 'ADMIN', 'Allows full access to the system'
    WHERE NOT EXISTS (
      SELECT 1 FROM role_based WHERE role_name = 'ADMIN'
    )
  `);

  // await db.query(`
  //   INSERT IGNORE INTO role_based (role_name, role_description)
  //   SELECT 'USER', 'Allows limited access to the system'
  //   WHERE NOT EXISTS (
  //     SELECT 1 FROM role_based WHERE role_name = 'USER'
  //   )
  //   `)

  //   await db.query(`
  //   INSERT IGNORE INTO role_based (role_name, role_description)
  //   SELECT 'STAFF', 'Allows limited access to the system'
  //   WHERE NOT EXISTS (
  //     SELECT 1 FROM role_based WHERE role_name = 'STAFF'
  //   )
  //   `)

  //   await db.query(`
  //   INSERT IGNORE INTO role_based (role_name, role_description)
  //   SELECT 'COLLECTION', 'Allows limited access to the system'
  //   WHERE NOT EXISTS (
  //     SELECT 1 FROM role_based WHERE role_name = 'COLLECTION'
  //   )
  //   `)

};

const seedRoles = async (db) => {
  const roles = [
    ['ADMIN', 'Allows full access to the system'],
    ['MANAGER', 'Manages operations, reports, and staff'],
    ['ACCOUNTANT', 'Handles billing, GST, and financial reports'],
    ['SALES', 'Handles sales and customer transactions'],
    ['PURCHASE', 'Manages vendor purchases and stock entry'],
    ['INVENTORY', 'Manages stock, products, and warehouse'],
    ['CASHIER', 'Handles billing and payment collection'],
    ['HR', 'Manages employees, payroll, and attendance'],
    ['SUPERVISOR', 'Monitors daily operations and staff'],
    ['VIEWER', 'Read-only access to system data'],
  ];

  for (const role of roles) {
    await db.query(
      `INSERT IGNORE INTO role_based (role_name, role_description)
       VALUES (?, ?)`,
      role
    );
  }
};


// INSERT INTO role_based (role_name, role_description)
// VALUES
// ('ADMIN', 'Allows full access to the system'),
// ('MANAGER', 'Manages operations, reports, and staff'),
// ('ACCOUNTANT', 'Handles billing, GST, and financial reports'),
// ('SALES', 'Handles sales and customer transactions'),
// ('PURCHASE', 'Manages vendor purchases and stock entry'),
// ('INVENTORY', 'Manages stock, products, and warehouse'),
// ('CASHIER', 'Handles billing and payment collection'),
// ('HR', 'Manages employees, payroll, and attendance'),
// ('SUPERVISOR', 'Monitors daily operations and staff'),
// ('VIEWER', 'Read-only access to system data')
// ON DUPLICATE KEY UPDATE role_name = role_name;

// ✅ Alternative (Safer with IGNORE)

// INSERT IGNORE INTO role_based (role_name, role_description)
// VALUES
// ('ADMIN', 'Allows full access to the system'),
// ('MANAGER', 'Manages operations, reports, and staff'),
// ('ACCOUNTANT', 'Handles billing, GST, and financial reports'),
// ('SALES', 'Handles sales and customer transactions'),
// ('PURCHASE', 'Manages vendor purchases and stock entry'),
// ('INVENTORY', 'Manages stock, products, and warehouse'),
// ('CASHIER', 'Handles billing and payment collection'),
// ('HR', 'Manages employees, payroll, and attendance'),
// ('SUPERVISOR', 'Monitors daily operations and staff'),
// ('VIEWER', 'Read-only access to system data');
