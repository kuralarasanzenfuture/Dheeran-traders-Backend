import db from "./db.js";

export const initDatabase = async () => {
  try {
    // 1️⃣ Create Database
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);

    // 2️⃣ Use Database
    await db.query(`USE \`${process.env.DB_NAME}\``);

    //adminLogin
    await db.query(`
      CREATE TABLE IF NOT EXISTS AdminLogin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','user') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      INSERT INTO AdminLogin (username, email, password, role)
      SELECT 'admin', 'admin@gmail.com',
             'admin',
             'admin'
      WHERE NOT EXISTS (
        SELECT 1 FROM AdminLogin WHERE email = 'admin@gmail.com'
      )
    `);

    // 3️⃣ USERS TABLE
    await db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
  )
`);

    await db.query(`
  INSERT INTO users (username, email, password, role)
  SELECT 'admin', 'admin@gmail.com',
         'admin',
         'admin'
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@gmail.com'
  )
`);

    // 7️⃣ BRANDS TABLE
    await db.query(`
  CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE

  ) ENGINE=InnoDB
`);

    // 8️⃣ CATEGORIES TABLE
    await db.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,

  CONSTRAINT fk_categories_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  UNIQUE KEY uq_brand_category (brand_id, name)
  ) ENGINE=InnoDB
`);

    // QUANTITY TABLE
    await db.query(`
  CREATE TABLE IF NOT EXISTS quantities (
    id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,

  CONSTRAINT fk_quantities_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_quantities_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  UNIQUE (brand_id, category_id, name)
  ) ENGINE=InnoDB
`);

    // 4️⃣ PRODUCTS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_code VARCHAR(20) UNIQUE,
        product_name VARCHAR(150) NOT NULL,
        brand VARCHAR(100),
        category VARCHAR(100),
        quantity VARCHAR(50),
        price DECIMAL(10,2),

        UNIQUE KEY uniq_product (product_name, brand, category, quantity)
      ) ENGINE=InnoDB
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),

  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,

  address TEXT,

  bank_name VARCHAR(150),
  bank_account_number VARCHAR(30),
  bank_ifsc_code VARCHAR(20),
  bank_branch_name VARCHAR(150),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,

  address TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS customersbill (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(150),

        product_id INT,
        product_name VARCHAR(150),
        product_brand VARCHAR(100),
        product_quantity INT,

        phone VARCHAR(20),
        email VARCHAR(150),
        address TEXT,

        payment_mode ENUM('cash','upi'),
        advance_pay DECIMAL(10,2),
        pending_pay DECIMAL(10,2),
        stock INT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS vendorsbill (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_name VARCHAR(150),

        brand_id INT,
        brand_name VARCHAR(150),
        brand_category VARCHAR(100),
        brand_quantity VARCHAR(50),

        phone VARCHAR(20),
        email VARCHAR(150),
        address TEXT,

        payment_mode ENUM('cash','upi'),
        advance_pay DECIMAL(10,2),
        pending_pay DECIMAL(10,2),
        stock INT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(20) UNIQUE,
        employee_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(20),
        date_of_birth DATE,
        gender ENUM('male','female'),
        address TEXT,
        aadhar_number VARCHAR(20),
        pan_number VARCHAR(20),
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(30),
        ifsc_code VARCHAR(20),
        emergency_contact_name VARCHAR(150),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relation VARCHAR(50),
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS company_bank_details (
  id INT AUTO_INCREMENT PRIMARY KEY,

  bank_name VARCHAR(150) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  branch VARCHAR(150) NOT NULL,

  qr_code_image VARCHAR(255) NOT NULL,

  status ENUM('active','inactive') DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
      `);

    //       await db.query(`
    //   CREATE TABLE IF NOT EXISTS vendor_stocks (
    //     id INT AUTO_INCREMENT PRIMARY KEY,

    //     vendor_name VARCHAR(150) NOT NULL,
    //     vendor_phone VARCHAR(20) NOT NULL,

    //     product_id varchar(50) NOT NULL,
    //     product_name VARCHAR(150) NOT NULL,
    //     product_brand VARCHAR(100) NOT NULL,
    //     product_category VARCHAR(100) NOT NULL,
    //     product_quantity VARCHAR(50) NOT NULL,

    //     total_stock INT NOT NULL,

    //     entry_date DATE DEFAULT (CURRENT_DATE),
    //     entry_time TIME DEFAULT (CURRENT_TIME),

    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //       ON UPDATE CURRENT_TIMESTAMP
    //   ) ENGINE=InnoDB;
    // `);

    await db.query(`
  CREATE TABLE IF NOT EXISTS vendor_stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,

    vendor_name VARCHAR(150) NOT NULL,
    vendor_phone VARCHAR(20) NOT NULL,

    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_brand VARCHAR(100) NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    product_quantity VARCHAR(50) NOT NULL,

    total_stock INT NOT NULL,

    entry_date DATE NOT NULL,
    entry_time TIME NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;
`);

    await db.query(`
  CREATE TABLE IF NOT EXISTS customerBilling(
  id INT AUTO_INCREMENT PRIMARY KEY,

  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,

  customer_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  gst_number VARCHAR(30),

  subtotal DECIMAL(10,2) NOT NULL,
  tax_gst_percent DECIMAL(5,2) NOT NULL,
  tax_gst_amount DECIMAL(10,2) NOT NULL,

  grand_total DECIMAL(10,2) NOT NULL,

  advance_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL,

  cash_amount DECIMAL(10,2) DEFAULT 0,
  upi_amount DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`);


await db.query(`
  CREATE TABLE IF NOT EXISTS customerBillingProducts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  billing_id INT NOT NULL,

  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  product_brand VARCHAR(100),
  product_category VARCHAR(100),

  quantity INT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
  `);

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
