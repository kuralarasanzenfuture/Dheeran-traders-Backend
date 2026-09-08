// export const seedModules = async (db) => {

//   // ✅ Insert parents FIRST
//   await db.query(`
//     INSERT IGNORE INTO modules (name, code, parent_id) VALUES
//     ('Billing', 'BILLING', NULL),
//     ('Chitfund', 'CHIT', NULL)
//   `);

//   // ✅ Get parent IDs
//   const [rows] = await db.query(`
//     SELECT id, code FROM modules WHERE code IN ('BILLING', 'CHIT')
//   `);

//   const map = {};
//   rows.forEach(r => map[r.code] = r.id);

//   // ❌ If map empty → ERROR happens
//   if (!map["BILLING"] || !map["CHIT"]) {
//     throw new Error("Parent modules not found");
//   }

//   // ✅ Insert children AFTER
//   await db.query(`
//     INSERT IGNORE INTO modules (name, code, parent_id) VALUES
//     ('Dashboard', 'BILLING_DASHBOARD', ?),
//     ('Customers', 'BILLING_CUSTOMERS', ?),
//     ('Vendors', 'BILLING_VENDORS', ?),
//     ('Report', 'BILLING_REPORT', ?)
//   `, [map["BILLING"], map["BILLING"], map["BILLING"], map["BILLING"]]);

//   await db.query(`
//     INSERT IGNORE INTO modules (name, code, parent_id) VALUES
//     ('Dashboard', 'CHIT_DASHBOARD', ?),
//     ('Chit Plans', 'CHIT_PLANS', ?),
//     ('Chit Customers', 'CHIT_CUSTOMERS', ?)
//   `, [map["CHIT"], map["CHIT"], map["CHIT"]]);
// };



// export const createPermissionsTable = async (db) => {
//   await db.query(`
//         CREATE TABLE IF NOT EXISTS modules (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   name VARCHAR(100) NOT NULL,
//   code VARCHAR(100) UNIQUE NOT NULL,

//   description TEXT,
//   parent_id INT NULL,
//   is_active BOOLEAN DEFAULT TRUE,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
//         `);

//   //   await db.query(`
//   //                 INSERT IGNORE INTO modules (name, code) VALUES
//   //   ('Customer', 'CUSTOMER'),
//   //   ('Invoice', 'INVOICE'),
//   //   ('Payments', 'PAYMENT'),
//   //   ('Users', 'USER_MANAGEMENT');
//   //         `);

//   await db.query(`
//         CREATE TABLE IF NOT EXISTS module_actions (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   module_id INT NOT NULL,

//   action_code VARCHAR(50) NOT NULL,   -- VIEW, CREATE, EXPORT
//   action_name VARCHAR(100),
//   UNIQUE(module_id, action_code),

//   FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
// );
// `);

//   // INSERT INTO module_actions (module_id, action_code, action_name)
//   // SELECT id, 'VIEW', 'View' FROM modules;

//   // INSERT INTO module_actions (module_id, action_code, action_name)
//   // SELECT id, 'CREATE', 'Create' FROM modules;

//   // INSERT INTO module_actions (module_id, action_code, action_name)
//   // SELECT id, 'EDIT', 'Edit' FROM modules;

//   // INSERT INTO module_actions (module_id, action_code, action_name)
//   // SELECT id, 'DELETE', 'Delete' FROM modules;

//   await db.query(`
//         CREATE TABLE IF NOT EXISTS role_permissions (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   role_id INT NOT NULL,
//   module_id INT NOT NULL,
//   action_id INT NOT NULL,
//   is_allowed BOOLEAN DEFAULT FALSE,

//   UNIQUE(role_id, module_id, action_id),

//   FOREIGN KEY (role_id) REFERENCES role_based(id) ON DELETE CASCADE,
//   FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
//   FOREIGN KEY (action_id) REFERENCES module_actions(id) ON DELETE CASCADE
// );
//         `);

//   // GIVE ADMIN FULL ACCESS (CRITICAL)
//   //         INSERT INTO role_permissions (role_id, module_id, action_id, is_allowed)
//   // SELECT
//   //   r.id,
//   //   m.id,
//   //   a.id,
//   //   TRUE
//   // FROM role_based r
//   // JOIN modules m
//   // JOIN module_actions a ON a.module_id = m.id
//   // WHERE r.role_name = 'ADMIN'
//   // ON DUPLICATE KEY UPDATE is_allowed = TRUE;

//   // USER OVERRIDE (REAL WORLD NEED)

//   await db.query(`
//         CREATE TABLE IF NOT EXISTS user_permissions (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   module_id INT NOT NULL,
//   action_id INT NOT NULL,
//   is_allowed BOOLEAN,

//   UNIQUE(user_id, module_id, action_id),

//   FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE,
//   FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
//   FOREIGN KEY (action_id) REFERENCES module_actions(id) ON DELETE CASCADE
// );
//         `);

//   //   await db.query(`
//   //                 CREATE TABLE IF NOT EXISTS module_actions (
//   //                         id INT AUTO_INCREMENT PRIMARY KEY,
//   //                         module_name VARCHAR(100) NOT NULL,
//   //                         action_name VARCHAR(100) NOT NULL,

//   //                         UNIQUE KEY unique_module_action (module_id, action)
//   //                 )
//   //                 `);
// };

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

export const createPermissionsTable = async (db) => {

  // ✅ 1. Create modules table
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

  // ✅ 2. Create module_actions
  await db.query(`
    CREATE TABLE IF NOT EXISTS module_actions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      module_id INT NOT NULL,
      action_code VARCHAR(50) NOT NULL,
      action_name VARCHAR(100),
      UNIQUE(module_id, action_code),
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    );
  `);

  // ✅ 3. Create role_permissions
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

  // ✅ 4. Create user_permissions
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

  // ✅ 5. NOW seed modules (correct place)
  await seedModules(db);

//   // ✅ 6. THEN seed actions
//   await seedModuleActions(db);

//   // ✅ 7. THEN give admin permissions
//   await seedAdminPermissions(db);
};