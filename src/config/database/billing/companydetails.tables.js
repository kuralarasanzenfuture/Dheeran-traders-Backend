export const createCompanyDetailsTables = async (db) => {
  //   await db.query(`
  //         CREATE TABLE IF NOT EXISTS company_details (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   company_name VARCHAR(150) NOT NULL,
  //   company_quotes VARCHAR(255),

  //   company_address TEXT,
  //   district VARCHAR(100),
  //   state VARCHAR(100),
  //   pincode VARCHAR(10),

  //   phone VARCHAR(20),
  //   email VARCHAR(150),
  //   website VARCHAR(150),

  //   disclaimer TEXT,
  //   instruction TEXT
  // );
  //         `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS company_details (
  id INT AUTO_INCREMENT PRIMARY KEY,

  company_name VARCHAR(150) NOT NULL,
  company_quotes VARCHAR(255),

  company_address TEXT,
  district VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),

  phone VARCHAR(20),
  email VARCHAR(150),
  website VARCHAR(150),

  disclaimer TEXT,
  instruction TEXT,

  -- 🔥 enforce single active record
  is_active BOOLEAN DEFAULT FALSE,

  -- 🔥 audit tracking
  created_by INT NULL,
  updated_by INT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_active (is_active),
  INDEX idx_created_by (created_by),
  INDEX idx_updated_by (updated_by)
);
  `);

  await seedCompanyDetails(db);
};

export const seedCompanyDetails = async (db) => {
  await db.query(
    `INSERT IGNORE INTO company_details (
      company_name,
      company_quotes,
      company_address,
      district,
      state,
      pincode,
      phone,
      email,
      website,
      disclaimer,
      instruction
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE company_name = company_name`,
    [
      "DHEERAN TRADERS",
      "மனிதனை மனிதனாக மதிப்போம்! வேற்றுமையில் ஒற்றுமை காண்போம்!! செய்வது துணிந்து செய்",
      "Registered: 5/218/1, Pennagaram Main Road, Sogathur",
      "Dharmapuri",
      "Tamil Nadu",
      "636809",
      "9865065260",
      "dheerantradersthennarasu@gmail.com",
      "www.dheerantrades.in",
      "Goods sold under this invoice are unregistered brand names & supply under GST chargeable to 0% tax.",
      "48 மணி நேரத்திற்கு பிறகு திரும்பபெற இயலாது",
    ],
  );
};

// INSERT IGNORE INTO company_details (
//   company_name,
//   company_quotes,
//   company_address,
//   district,
//   state,
//   pincode,
//   phone,
//   email,
//   website,
//   disclaimer,
//   instruction
// ) VALUES (
//   'DHEERAN TRADERS',
//   'மனிதனை மனிதனாக மதிப்போம்! வேற்றுமையில் ஒற்றுமை காண்போம்!! செய்வது துணிந்து செய்',
//   'Registered: 5/218/1, Pennagaram Main Road, Sogathur',
//   'Dharmapuri',
//   'Tamil Nadu',
//   '636809',
//   '9865065260',
//   'dheerantradersthennarasu@gmail.com',
//   'www.dheerantrades.in',
//   'Goods sold under this invoice are unregistered brand names & supply under GST chargeable to 0% tax.',
//   '48 மணி நேரத்திற்கு பிறகு திரும்பபெற இயலாது'
// )
// ON DUPLICATE KEY UPDATE company_name = company_name;

// -----------------------------------------------

// const seedCompanyDetails = async (db) => {
//   await db.query(
//     `INSERT IGNORE INTO company_details (
//       company_name,
//       company_quotes,
//       company_address,
//       district,
//       state,
//       pincode,
//       phone,
//       email,
//       website,
//       disclaimer,
//       instruction
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       'ABC Traders Pvt Ltd',
//       'Quality Products at Best Prices',
//       'No.12, Nethaji Bye Pass Road',
//       'Dharmapuri',
//       'Tamil Nadu',
//       '636701',
//       '9876543210',
//       'abctraders@gmail.com',
//       'www.abctraders.in',
//       'Goods once sold cannot be taken back or exchanged.',
//       'Please check the items before leaving the shop. Thank you for your business!'
//     ]
//   );
// };

// INSERT INTO company_details (
//   company_name,
//   company_quotes,
//   company_address,
//   district,
//   state,
//   pincode,
//   phone,
//   email,
//   website,
//   disclaimer,
//   instruction
// ) VALUES (
//   'ABC Traders Pvt Ltd',
//   'Quality Products at Best Prices',
//   'No.12, Nethaji Bye Pass Road',
//   'Dharmapuri',
//   'Tamil Nadu',
//   '636701',
//   '9876543210',
//   'abctraders@gmail.com',
//   'www.abctraders.in',
//   'Goods once sold cannot be taken back or exchanged.',
//   'Please check the items before leaving the shop. Thank you for your business!'
// );
