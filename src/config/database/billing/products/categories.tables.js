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

};

