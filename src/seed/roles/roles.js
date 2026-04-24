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

export const seedRoles = async (db) => {
  const roles = [
    ["ADMIN", "Allows full access to the system"],
    // ['MANAGER', 'Manages operations, reports, and staff'],
    // ['ACCOUNTANT', 'Handles billing, GST, and financial reports'],
    // ['SALES', 'Handles sales and customer transactions'],
    // ['PURCHASE', 'Manages vendor purchases and stock entry'],
    // ['INVENTORY', 'Manages stock, products, and warehouse'],
    // ['CASHIER', 'Handles billing and payment collection'],
    // ['HR', 'Manages employees, payroll, and attendance'],
    // ['SUPERVISOR', 'Monitors daily operations and staff'],
    // ['VIEWER', 'Read-only access to system data'],
  ];

  for (const role of roles) {
    await db.query(
      `INSERT IGNORE INTO role_based (role_name, role_description)
       VALUES (?, ?)`,
      role,
    );
  }
};
