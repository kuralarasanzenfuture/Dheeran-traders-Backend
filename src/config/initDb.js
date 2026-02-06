
import { createCompanyBankDetailsTables } from "./database/companyBankDetails.tables.js";
import { createCompanyDetailsTables } from "./database/companydetails.tables.js";
import { createCustomerBillingTables } from "./database/customerBilling.tables.js";
import { createCustomerTables } from "./database/customers.tables.js";
import { createEmployeeTables } from "./database/employee.tables.js";
import { createMasterTables } from "./database/master.tables.js";
import { createProductTables } from "./database/product.tables.js";
import { createUserTables } from "./database/user.tables.js";
import { createVendorTables } from "./database/vendor.tables.js";
import { createVendorStocksTables } from "./database/vendorStocks.tables.js";
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
    

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
