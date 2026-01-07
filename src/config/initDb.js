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

    // 4️⃣ PRODUCTS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_code VARCHAR(20) UNIQUE,
        product_name VARCHAR(150),
        quantity VARCHAR(50),
        price DECIMAL(10,2),
        stock INT,
        category VARCHAR(100),
        brand VARCHAR(100),
        status ENUM('in_stock','low_stock','out_of_stock') DEFAULT 'in_stock',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 5️⃣ CUSTOMERS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
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

    // 6️⃣ VENDORS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendors (
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

    // 7️⃣ BRANDS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 8️⃣ CATEGORIES TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // QUANTITY TABLE
    await db.query(`
  CREATE TABLE IF NOT EXISTS quantities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,   -- 25kg, 50kg, 1kg
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

    console.log("✅ Database & tables initialized successfully");
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    process.exit(1);
  }
};
