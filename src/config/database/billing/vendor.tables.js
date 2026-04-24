export const createVendorTables = async (db) => {
//   await db.query(`
//       CREATE TABLE IF NOT EXISTS vendors (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   first_name VARCHAR(100) NOT NULL,
//   last_name VARCHAR(100),

//   phone VARCHAR(20) NOT NULL UNIQUE,
//   email VARCHAR(150) UNIQUE,

//   address TEXT,

//   bank_name VARCHAR(150),
//   bank_account_number VARCHAR(30),
//   bank_ifsc_code VARCHAR(20),
//   bank_branch_name VARCHAR(150),

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     ON UPDATE CURRENT_TIMESTAMP
// ) ENGINE=InnoDB;
//     `);

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

  -- ✅ AUDIT LINKING
  created_by INT,
  updated_by INT,

  -- ✅ TIMESTAMPS
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- ✅ UNIQUE CONSTRAINTS
  UNIQUE KEY uq_vendors_phone (phone),
  UNIQUE KEY uq_vendors_email (email),

  -- ✅ INDEXES (performance)
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_created_by (created_by),

  -- ✅ FOREIGN KEYS (audit users)
  CONSTRAINT fk_vendors_created_by
    FOREIGN KEY (created_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_vendors_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB;
  `)
};
