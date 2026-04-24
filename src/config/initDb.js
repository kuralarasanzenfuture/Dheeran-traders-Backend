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
import { createCustomerSubcriptionTables } from "./database/chit/customerSubscription.tables.js";
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
import { createUserAssignedCustomerTable } from "./database/chit/userAssignedCustomer.tables.js";
import { createAuditsTable } from "./database/audits/audits.tables.js";
import { createStockManageTables } from "./database/billing/stockManage.js";
import { createReturnBillingTables } from "./database/billing/returnBilling.tables.js";
import { createCompanyGstNumberTable } from "./database/billing/companygstNumber.tables.js";
import { seed } from "../seed/seedindex.js";
import { createOrderTables } from "./database/billing/order.tables.js";

export const initDatabase = async () => {
  try {
    // 1️⃣ Create Database
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);

    // 2️⃣ Use Database
    await db.query(`USE \`${process.env.DB_NAME}\``);

    //     SET GLOBAL time_zone = '+05:30';
    // SET time_zone = '+05:30';

    // ✅ Set session timezone (safe)
    await db.query(`SET time_zone = '+05:30'`);

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

    await createStockManageTables(db);

    await createVendorTables(db);

    await createCustomerTables(db);

    await createEmployeeTables(db);

    await createCompanyBankDetailsTables(db);

    await createVendorStocksTables(db);

    await createCustomerBillingTables(db);

    await createReturnBillingTables(db);

    await createCompanyDetailsTables(db);

    await createCompanyGstNumberTable(db);

    await createOrderTables(db);

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

    await createUserAssignedCustomerTable(db);

    await createAuditsTable(db);

    await seed(db);

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
