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
};
