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
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_bank_details (bank_name, account_name, account_number, ifsc_code, branch)
) ENGINE=InnoDB;
      `);

  await seedCompanyBank(db);
  
};


const seedCompanyBank = async (db) => {
  const banks = [
    [
      'State Bank of India',
      'DHEERAN TRADERS',
      '1234567890123456',
      'SBIN0001234',
      'Dharmapuri Branch',
      'uploads/qr/sbi_qr.png',
      'active'
    ],
    [
      'Indian Bank',
      'DHEERAN TRADERS',
      '2345678901234567',
      'IDIB000D001',
      'Dharmapuri Main',
      'uploads/qr/indianbank_qr.png',
      'inactive'
    ]
  ];

  for (const bank of banks) {
    await db.query(
      `INSERT INTO company_bank_details
      (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        bank_name = VALUES(bank_name),
        account_name = VALUES(account_name),
        ifsc_code = VALUES(ifsc_code),
        branch = VALUES(branch),
        qr_code_image = VALUES(qr_code_image),
        status = VALUES(status)`,
      bank
    );
  }
};


// const seedCompanyBank = async (db) => {
//   await db.query(
//     `INSERT IGNORE INTO company_bank_details
//     (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
//     VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [
//       'State Bank of India',
//       'ABC Traders Pvt Ltd',
//       '1234567890123456',
//       'SBIN0001234',
//       'Dharmapuri Branch',
//       'uploads/qr/company_qr.png',
//       'active'
//     ]
//   );
// };


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
