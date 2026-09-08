export const createChitCustomerTable = async (db) => {
  // await db.query(`
  //       CREATE TABLE IF NOT EXISTS chit_customers (
  //           id INT PRIMARY KEY AUTO_INCREMENT,
  //           name VARCHAR(100) NOT NULL,
  //           phone VARCHAR(20) NOT NULL UNIQUE,
  //           place VARCHAR(100),
  //           aadhar VARCHAR(12) UNIQUE,
  //           pan_number VARCHAR(10) UNIQUE,
  //           door_no VARCHAR(10),
  //           address TEXT,
  //           state VARCHAR(100),
  //           district VARCHAR(100),
  //           pincode VARCHAR(10),

  //           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  //       )
  //   `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chit_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,

    place VARCHAR(100),

    aadhar VARCHAR(12) UNIQUE,
    pan_number VARCHAR(10) UNIQUE,

    door_no VARCHAR(20),
    address TEXT,

    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ✅ Proper constraints
    UNIQUE KEY unique_phone (phone),
    UNIQUE KEY unique_aadhar (aadhar),
    UNIQUE KEY unique_pan (pan_number),

    -- ✅ Indexes for search performance
    INDEX idx_name (name),
    INDEX idx_phone (phone),
    INDEX idx_aadhar (aadhar),
    INDEX idx_pan (pan_number),
    INDEX idx_location (state, district, pincode)
);
    `);

};
