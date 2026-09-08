export const seedModuleActions = async (db) => {
  const actions = [
    { code: "VIEW", name: "View" },
    { code: "CREATE", name: "Create" },
    { code: "EDIT", name: "Edit" },
    { code: "DELETE", name: "Delete" }
  ];

  const [modules] = await db.query(`SELECT id FROM modules`);

  for (const module of modules) {
    for (const action of actions) {
      await db.query(
        `INSERT IGNORE INTO module_actions (module_id, action_code, action_name)
         VALUES (?, ?, ?)`,
        [module.id, action.code, action.name]
      );
    }
  }
};