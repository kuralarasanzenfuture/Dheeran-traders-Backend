import { createAdminTables } from "./database/admin.tables.js";
import { createCompanyBankDetailsTables } from "./database/companyBankDetails.tables.js";
import { createCompanyDetailsTables } from "./database/companydetails.tables.js";
import { createCustomerBillingTables } from "./database/customerBilling.tables.js";
import { createCustomerTables } from "./database/customers.tables.js";
import { createEmployeeTables } from "./database/employee.tables.js";
import { createMasterTables } from "./database/master.tables.js";
import { createProductTables } from "./database/product.tables.js";
import { createUserTables } from "./database/user.tables.js";
import { createVendorTables } from "./database/vendor.tables.js";
import { createVendorStocksTables } from "./database/vendorStocks,tables.js";
import db from "./db.js";

export const initDatabase = async () => {
  try {
    // 1️⃣ Create Database
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);

    // 2️⃣ Use Database
    await db.query(`USE \`${process.env.DB_NAME}\``);

    //adminLogin
    // await createAdminTables(db); 

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

    // await db.query(`
    //   CREATE TABLE IF NOT EXISTS customersbill (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     customer_name VARCHAR(150),

    //     product_id INT,
    //     product_name VARCHAR(150),
    //     product_brand VARCHAR(100),
    //     product_quantity INT,

    //     phone VARCHAR(20),
    //     email VARCHAR(150),
    //     address TEXT,

    //     payment_mode ENUM('cash','upi'),
    //     advance_pay DECIMAL(10,2),
    //     pending_pay DECIMAL(10,2),
    //     stock INT,

    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    //   )
    // `);

    // await db.query(`
    //   CREATE TABLE IF NOT EXISTS vendorsbill (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     vendor_name VARCHAR(150),

    //     brand_id INT,
    //     brand_name VARCHAR(150),
    //     brand_category VARCHAR(100),
    //     brand_quantity VARCHAR(50),

    //     phone VARCHAR(20),
    //     email VARCHAR(150),
    //     address TEXT,

    //     payment_mode ENUM('cash','upi'),
    //     advance_pay DECIMAL(10,2),
    //     pending_pay DECIMAL(10,2),
    //     stock INT,

    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    //   )
    // `);


    

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
