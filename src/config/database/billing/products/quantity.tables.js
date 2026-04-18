export const createQuantityTable = async (db) => {
//   await db.query(`
//   CREATE TABLE IF NOT EXISTS quantities (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//   brand_id INT NOT NULL,
//   category_id INT NOT NULL,
//   name VARCHAR(50) NOT NULL,

//   CONSTRAINT fk_quantities_brand
//     FOREIGN KEY (brand_id)
//     REFERENCES brands(id)
//     ON DELETE CASCADE
//     ON UPDATE CASCADE,

//   CONSTRAINT fk_quantities_category
//     FOREIGN KEY (category_id)
//     REFERENCES categories(id)
//     ON DELETE CASCADE
//     ON UPDATE CASCADE,

//   UNIQUE (brand_id, category_id, name)
//   ) ENGINE=InnoDB
// `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quantities (
  id INT AUTO_INCREMENT PRIMARY KEY,

  brand_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,

  -- ✅ AUDIT (only creator/updater, no deleted fields)
  created_by INT,
  updated_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- ✅ STRICT FK (NO CASCADE)
  CONSTRAINT fk_quantities_brand
    FOREIGN KEY (brand_id)
    REFERENCES brands(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT fk_quantities_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  UNIQUE KEY uq_quantity (brand_id, category_id, name),

  INDEX idx_brand (brand_id),
  INDEX idx_category (category_id)

) ENGINE=InnoDB;
`);

  await seedQuantities(db);
};

const seedQuantities = async (db) => {
  const data = [
    ["India Gate", "Basmati Rice", "1kg"],
    ["India Gate", "Basmati Rice", "5kg"],

    ["Daawat", "Premium Basmati Rice", "1kg"],
    ["Daawat", "Premium Basmati Rice", "10kg"],

    // ["Fortune", "Sunflower Oil", "1L"],
    // ["Fortune", "Sunflower Oil", "5L"],

    // ["Saffola", "Refined Oil", "1L"],
    // ["Saffola", "Refined Oil", "2L"],

    // ["Aashirvaad", "Atta (Wheat Flour)", "1kg"],
    // ["Aashirvaad", "Atta (Wheat Flour)", "5kg"],

    // ["Amul", "Milk", "500ml"],
    // ["Amul", "Milk", "1L"],

    // ["Britannia", "Biscuits", "100g"],
    // ["Britannia", "Biscuits", "200g"],

    // ["Haldiram's", "Namkeen", "200g"],
    // ["Haldiram's", "Namkeen", "1kg"],
  ];

  for (const [brand, category, qty] of data) {
    await db.query(
      `INSERT IGNORE INTO quantities (brand_id, category_id, name)
       VALUES (
         (SELECT id FROM brands WHERE name = ?),
         (SELECT c.id FROM categories c
            JOIN brands b ON c.brand_id = b.id
          WHERE b.name = ? AND c.name = ?),
         ?
       )`,
      [brand, brand, category, qty],
    );
  }
};
