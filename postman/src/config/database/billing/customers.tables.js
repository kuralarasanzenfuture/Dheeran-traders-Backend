export const createCustomerTables = async (db) => {
//   await db.query(`
//       CREATE TABLE IF NOT EXISTS customers (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   first_name VARCHAR(100) NOT NULL,
//   last_name VARCHAR(100),

//   phone VARCHAR(20) NOT NULL UNIQUE,
//   email VARCHAR(150) UNIQUE,

//   address TEXT,

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     ON UPDATE CURRENT_TIMESTAMP
// ) ENGINE=InnoDB;
//     `);

// await db.query(`
//   CREATE TABLE IF NOT EXISTS customers (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   first_name VARCHAR(100) NOT NULL,
//   last_name VARCHAR(100),

//   phone VARCHAR(20) NOT NULL UNIQUE,
//   email VARCHAR(150) UNIQUE,

//   address TEXT,

//   -- ✅ AUDIT LINKING (important for tracking)
//   created_by INT,
//   updated_by INT,

//   -- ✅ TIMESTAMPS
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
//     ON UPDATE CURRENT_TIMESTAMP,

//   -- ✅ UNIQUE CONSTRAINTS
//   UNIQUE KEY uq_customers_phone (phone),
//   UNIQUE KEY uq_customers_email (email),

//   -- ✅ INDEXES (for performance)
//   INDEX idx_phone (phone),
//   INDEX idx_email (email),
//   INDEX idx_created_by (created_by),

//   -- ✅ FOREIGN KEY (optional but recommended)
//   CONSTRAINT fk_customers_created_by
//     FOREIGN KEY (created_by)
//     REFERENCES users_roles(id)
//     ON DELETE SET NULL
//     ON UPDATE CASCADE,

//   CONSTRAINT fk_customers_updated_by
//     FOREIGN KEY (updated_by)
//     REFERENCES users_roles(id)
//     ON DELETE SET NULL
//     ON UPDATE CASCADE

// ) ENGINE=InnoDB;
//     `);
  // add feild area
    await db.query(`
  CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),

  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,

  place VARCHAR(100),

  address TEXT,

  -- ✅ AUDIT LINKING (important for tracking)
  created_by INT,
  updated_by INT,

  -- ✅ TIMESTAMPS
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- ✅ UNIQUE CONSTRAINTS
  UNIQUE KEY uq_customers_phone (phone),
  UNIQUE KEY uq_customers_email (email),

  -- ✅ INDEXES (for performance)
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_created_by (created_by),
  INDEX idx_updated_by (updated_by),
  INDEX idx_place (place),

  -- ✅ FOREIGN KEY (optional but recommended)
  CONSTRAINT fk_customers_created_by
    FOREIGN KEY (created_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_customers_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB;
    `);

};
