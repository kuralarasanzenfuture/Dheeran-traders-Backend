export const createVendorStocksTables = async (db) => {
  //       await db.query(`
  //   CREATE TABLE IF NOT EXISTS vendor_stocks (
  //     id INT AUTO_INCREMENT PRIMARY KEY,

  //     vendor_name VARCHAR(150) NOT NULL,
  //     vendor_phone VARCHAR(20) NOT NULL,

  //     product_id varchar(50) NOT NULL,
  //     product_name VARCHAR(150) NOT NULL,
  //     product_brand VARCHAR(100) NOT NULL,
  //     product_category VARCHAR(100) NOT NULL,
  //     product_quantity VARCHAR(50) NOT NULL,

  //     total_stock INT NOT NULL,

  //     entry_date DATE DEFAULT (CURRENT_DATE),
  //     entry_time TIME DEFAULT (CURRENT_TIME),

  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //       ON UPDATE CURRENT_TIMESTAMP
  //   ) ENGINE=InnoDB;
  // `);

  //     await db.query(`
  //   CREATE TABLE IF NOT EXISTS vendor_stocks (
  //     id INT AUTO_INCREMENT PRIMARY KEY,

  //     vendor_name VARCHAR(150) NOT NULL,
  //     vendor_phone VARCHAR(20) NOT NULL,

  //     product_id VARCHAR(50) NOT NULL,
  //     product_name VARCHAR(150) NOT NULL,
  //     product_brand VARCHAR(100) NOT NULL,
  //     product_category VARCHAR(100) NOT NULL,
  //     product_quantity VARCHAR(50) NOT NULL,

  //     total_stock INT NOT NULL,

  //     entry_date DATE NOT NULL,
  //     entry_time TIME NOT NULL,

  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //       ON UPDATE CURRENT_TIMESTAMP
  //   ) ENGINE=InnoDB;
  // `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS vendor_stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,

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

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_vendor_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;
  `);
};
