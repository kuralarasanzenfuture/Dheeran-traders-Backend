export const createCustomerBillingTables = async (db) => {
  //   await db.query(`
  //   CREATE TABLE IF NOT EXISTS customerBilling(
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   invoice_number VARCHAR(30) UNIQUE NOT NULL,
  //   invoice_date DATE NOT NULL,

  //   customer_id INT NOT NULL,
  //   customer_name VARCHAR(150) NOT NULL,
  //   phone_number VARCHAR(20),
  //   gst_number VARCHAR(30),

  //   /* 👤 STAFF DETAILS */
  //   staff_name VARCHAR(150) NOT NULL,
  //   staff_phone VARCHAR(20) NOT NULL,

  //   subtotal DECIMAL(10,2) NOT NULL,
  //   tax_gst_percent DECIMAL(5,2) NOT NULL,
  //   tax_gst_amount DECIMAL(10,2) NOT NULL,

  //   grand_total DECIMAL(10,2) NOT NULL,

  //   advance_paid DECIMAL(10,2) DEFAULT 0,
  //   balance_due DECIMAL(10,2) NOT NULL,

  //   cash_amount DECIMAL(10,2) DEFAULT 0,
  //   upi_amount DECIMAL(10,2) DEFAULT 0,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  //   FOREIGN KEY (customer_id) REFERENCES customers(id)
  // );
  // `);

  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS customerBilling (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   invoice_number VARCHAR(30) UNIQUE NOT NULL,
  //   invoice_date DATE NOT NULL,

  //   customer_id INT NOT NULL,
  //   customer_name VARCHAR(150) NOT NULL,
  //   phone_number VARCHAR(20),
  //   gst_number VARCHAR(30),

  //   /* 👤 STAFF DETAILS */
  //   staff_name VARCHAR(150) NOT NULL,
  //   staff_phone VARCHAR(20) NOT NULL,

  //   subtotal DECIMAL(10,2) NOT NULL,
  //   tax_gst_percent DECIMAL(5,2) NOT NULL,
  //   tax_gst_amount DECIMAL(10,2) NOT NULL,

  //   grand_total DECIMAL(10,2) NOT NULL,

  //   advance_paid DECIMAL(10,2) DEFAULT 0,
  //   balance_due DECIMAL(10,2) NOT NULL,

  //   cash_amount DECIMAL(10,2) DEFAULT 0,
  //   upi_amount DECIMAL(10,2) DEFAULT 0,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  //   CONSTRAINT fk_customer_billing_customer
  //     FOREIGN KEY (customer_id) REFERENCES customers(id)
  //     ON DELETE RESTRICT
  // ) ENGINE=InnoDB;
  //   `)

  //   await db.query(`
  //   CREATE TABLE IF NOT EXISTS customerBilling (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   /* 📄 INVOICE */
  //   invoice_number VARCHAR(30) UNIQUE NOT NULL,
  //   invoice_date DATE NOT NULL,

  //   /* 👤 CUSTOMER */
  //   customer_id INT NOT NULL,
  //   customer_name VARCHAR(150) NOT NULL,
  //   phone_number VARCHAR(20),
  //   gst_number VARCHAR(30),

  //   /* 👤 STAFF */
  //   staff_name VARCHAR(150) NOT NULL,
  //   staff_phone VARCHAR(20) NOT NULL,

  //   /* 🏦 BANK (CRITICAL) */
  //   bank_id INT NOT NULL,

  //   /* 💰 BILL AMOUNTS */
  //   subtotal DECIMAL(10,2) NOT NULL,
  //   tax_gst_percent DECIMAL(5,2) NOT NULL,
  //   tax_gst_amount DECIMAL(10,2) NOT NULL,
  //   tax_cgst_percent DECIMAL(5,2) NOT NULL,
  //   tax_cgst_amount DECIMAL(10,2) NOT NULL,
  //   tax_sgst_percent DECIMAL(5,2) NOT NULL,
  //   tax_sgst_amount DECIMAL(10,2) NOT NULL,

  //   grand_total DECIMAL(10,2) NOT NULL,

  //   advance_paid DECIMAL(10,2) DEFAULT 0,
  //   balance_due DECIMAL(10,2) NOT NULL,

  //   /* 💳 PAYMENT SPLIT */
  //   cash_amount DECIMAL(10,2) DEFAULT 0,
  //   upi_amount DECIMAL(10,2) DEFAULT 0,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  //   /* 🔗 FOREIGN KEYS */
  //   CONSTRAINT fk_billing_customer
  //     FOREIGN KEY (customer_id)
  //     REFERENCES customers(id)
  //     ON DELETE RESTRICT,

  //   CONSTRAINT fk_billing_bank
  //     FOREIGN KEY (bank_id)
  //     REFERENCES company_bank_details(id)
  //     ON DELETE RESTRICT

  // ) ENGINE=InnoDB;
  //   `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS customerBilling (
  id INT AUTO_INCREMENT PRIMARY KEY,

  /* 📄 INVOICE */
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  company_gst_number VARCHAR(30),

  /* 👤 CUSTOMER */
  customer_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  customer_gst_number VARCHAR(30),

  /* 🚚 TRANSPORT */
  vehicle_number VARCHAR(20),
  eway_bill_number VARCHAR(50),

  /* 👤 STAFF */
  staff_name VARCHAR(150) NOT NULL,
  staff_phone VARCHAR(20) NOT NULL,

  /* 🏦 BANK */
  bank_id INT NOT NULL,

  /* 💰 BILL AMOUNTS */
  subtotal DECIMAL(10,2) NOT NULL,

  tax_gst_percent DECIMAL(5,2) NOT NULL,
  tax_gst_amount DECIMAL(10,2) NOT NULL,

  tax_cgst_percent DECIMAL(5,2) NOT NULL,
  tax_cgst_amount DECIMAL(10,2) NOT NULL,

  tax_sgst_percent DECIMAL(5,2) NOT NULL,
  tax_sgst_amount DECIMAL(10,2) NOT NULL,

  grand_total DECIMAL(10,2) NOT NULL,
  advance_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL,

  /* 💳 PAYMENT SPLIT */
  cash_amount DECIMAL(10,2) DEFAULT 0,
  upi_amount DECIMAL(10,2) DEFAULT 0,
  cheque_amount DECIMAL(10,2) DEFAULT 0,
  upi_reference VARCHAR(100) UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  /* 🔗 FOREIGN KEYS */
  CONSTRAINT fk_billing_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_billing_bank
    FOREIGN KEY (bank_id)
    REFERENCES company_bank_details(id)
    ON DELETE RESTRICT

) ENGINE=InnoDB;
  `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS customerBillingProducts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  billing_id INT NOT NULL,

  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  product_brand VARCHAR(100),
  product_category VARCHAR(100),
  product_quantity VARCHAR(50),

  quantity INT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS customerBillingPayment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id INT NOT NULL,

    payment_date DATE NOT NULL,

    cash_amount DECIMAL(10,2) DEFAULT 0,
    upi_amount DECIMAL(10,2) DEFAULT 0,

    reference_no VARCHAR(100),
    remarks VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE
    );
    `);
};
