export const createVendorStocksTables = async (db) => {
  //   await db.query(`
  //   CREATE TABLE IF NOT EXISTS vendor_stocks (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   entry_id INT NOT NULL,   -- 👈 GROUPING ID (IMPORTANT)

  //   vendor_id INT NOT NULL,
  //   vendor_name VARCHAR(150) NOT NULL,
  //   vendor_phone VARCHAR(20) NOT NULL,

  //   product_id INT NOT NULL,
  //   product_name VARCHAR(150) NOT NULL,
  //   product_brand VARCHAR(100) NOT NULL,
  //   product_category VARCHAR(100) NOT NULL,
  //   product_quantity VARCHAR(50) NOT NULL,

  //   total_stock INT NOT NULL,

  //   entry_date DATE NOT NULL,
  //   entry_time TIME NOT NULL,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP,

  //   CONSTRAINT fk_vendor_product
  //     FOREIGN KEY (product_id) REFERENCES products(id)
  //     ON DELETE RESTRICT,

  //   CONSTRAINT fk_vendor
  //     FOREIGN KEY (vendor_id) REFERENCES vendors(id)
  //     ON DELETE RESTRICT
  // ) ENGINE=InnoDB;
  //   `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS vendor_stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,

  entry_id INT NOT NULL,

  vendor_id INT NOT NULL,
  vendor_name VARCHAR(150) NOT NULL,
  vendor_phone VARCHAR(20) NOT NULL,

  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  product_brand VARCHAR(100) NOT NULL,
  product_category VARCHAR(100) NOT NULL,
  product_quantity VARCHAR(50) NOT NULL,

  total_stock INT NOT NULL,

  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL,

  created_by INT,
  updated_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  -- 🔥 INDEXES (IMPORTANT)
  INDEX idx_entry (entry_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_product (product_id),
  INDEX idx_date (entry_date),

  -- 🔥 FOREIGN KEYS
  CONSTRAINT fk_vs_vendor
    FOREIGN KEY (vendor_id)
    REFERENCES vendors(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_vs_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_vs_created_by
    FOREIGN KEY (created_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_vs_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL

) ENGINE=InnoDB;
 `);
};
