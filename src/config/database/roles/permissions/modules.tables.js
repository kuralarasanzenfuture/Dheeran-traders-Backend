// Billing (Parent)
//  ├── Dashboard
//  ├── Employees
//  ├── Products
//  │     ├── Add Product
//  │     ├── Brand
//  │     ├── Categories
//  │     ├── Quantity
//  ├── Accounts
//  │     ├── Pending List
//  │     ├── Stock Maintenance
//  │     ├── Current Stock
//  ├── Customers
//  ├── Vendors
//  ├── Report
//        ├── Customer Billing Report
//        ├── Product Wise Report
//        ├── Daily Sales Report

// Chitfund (Parent)
//  ├── Dashboard
//  ├── Chit Plans
//  ├── Chit Customers
//  ├── Chit Batches
//  ├── Agent / Staff
//  ├── Collections


// export const seedModules = async (db) => {
//   // 🔴 1. Insert Parent Modules
//   await db.query(`
//     INSERT IGNORE INTO modules (name, code, parent_id) VALUES
//     ('Billing', 'BILLING', NULL),
//     ('Chitfund', 'CHIT', NULL)
//   `);

//   // 🔴 2. Get Parent IDs
//   const [parents] = await db.query(`
//     SELECT id, code FROM modules 
//     WHERE code IN ('BILLING', 'CHIT')
//   `);

//   const parentMap = {};
//   parents.forEach(p => {
//     parentMap[p.code] = p.id;
//   });

//   // 🔴 3. Insert Billing Child Modules
//   const billingModules = [
//     { name: "Dashboard", code: "BILLING_DASHBOARD" },
//     { name: "Employees", code: "BILLING_EMPLOYEES" },
//     { name: "Products", code: "BILLING_PRODUCTS" },
//     { name: "Accounts", code: "BILLING_ACCOUNTS" },
//     { name: "Customers", code: "BILLING_CUSTOMERS" },
//     { name: "Vendors", code: "BILLING_VENDORS" },
//     { name: "Report", code: "BILLING_REPORT" }
//   ];

//   for (const m of billingModules) {
//     await db.query(
//       `INSERT IGNORE INTO modules (name, code, parent_id)
//        VALUES (?, ?, ?)`,
//       [m.name, m.code, parentMap["BILLING"]]
//     );
//   }

//   // 🔴 4. Insert Chit Child Modules
//   const chitModules = [
//     { name: "Dashboard", code: "CHIT_DASHBOARD" },
//     { name: "Chit Plans", code: "CHIT_PLANS" },
//     { name: "Chit Customers", code: "CHIT_CUSTOMERS" },
//     { name: "Chit Batches", code: "CHIT_BATCHES" },
//     { name: "Agent / Staff", code: "CHIT_AGENT" },
//     { name: "Collections", code: "CHIT_COLLECTIONS" }
//   ];

//   for (const m of chitModules) {
//     await db.query(
//       `INSERT IGNORE INTO modules (name, code, parent_id)
//        VALUES (?, ?, ?)`,
//       [m.name, m.code, parentMap["CHIT"]]
//     );
//   }
// };

export const seedModules = async (db) => {

  // ✅ 1. Insert Parents
  await db.query(`
    INSERT IGNORE INTO modules (name, code, parent_id) VALUES
    ('Billing', 'BILLING', NULL),
    ('Chitfund', 'CHIT', NULL)
  `);

  // ✅ 2. Get Parent IDs
  const [parents] = await db.query(`
    SELECT id, code FROM modules WHERE code IN ('BILLING', 'CHIT')
  `);

  const map = {};
  parents.forEach(p => map[p.code] = p.id);

  // =========================
  // 🔵 BILLING LEVEL 1
  // =========================
  const billingMain = [
    { name: "Dashboard", code: "BILLING_DASHBOARD" },
    { name: "Employees", code: "BILLING_EMPLOYEES" },
    { name: "Products", code: "BILLING_PRODUCTS" },
    { name: "Accounts", code: "BILLING_ACCOUNTS" },
    { name: "Customers", code: "BILLING_CUSTOMERS" },
    { name: "Vendors", code: "BILLING_VENDORS" },
    { name: "Report", code: "BILLING_REPORT" }
  ];

  for (const m of billingMain) {
    await db.query(
      `INSERT IGNORE INTO modules (name, code, parent_id)
       VALUES (?, ?, ?)`,
      [m.name, m.code, map["BILLING"]]
    );
  }

  // ✅ Get Billing Child IDs
  const [billingChildren] = await db.query(`
    SELECT id, code FROM modules 
    WHERE parent_id = ?
  `, [map["BILLING"]]);

  const bMap = {};
  billingChildren.forEach(m => bMap[m.code] = m.id);

  // =========================
  // 🔵 BILLING → PRODUCTS
  // =========================
  await db.query(`
    INSERT IGNORE INTO modules (name, code, parent_id) VALUES
    ('Add Product', 'BILLING_ADD_PRODUCT', ?),
    ('Brand', 'BILLING_BRAND', ?),
    ('Categories', 'BILLING_CATEGORIES', ?),
    ('Quantity', 'BILLING_QUANTITY', ?)
  `, [
    bMap["BILLING_PRODUCTS"],
    bMap["BILLING_PRODUCTS"],
    bMap["BILLING_PRODUCTS"],
    bMap["BILLING_PRODUCTS"]
  ]);

  // =========================
  // 🔵 BILLING → ACCOUNTS
  // =========================
  await db.query(`
    INSERT IGNORE INTO modules (name, code, parent_id) VALUES
    ('Pending List', 'BILLING_PENDING', ?),
    ('Stock Maintenance', 'BILLING_STOCK', ?),
    ('Current Stock', 'BILLING_CURRENT_STOCK', ?)
  `, [
    bMap["BILLING_ACCOUNTS"],
    bMap["BILLING_ACCOUNTS"],
    bMap["BILLING_ACCOUNTS"]
  ]);

  // =========================
  // 🔵 BILLING → REPORT
  // =========================
  await db.query(`
    INSERT IGNORE INTO modules (name, code, parent_id) VALUES
    ('Customer Billing Report', 'BILLING_REPORT_CUSTOMER', ?),
    ('Product Wise Report', 'BILLING_REPORT_PRODUCT', ?),
    ('Daily Sales Report', 'BILLING_REPORT_DAILY', ?)
  `, [
    bMap["BILLING_REPORT"],
    bMap["BILLING_REPORT"],
    bMap["BILLING_REPORT"]
  ]);

  // =========================
  // 🔵 CHIT LEVEL 1
  // =========================
  const chitModules = [
    { name: "Dashboard", code: "CHIT_DASHBOARD" },
    { name: "Chit Plans", code: "CHIT_PLANS" },
    { name: "Chit Customers", code: "CHIT_CUSTOMERS" },
    { name: "Chit Batches", code: "CHIT_BATCHES" },
    { name: "Agent / Staff", code: "CHIT_AGENT" },
    { name: "Collections", code: "CHIT_COLLECTIONS" }
  ];

  for (const m of chitModules) {
    await db.query(
      `INSERT IGNORE INTO modules (name, code, parent_id)
       VALUES (?, ?, ?)`,
      [m.name, m.code, map["CHIT"]]
    );
  }
};

export const createModulesTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS modules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      parent_id INT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES modules(id) ON DELETE CASCADE
    );
  `);

  await seedModules(db);
};