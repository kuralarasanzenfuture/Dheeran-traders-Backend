export const createProductTables = async (db) => {
  //   await db.query(`
  //     CREATE TABLE IF NOT EXISTS products (
  //   id INT AUTO_INCREMENT PRIMARY KEY,
  //   product_code VARCHAR(20) UNIQUE,
  //   product_name VARCHAR(150) NOT NULL,
  //   brand VARCHAR(100),
  //   category VARCHAR(100),
  //   quantity VARCHAR(50),

  //   hsn_code VARCHAR(20),
  //   cgst_rate DECIMAL(5,2) NULL,
  //   sgst_rate DECIMAL(5,2) NULL,
  //   gst_total_rate DECIMAL(5,2) NULL,

  //   price DECIMAL(10,2) NOT NULL,
  //   stock INT NOT NULL DEFAULT 0,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  //   UNIQUE KEY uniq_product (product_name, brand, category, quantity)
  // ) ENGINE=InnoDB;
  //   `);

  // foreign key table
//   await db.query(`
//   CREATE TABLE IF NOT EXISTS products (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   product_code VARCHAR(20) UNIQUE,
//   product_name VARCHAR(150) NOT NULL,
//   brand VARCHAR(100),
//   category VARCHAR(100),
//   quantity VARCHAR(50),

//   hsn_code VARCHAR(20),
//   cgst_rate DECIMAL(5,2),
//   sgst_rate DECIMAL(5,2),
//   gst_total_rate DECIMAL(5,2),

//   price DECIMAL(10,2) NOT NULL,
//   stock INT NOT NULL DEFAULT 0,

//   created_by INT,
//   updated_by INT,

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
//     ON UPDATE CURRENT_TIMESTAMP,

//   -- ✅ FOREIGN KEYS (STRICT)
//   CONSTRAINT fk_product_brand
//     FOREIGN KEY (brand_id)
//     REFERENCES brands(id)
//     ON DELETE RESTRICT
//     ON UPDATE CASCADE,

//   CONSTRAINT fk_product_category
//     FOREIGN KEY (category_id)
//     REFERENCES categories(id)
//     ON DELETE RESTRICT
//     ON UPDATE CASCADE,

//   CONSTRAINT fk_product_quantity
//     FOREIGN KEY (quantity_id)
//     REFERENCES quantities(id)
//     ON DELETE RESTRICT
//     ON UPDATE CASCADE,

//   -- ✅ UNIQUE COMBINATION
//   UNIQUE KEY uniq_product 
//     (product_name, brand_id, category_id, quantity_id),

//   INDEX idx_brand (brand_id),
//   INDEX idx_category (category_id),
//   INDEX idx_quantity (quantity_id)

// ) ENGINE=InnoDB;
//   `);

await db.query(`
  CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,

  product_code VARCHAR(20) UNIQUE,
  product_name VARCHAR(150) NOT NULL,

  brand VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity VARCHAR(50) NOT NULL,

  hsn_code VARCHAR(20),
  cgst_rate DECIMAL(5,2) DEFAULT NULL,
  sgst_rate DECIMAL(5,2) DEFAULT NULL,
  gst_total_rate DECIMAL(5,2) DEFAULT NULL,

  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),

  created_by INT DEFAULT NULL,
  updated_by INT DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  -- 🔥 prevent duplicate logical product
  UNIQUE KEY uniq_product 
    (product_name, brand, category, quantity),

  -- 🔥 indexing for filtering
  INDEX idx_brand (brand),
  INDEX idx_category (category),
  INDEX idx_quantity (quantity),
  INDEX idx_product_name (product_name)

) ENGINE=InnoDB;
  `);


};
