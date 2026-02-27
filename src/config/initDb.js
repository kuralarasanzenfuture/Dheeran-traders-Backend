
import { createCompanyBankDetailsTables } from "./database/billing/companyBankDetails.tables.js";
import { createCompanyDetailsTables } from "./database/billing/companydetails.tables.js";
import { createCustomerBillingTables } from "./database/billing/customerBilling.tables.js";
import { createCustomerTables } from "./database/billing/customers.tables.js";
import { createEmployeeTables } from "./database/billing/employee.tables.js";
import { createMasterTables } from "./database/billing/master.tables.js";
import { createProductTables } from "./database/billing/product.tables.js";
import { createUserTables } from "./database/billing/user.tables.js";
import { createVendorTables } from "./database/billing/vendor.tables.js";
import { createVendorStocksTables } from "./database/billing/vendorStocks.tables.js";
import { createBatchTables } from "./database/chit/batches.tables.js";
import { createPlanTables } from "./database/chit/plan.tables.js";
import db from "./db.js";

export const initDatabase = async () => {
  try {
    // 1️⃣ Create Database
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);

    // 2️⃣ Use Database
    await db.query(`USE \`${process.env.DB_NAME}\``);

    // 3️⃣ USERS TABLE
    await createUserTables(db);

    await createMasterTables(db);

    // 4️⃣ PRODUCTS TABLE
    await createProductTables(db);

    await createVendorTables(db);

    await createCustomerTables(db);

    await createEmployeeTables(db);

    await createCompanyBankDetailsTables(db);

    await createVendorStocksTables(db);

    await createCustomerBillingTables(db);

    await createCompanyDetailsTables(db);

    // chit tables

    await createPlanTables(db);

    await createBatchTables(db);
    

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
