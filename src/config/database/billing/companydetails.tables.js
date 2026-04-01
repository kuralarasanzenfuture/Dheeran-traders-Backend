export const createCompanyDetailsTables = async (db) => {
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
  instruction TEXT
);
        `);

  await seedCompanyDetails(db);
};


const seedCompanyDetails = async (db) => {
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'ABC Traders Pvt Ltd',
      'Quality Products at Best Prices',
      'No.12, Nethaji Bye Pass Road',
      'Dharmapuri',
      'Tamil Nadu',
      '636701',
      '9876543210',
      'abctraders@gmail.com',
      'www.abctraders.in',
      'Goods once sold cannot be taken back or exchanged.',
      'Please check the items before leaving the shop. Thank you for your business!'
    ]
  );
};


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
