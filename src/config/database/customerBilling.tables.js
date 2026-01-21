export const createCustomerBillingTables = async (db) => {
  await db.query(`
  CREATE TABLE IF NOT EXISTS customerBilling(
  id INT AUTO_INCREMENT PRIMARY KEY,

  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,

  customer_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  gst_number VARCHAR(30),

  subtotal DECIMAL(10,2) NOT NULL,
  tax_gst_percent DECIMAL(5,2) NOT NULL,
  tax_gst_amount DECIMAL(10,2) NOT NULL,

  grand_total DECIMAL(10,2) NOT NULL,

  advance_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL,

  cash_amount DECIMAL(10,2) DEFAULT 0,
  upi_amount DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`);

  await db.query(`
  CREATE TABLE IF NOT EXISTS customerBillingProducts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  billing_id INT NOT NULL,

  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  product_brand VARCHAR(100),
  product_category VARCHAR(100),

  quantity INT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
  `);
};
