// const actions = [
//   { code: "VIEW", name: "View" },
//   { code: "CREATE", name: "Create" },
//   { code: "EDIT", name: "Edit" },
//   { code: "DELETE", name: "Delete" }
// ];

import { MODULE_CONFIG } from "./MODULE_CONFIG.js";

// export const seedModuleActions = async (db) => {

//   // ✅ Get all modules
//   const [modules] = await db.query(`
//     SELECT id, code FROM modules
//   `);

//   const defaultActions = [
//     { code: "VIEW", name: "View" },
//     { code: "CREATE", name: "Create" },
//     { code: "EDIT", name: "Edit" },
//     { code: "DELETE", name: "Delete" }
//   ];

//   for (const module of modules) {

//     for (const action of defaultActions) {
//       await db.query(
//         `INSERT IGNORE INTO module_actions (module_id, action_code, action_name)
//          VALUES (?, ?, ?)`,
//         [module.id, action.code, action.name]
//       );
//     }
//   }
// };

// const actionMap = {
//   BILLING_REPORT: ["VIEW", "EXPORT"],
//   BILLING_REPORT_DAILY: ["VIEW", "EXPORT"],
//   BILLING_REPORT_PRODUCT: ["VIEW", "EXPORT"],
//   BILLING_REPORT_CUSTOMER: ["VIEW", "EXPORT"],

//   BILLING_ADD_PRODUCT: ["VIEW", "CREATE", "EDIT", "DELETE"],
//   BILLING_BRAND: ["VIEW", "CREATE", "EDIT", "DELETE"],
//   BILLING_CATEGORIES: ["VIEW", "CREATE", "EDIT", "DELETE"],

//   BILLING_QUANTITY: ["VIEW", "EDIT"],

//   BILLING_STOCK: ["VIEW", "EDIT"],
//   BILLING_CURRENT_STOCK: ["VIEW"],

//   CHIT_COLLECTIONS: ["VIEW", "CREATE"],
//   CHIT_PLANS: ["VIEW", "CREATE", "EDIT"]
// };

// export const seedModuleActions = async (db) => {

//   const [modules] = await db.query(`SELECT id, code FROM modules`);

//   const defaultActions = ["VIEW", "CREATE", "EDIT", "DELETE"];

//   const actionMap = {
//     BILLING: ["VIEW", "CREATE"],
//     BILLING_DASHBOARD: ["VIEW"],
//     BILLING_PRODUCTS: ["VIEW"],
//     BILLING_BRAND: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_CATEGORIES: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_QUANTITY: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_ACCOUNTS: ["VIEW"],
//     BILLING_PENDING: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_STOCK: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_CURRENT_STOCK: ["VIEW", "EDIT", "DELETE"],
//     BILLING_CUSTOMERS: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_VENDORS: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     BILLING_REPORT: ["VIEW"],
//     BILLING_REPORT_CUSTOMER: ["VIEW","CREATE","EDIT","DELETE", "EXPORT"],
//     BILLING_REPORT_PRODUCT: ["VIEW", "EXPORT"],
//     BILLING_REPORT_DAILY: ["VIEW", "EXPORT"],

//     CHIT_DASHBOARD: ["VIEW"],
//     CHIT_PLANS: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     CHIT_CUSTOMERS: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     CHIT_BATCHES: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     CHIT_AGENT: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     CHIT_ASSIGN_USER: ["VIEW", "CREATE", "EDIT", "DELETE"],
//     CHIT_COLLECTIONS: ["VIEW", "CREATE"],
//     CHIT_REPORT: ["VIEW"],
//     CHIT_REPORT_CUSTOMER: ["VIEW","CREATE","EDIT","DELETE", "EXPORT"],
//     CHIT_REPORT_DAILY: ["VIEW", "EXPORT"],

    
//   };

//   for (const module of modules) {

//     const actions = actionMap[module.code] || defaultActions;

//     for (const action of actions) {
//       await db.query(
//         `INSERT IGNORE INTO module_actions (module_id, action_code, action_name)
//          VALUES (?, ?, ?)`,
//         [module.id, action, action]
//       );
//     }
//   }
// };


export const seedModuleActions = async (db) => {

  const insertActions = async (module, moduleIdMap) => {
    const moduleId = moduleIdMap[module.code];

    for (const action of module.actions) {
      await db.query(
        `INSERT IGNORE INTO module_actions 
         (module_id, action_code, action_name)
         VALUES (?, ?, ?)`,
        [moduleId, action, action]
      );
    }

    if (module.children) {
      for (const child of module.children) {
        await insertActions(child, moduleIdMap);
      }
    }
  };

  // Get all module IDs
  const [rows] = await db.query(`SELECT id, code FROM modules`);
  const moduleIdMap = {};
  rows.forEach(r => moduleIdMap[r.code] = r.id);

  for (const mod of MODULE_CONFIG) {
    await insertActions(mod, moduleIdMap);
  }
};


export const createModuleActionsTable = async (db) => {
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

  await seedModuleActions(db);

};

