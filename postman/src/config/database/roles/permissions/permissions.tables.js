import { createModuleActionsTable } from "./module_actions.tables.js";
import { createModulesTable } from "./modules.tables.js";
import { createRolePermissionsTable } from "./role_permissions.tables.js";
import { createUserPermissionsTable } from "./user_permissions.tables.js";

export const createPermissionsTable = async (db) => {
  // ✅ 1. Create modules table
  await createModulesTable(db);

  // ✅ 2. Create module_actions
  await createModuleActionsTable(db);

  // ✅ 3. Create role_permissions
  await createRolePermissionsTable(db);

  // ✅ 4. Create user_permissions
  await createUserPermissionsTable(db);

};[]