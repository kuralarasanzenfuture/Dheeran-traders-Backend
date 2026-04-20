// export const seedModules = async (db) => {
//   const modules = [
//     { name: "Dashboard", code: "DASHBOARD" },
//     { name: "Customers", code: "CUSTOMERS" },
//     { name: "Products", code: "PRODUCTS" },
//     { name: "Billing", code: "BILLING" },
//     { name: "Employees", code: "EMPLOYEES" },
//     { name: "Reports", code: "REPORTS" },
//     { name: "Chit", code: "CHIT" }
//   ];

//   for (const module of modules) {
//     await db.query(
//       `INSERT IGNORE INTO modules (name, code) VALUES (?, ?)`,
//       [module.name, module.code]
//     );
//   }
// };

// export const seedChitModules = async (db) => {
//   const chitModules = [
//     { name: "Chit Dashboard", code: "CHIT_DASHBOARD" },
//     { name: "Chit Plans", code: "CHIT_PLANS" },
//     { name: "Chit Customers", code: "CHIT_CUSTOMERS" },
//     { name: "Chit Batches", code: "CHIT_BATCHES" },
//     { name: "Agent / Staff", code: "CHIT_AGENT_STAFF" },
//     { name: "Collections", code: "CHIT_COLLECTIONS" }
//   ];

//   for (const module of chitModules) {
//     await db.query(
//       `INSERT IGNORE INTO modules (name, code) VALUES (?, ?)`,
//       [module.name, module.code]
//     );
//   }
// };

// Billing Menu
// Billing (Parent)
// Dashboard
// Employees
// Products
// Accounts
// Customers
// Vendors
// Report
// Chit Menu
// Chitfund (Parent)
// Dashboard
// Chit Plans
// Chit Customers
// Chit Batches
// Agent / Staff
// Collections


export const seedModules = async (db) => {
  // 🔴 1. Insert Parent Modules
  await db.query(`
    INSERT IGNORE INTO modules (name, code, parent_id) VALUES
    ('Billing', 'BILLING', NULL),
    ('Chitfund', 'CHIT', NULL)
  `);

  // 🔴 2. Get Parent IDs
  const [parents] = await db.query(`
    SELECT id, code FROM modules 
    WHERE code IN ('BILLING', 'CHIT')
  `);

  const parentMap = {};
  parents.forEach(p => {
    parentMap[p.code] = p.id;
  });

  // 🔴 3. Insert Billing Child Modules
  const billingModules = [
    { name: "Dashboard", code: "BILLING_DASHBOARD" },
    { name: "Employees", code: "BILLING_EMPLOYEES" },
    { name: "Products", code: "BILLING_PRODUCTS" },
    { name: "Accounts", code: "BILLING_ACCOUNTS" },
    { name: "Customers", code: "BILLING_CUSTOMERS" },
    { name: "Vendors", code: "BILLING_VENDORS" },
    { name: "Report", code: "BILLING_REPORT" }
  ];

  for (const m of billingModules) {
    await db.query(
      `INSERT IGNORE INTO modules (name, code, parent_id)
       VALUES (?, ?, ?)`,
      [m.name, m.code, parentMap["BILLING"]]
    );
  }

  // 🔴 4. Insert Chit Child Modules
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
      [m.name, m.code, parentMap["CHIT"]]
    );
  }
};