export const createCategoriesTable = async (db) => {
  //     await db.query(`
  //   CREATE TABLE IF NOT EXISTS categories (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //   brand_id INT NOT NULL,
  //   name VARCHAR(100) NOT NULL,
  //   hsn_code VARCHAR(20),

  //   CONSTRAINT fk_categories_brand
  //     FOREIGN KEY (brand_id)
  //     REFERENCES brands(id)
  //     ON DELETE CASCADE
  //     ON UPDATE CASCADE,

  //   UNIQUE KEY uq_brand_category (brand_id, name)
  //   ) ENGINE=InnoDB
  // `);

  // on update cascade
//   await db.query(`
//   CREATE TABLE IF NOT EXISTS categories (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   brand_id INT NOT NULL,
//   name VARCHAR(100) NOT NULL,
//   hsn_code VARCHAR(20),

//   -- ✅ Audit fields (don’t skip this in real apps)
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
//     ON UPDATE CURRENT_TIMESTAMP,

//   -- ✅ Foreign key
//   CONSTRAINT fk_categories_brand
//     FOREIGN KEY (brand_id)
//     REFERENCES brands(id)
//     ON DELETE CASCADE
//     ON UPDATE CASCADE,

//   -- ✅ Prevent duplicate category under same brand
//   UNIQUE KEY uq_brand_category (brand_id, name),

//   -- ✅ Indexes (important for performance)
//   INDEX idx_brand_id (brand_id),
//   INDEX idx_name (name)

// ) ENGINE=InnoDB;
// `);

await db.query(`
  CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,

  brand_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  hsn_code VARCHAR(20),

  -- ✅ Audit fields (don’t skip this in real apps)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- ✅ Foreign Key with RESTRICT
  CONSTRAINT fk_categories_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,


  -- ✅ Prevent duplicate category under same brand
  UNIQUE KEY uq_brand_category (brand_id, name),

  -- ✅ Indexes (important for performance)
  INDEX idx_brand_id (brand_id),
  INDEX idx_name (name)

) ENGINE=InnoDB;
`);

  // await seedCategories(db);
};

const seedCategories = async (db) => {
  const categories = [
    ["India Gate", "Basmati Rice", "1006"],
    ["India Gate", "Brown Rice", "1006"],

    ["Daawat", "Premium Basmati Rice", "1006"],
    ["Daawat", "Everyday Rice", "1006"],

    ["Fortune", "Sunflower Oil", "1512"],
    ["Fortune", "Mustard Oil", "1514"],
    ["Fortune", "Basmati Rice", "1006"],

    ["Saffola", "Refined Oil", "1512"],
    ["Saffola", "Oats", "1104"],

    ["Aashirvaad", "Atta (Wheat Flour)", "1101"],
    ["Aashirvaad", "Spices", "0910"],

    ["Tata Sampann", "Pulses (Dal)", "0713"],
    ["Tata Sampann", "Spices", "0910"],

    ["Amul", "Milk", "0401"],
    ["Amul", "Butter", "0405"],
    ["Amul", "Cheese", "0406"],

    ["Britannia", "Biscuits", "1905"],
    ["Britannia", "Bread", "1905"],

    ["MTR Foods", "Ready to Eat Meals", "2106"],
    ["MTR Foods", "Instant Mixes", "1901"],

    ["Haldiram's", "Namkeen", "2106"],
    ["Haldiram's", "Sweets", "1704"],
  ];

  for (const [brandName, name, hsn] of categories) {
    await db.query(
      `INSERT IGNORE INTO categories (brand_id, name, hsn_code)
       VALUES ((SELECT id FROM brands WHERE name = ?), ?, ?)`,
      [brandName, name, hsn],
    );
  }
};
