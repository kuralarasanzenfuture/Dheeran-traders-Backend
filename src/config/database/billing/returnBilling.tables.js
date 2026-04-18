export const createReturnBillingTables = async (db) => {
  await db.query(`
        CREATE TABLE IF NOT EXISTS customerBillingReturns (
  id INT AUTO_INCREMENT PRIMARY KEY,

  billing_id INT NOT NULL,

  return_number VARCHAR(50) UNIQUE, -- optional but useful

  return_date DATE NOT NULL,

  total_return_amount DECIMAL(12,2) DEFAULT 0,


  remarks TEXT,

  created_by INT,
  updated_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  /* ⚡ INDEXES */
  INDEX idx_billing (billing_id),
  INDEX idx_return_date (return_date),

  /* 🔗 FK */
  CONSTRAINT fk_return_billing
    FOREIGN KEY (billing_id)
    REFERENCES customerBilling(id)
    ON DELETE CASCADE

) ENGINE=InnoDB;
    `);

  await db.query(`
 CREATE TABLE IF NOT EXISTS customerBillingReturnsProducts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  return_id INT NOT NULL,
  billing_product_id INT NOT NULL,
  product_id INT NOT NULL,

  return_quantity INT NOT NULL,

  return_rate DECIMAL(12,2) NOT NULL,
  return_amount DECIMAL(12,2) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  /* ⚡ INDEXES */
  INDEX idx_return (return_id),
  INDEX idx_product (product_id),
  INDEX idx_billing_product (billing_product_id),

  /* 🔗 FK */
  CONSTRAINT fk_return_products_return
    FOREIGN KEY (return_id)
    REFERENCES customerBillingReturns(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_return_products_billing_product
    FOREIGN KEY (billing_product_id)
    REFERENCES customerBillingProducts(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_return_products_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)

) ENGINE=InnoDB;
    `);

  //   await db.query(`
  //  CREATE TABLE IF NOT EXISTS customerBillingReturnsProducts (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   return_id INT NOT NULL,
  //   billing_product_id INT NOT NULL,
  //   product_id INT NOT NULL,

  //   return_quantity INT NOT NULL,

  //   /* 💰 Refund */
  //   return_amount DECIMAL(12,2) DEFAULT 0,
  //   refund_mode ENUM('CASH','UPI','ADJUSTMENT') DEFAULT NULL,

  //   /* 🔁 Exchange */
  //   is_exchange BOOLEAN DEFAULT FALSE,
  //   exchange_product_id INT DEFAULT NULL,
  //   exchange_quantity INT DEFAULT NULL,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  //   /* ⚡ INDEXES */
  //   INDEX idx_return (return_id),
  //   INDEX idx_product (product_id),
  //   INDEX idx_billing_product (billing_product_id),

  //   FOREIGN KEY (return_id)
  //     REFERENCES customerBillingReturns(id)
  //     ON DELETE CASCADE,

  //   FOREIGN KEY (billing_product_id)
  //     REFERENCES customerBillingProducts(id)
  //     ON DELETE CASCADE,

  //   FOREIGN KEY (product_id)
  //     REFERENCES products(id),

  //   FOREIGN KEY (exchange_product_id)
  //     REFERENCES products(id)
  // );
  //     `);
};
