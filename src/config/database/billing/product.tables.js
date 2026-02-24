export const createProductTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(20) UNIQUE,
  product_name VARCHAR(150) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(100),
  quantity VARCHAR(50),

  hsn_code VARCHAR(20),
  cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_total_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

  price DECIMAL(10,2),
  stock INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_product (product_name, brand, category, quantity)
) ENGINE=InnoDB;
  `);
};
