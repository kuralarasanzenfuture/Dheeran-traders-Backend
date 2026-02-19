export const createCompanyBankDetailsTables = async (db) => {
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
};
