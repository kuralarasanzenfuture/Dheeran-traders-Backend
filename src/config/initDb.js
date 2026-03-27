import db from "./db.js";
import { createCompanyBankDetailsTables } from "./database/billing/companyBankDetails.tables.js";
import { createCompanyDetailsTables } from "./database/billing/companydetails.tables.js";
import { createCustomerBillingTables } from "./database/billing/customerBilling.tables.js";
import { createCustomerTables } from "./database/billing/customers.tables.js";
import { createEmployeeTables } from "./database/billing/employee.tables.js";
import { createMasterTables } from "./database/billing/products/master.tables.js";
import { createRoleBasedTables } from "./database/roles/roleBased.tables.js";
import { createUserTables } from "./database/billing/user.tables.js";
import { createVendorTables } from "./database/billing/vendor.tables.js";
import { createVendorStocksTables } from "./database/billing/vendorStocks.tables.js";
import { createAgentAndStaffTables } from "./database/chit/agentAndStaff.tables.js";
import { createBatchTables } from "./database/chit/batches.tables.js";
import { createBatchPlanTables } from "./database/chit/batchPlans.tables.js";
import { createChitCustomerTable } from "./database/chit/customer.tables.js";
import { createCustomerSubcriptionTables } from "./database/chit/customerSubcription.tables.js";
import { createLocationTable } from "./database/chit/location.tables.js";
import { createPlanTables } from "./database/chit/plan.tables.js";
import { createPlanRulesTables } from "./database/chit/planRules.tables.js";

import { createLoginHistoryTables } from "./database/roles/login_history.tables.js";
import { createUserRolesTables } from "./database/users/user_roles.tables.js";
import { createEmployeeDetailsTables } from "./database/users/employees_details.tables.js";
import { createRefeshTokensTable } from "./database/roles/refresh_tokens.tables.js";

import { createCustomerInstallments } from "./database/chit/customerInstallments.js";
import { createCollectionPaymentTables } from "./database/chit/collectionPayment.tables.js";
import { createAdminTriggers } from "./triggers/admin.trigger.js";
import { createPermissionsTable } from "./database/roles/permissions/permissions.tables.js";

export const initDatabase = async () => {
  try {
    // 1️⃣ Create Database
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);

    // 2️⃣ Use Database
    await db.query(`USE \`${process.env.DB_NAME}\``);

    await createRoleBasedTables(db);

    await createUserRolesTables(db);

    await createPermissionsTable(db);

    // 🔥 MUST be after tables
    await createAdminTriggers(db);

    await createLoginHistoryTables(db);

    await createRefeshTokensTable(db);

    await createEmployeeDetailsTables(db);

    // 3️⃣ USERS TABLE
    await createUserTables(db);

    // 4️⃣ MASTER TABLE like BRANDS, CATEGORIES, QUANTITY and PRODUCT
    await createMasterTables(db);

    await createVendorTables(db);

    await createCustomerTables(db);

    await createEmployeeTables(db);

    await createCompanyBankDetailsTables(db);

    await createVendorStocksTables(db);

    await createCustomerBillingTables(db);

    await createCompanyDetailsTables(db);

    // chit tables

    await createPlanTables(db);

    // await createPlanRulesTables(db);

    await createBatchTables(db);

    await createBatchPlanTables(db);
    
    await createChitCustomerTable(db);

    await createAgentAndStaffTables(db);

    await createCustomerSubcriptionTables(db);

    await createCustomerInstallments(db);

    await createCollectionPaymentTables(db);

    await createLocationTable(db);

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
