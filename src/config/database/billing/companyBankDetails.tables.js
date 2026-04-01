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

  await seedCompanyBank(db);
  
};

const seedCompanyBank = async (db) => {
  await db.query(
    `INSERT IGNORE INTO company_bank_details
    (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'State Bank of India',
      'ABC Traders Pvt Ltd',
      '1234567890123456',
      'SBIN0001234',
      'Dharmapuri Branch',
      'uploads/qr/company_qr.png',
      'active'
    ]
  );
};


// INSERT INTO company_bank_details 
// (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
// VALUES
// (
//   'State Bank of India',
//   'ABC Traders Pvt Ltd',
//   '1234567890123456',
//   'SBIN0001234',
//   'Dharmapuri Branch',
//   'uploads/qr/company_qr.png',
//   'active'
// );
