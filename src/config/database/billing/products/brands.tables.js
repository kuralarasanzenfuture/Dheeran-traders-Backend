export const createBrandsTable = async (db) => {
  //   await db.query(`
  //   CREATE TABLE IF NOT EXISTS brands (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //     name VARCHAR(100) NOT NULL UNIQUE

  //   ) ENGINE=InnoDB
  // `);

  // soft delete
  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS brands (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   name VARCHAR(100) NOT NULL UNIQUE,

  //   -- ✅ AUDIT FIELDS
  //   created_by INT,
  //   updated_by INT,
  //   deleted_by INT,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP,
  //   deleted_at TIMESTAMP NULL,

  //   -- ✅ OPTIONAL STATUS (better than hard delete)
  //   -- status ENUM('active', 'inactive') DEFAULT 'active',

  //   -- ✅ INDEXES
  //   INDEX idx_created_by (created_by),
  //   INDEX idx_updated_by (updated_by),
  //   INDEX idx_deleted_by (deleted_by)

  // ) ENGINE=InnoDB;
  // `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL UNIQUE,

  created_by INT,
  updated_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_created_by (created_by),
  INDEX idx_updated_by (updated_by)
) ENGINE=InnoDB;
`);

  await seedBrands(db);
};

const seedBrands = async (db) => {
  const brands = [
    // Rice
    "India Gate",
    "Daawat",
    "Kohinoor",
    "Lal Qilla",
    "Fortune Basmati",
    "Aeroplane Rice",

    // Oil
    // "Fortune",
    // "Saffola",
    // "Dhara",
    // "Gemini",
    // "Gold Winner",
    // "Freedom Oil",

    // Food
    // "Aashirvaad",
    // "Tata Sampann",
    // "Patanjali",
    // "24 Mantra Organic",
    // "MTR Foods",
    // "ITC Master Chef",
    // "Nestle India",
    // "Britannia",
    // "Amul",
    // "Haldiram's",
  ];

  for (const name of brands) {
    await db.query(`INSERT IGNORE INTO brands (name) VALUES (?)`, [name]);
  }
};
