// const actions = [
//   { code: "VIEW", name: "View" },
//   { code: "CREATE", name: "Create" },
//   { code: "EDIT", name: "Edit" },
//   { code: "DELETE", name: "Delete" }
// ];

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

export const seedModuleActions = async (db) => {

  const [modules] = await db.query(`SELECT id, code FROM modules`);

  const defaultActions = ["VIEW", "CREATE", "EDIT", "DELETE"];

  const actionMap = {
    BILLING_REPORT: ["VIEW", "EXPORT"],
    BILLING_REPORT_DAILY: ["VIEW", "EXPORT"],
    BILLING_REPORT_PRODUCT: ["VIEW", "EXPORT"],
    BILLING_REPORT_CUSTOMER: ["VIEW", "EXPORT"],
    BILLING_QUANTITY: ["VIEW", "EDIT"],
    BILLING_CURRENT_STOCK: ["VIEW"],
    CHIT_COLLECTIONS: ["VIEW", "CREATE"],
    CHIT_ASSIGN_USER: ["VIEW", "CREATE"],
  };

  for (const module of modules) {

    const actions = actionMap[module.code] || defaultActions;

    for (const action of actions) {
      await db.query(
        `INSERT IGNORE INTO module_actions (module_id, action_code, action_name)
         VALUES (?, ?, ?)`,
        [module.id, action, action]
      );
    }
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

