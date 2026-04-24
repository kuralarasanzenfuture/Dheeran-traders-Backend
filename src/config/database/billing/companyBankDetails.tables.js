export const createCompanyBankDetailsTables = async (db) => {
  //   await db.query(`
  //       CREATE TABLE IF NOT EXISTS company_bank_details (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   bank_name VARCHAR(150) NOT NULL,
  //   account_name VARCHAR(150) NOT NULL,
  //   account_number VARCHAR(50) NOT NULL,
  //   ifsc_code VARCHAR(20) NOT NULL,
  //   branch VARCHAR(150) NOT NULL,

  //   qr_code_image VARCHAR(255) NOT NULL,

  //   status ENUM('active','inactive') DEFAULT 'active',

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP,

  //   UNIQUE KEY uniq_bank_details (bank_name, account_name, account_number, ifsc_code, branch)
  // ) ENGINE=InnoDB;
  //       `);

  await db.query(`
      CREATE TABLE IF NOT EXISTS company_bank_details (
  id INT AUTO_INCREMENT PRIMARY KEY,

  bank_name VARCHAR(150) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  branch VARCHAR(150) DEFAULT NULL,

  qr_code_image VARCHAR(255) NOT NULL,

  status ENUM('active','inactive') DEFAULT 'active',

  -- 🔥 CRITICAL: default account (only one allowed)
  is_primary BOOLEAN DEFAULT FALSE,

  -- 🔥 Audit fields
  created_by INT NULL,
  updated_by INT NULL,

  /* 🔒 allow only ONE primary */
    primary_flag TINYINT
      GENERATED ALWAYS AS (
        CASE WHEN is_primary = 1 THEN 1 ELSE NULL END
      ) STORED,


  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 🔥 Prevent duplicate accounts
  UNIQUE KEY uniq_account (account_number, ifsc_code),
  UNIQUE KEY uniq_primary_bank (primary_flag),

  INDEX idx_status (status),
  INDEX idx_primary (is_primary)
) ENGINE=InnoDB;
      `);
};
