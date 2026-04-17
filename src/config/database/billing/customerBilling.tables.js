export const createCustomerBillingTables = async (db) => {

  await db.query(`
  CREATE TABLE IF NOT EXISTS customerBilling (
  id INT AUTO_INCREMENT PRIMARY KEY,

  /* 📄 INVOICE */
  invoice_number VARCHAR(30) NOT NULL,
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
  staff_phone VARCHAR(20),

  /* 🏦 BANK */
  bank_id INT NOT NULL,

  /* 💰 BILL AMOUNTS */
  subtotal DECIMAL(12,2) NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL,
  advance_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL,

  /* 💳 PAYMENT SPLIT */
  cash_amount DECIMAL(12,2) DEFAULT 0,
  upi_amount DECIMAL(12,2) DEFAULT 0,
  cheque_amount DECIMAL(12,2) DEFAULT 0,
  upi_reference VARCHAR(100),

  /* 🔁 RETURNS */
  return_status ENUM('NONE', 'PARTIAL', 'FULL') DEFAULT 'NONE',

  /* 💵 PAYMENT STATUS */
  payment_status ENUM('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',

  /* 🔄 BILL STATUS */
  status ENUM('ACTIVE','CANCELLED') DEFAULT 'ACTIVE',

  /* 👤 AUDIT */
  created_by INT NULL,
  updated_by INT NULL,

  /* 📝 REMARKS */
  remarks TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  /* 🔐 CONSTRAINTS */
  UNIQUE KEY uq_invoice_number (invoice_number),

  /* ⚡ INDEXES (CRITICAL) */
  INDEX idx_customer (customer_id),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_customer_date (customer_id, invoice_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_return_status (return_status),
  INDEX idx_status (status),
  INDEX idx_bank (bank_id),

  /* 🔗 FOREIGN KEYS */
  CONSTRAINT fk_billing_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,

  CONSTRAINT fk_billing_bank
    FOREIGN KEY (bank_id) REFERENCES company_bank_details(id) ON DELETE RESTRICT

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

  hsn_code VARCHAR(20),

  cgst_rate DECIMAL(5,2),
  sgst_rate DECIMAL(5,2),
  gst_total_rate DECIMAL(5,2),

  cgst_amount DECIMAL(12,2) DEFAULT 0,
  sgst_amount DECIMAL(12,2) DEFAULT 0,
  gst_total_amount DECIMAL(12,2) DEFAULT 0,

  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,

  quantity INT NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  final_rate DECIMAL(12,2),
  total DECIMAL(12,2) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  /* ⚡ INDEXES */
  INDEX idx_billing (billing_id),
  INDEX idx_product (product_id),
  INDEX idx_billing_product (billing_id, product_id),

  /* 🔗 FOREIGN KEYS */
  FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT

) ENGINE=InnoDB;
  `);

  await db.query(`
CREATE TABLE IF NOT EXISTS customerBillingPayment (
  id INT AUTO_INCREMENT PRIMARY KEY,

  billing_id INT NOT NULL,

  payment_date DATE NOT NULL,

  cash_amount DECIMAL(12,2) DEFAULT 0,
  upi_amount DECIMAL(12,2) DEFAULT 0,
  cheque_amount DECIMAL(12,2) DEFAULT 0,

  total_amount DECIMAL(12,2)
    GENERATED ALWAYS AS (cash_amount + upi_amount + cheque_amount) STORED,

  reference_no VARCHAR(100),
  remarks VARCHAR(255),

  created_by INT,
  updated_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  /* ⚡ INDEXES */
  INDEX idx_billing_id (billing_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_billing_date (billing_id, payment_date),

  /* 🔗 FK */
  FOREIGN KEY (billing_id)
    REFERENCES customerBilling(id)
    ON DELETE CASCADE

) ENGINE=InnoDB;
`);

};


// export const createCustomerBillingTables = async (db) => {
//   await db.query(`
//   CREATE TABLE IF NOT EXISTS customerBilling (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   /* 📄 INVOICE */
//   invoice_number VARCHAR(30) UNIQUE NOT NULL,
//   invoice_date DATE NOT NULL,
//   company_gst_number VARCHAR(30),

//   /* 👤 CUSTOMER */
//   customer_id INT NOT NULL,
//   customer_name VARCHAR(150) NOT NULL,
//   phone_number VARCHAR(20),
//   customer_gst_number VARCHAR(30),

//   /* 🚚 TRANSPORT */
//   vehicle_number VARCHAR(20),
//   eway_bill_number VARCHAR(50),

//   /* 👤 STAFF */
//   staff_name VARCHAR(150) NOT NULL,
//   staff_phone VARCHAR(20),

//   /* 🏦 BANK */
//   bank_id INT NOT NULL,

//   /* 💰 BILL AMOUNTS */
//   subtotal DECIMAL(10,2) NOT NULL,

//   grand_total DECIMAL(10,2) NOT NULL,
//   advance_paid DECIMAL(10,2) DEFAULT 0,
//   balance_due DECIMAL(10,2) NOT NULL,

//   /* 💳 PAYMENT SPLIT */
//   cash_amount DECIMAL(10,2) DEFAULT 0,
//   upi_amount DECIMAL(10,2) DEFAULT 0,
//   cheque_amount DECIMAL(10,2) DEFAULT 0,
//   upi_reference VARCHAR(100) UNIQUE,

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

//   await db.query(`
//   CREATE TABLE IF NOT EXISTS customerBillingProducts (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   billing_id INT NOT NULL,

//   product_id INT NOT NULL,
//   product_name VARCHAR(150) NOT NULL,
//   product_brand VARCHAR(100),
//   product_category VARCHAR(100),
//   product_quantity VARCHAR(50),

//   hsn_code VARCHAR(20),
//   cgst_rate DECIMAL(5,2) NULL,
//   sgst_rate DECIMAL(5,2) NULL,
//   gst_total_rate DECIMAL(5,2) NULL,

//   cgst_amount DECIMAL(10,2) DEFAULT 0,
//   sgst_amount DECIMAL(10,2) DEFAULT 0,
//   gst_total_amount DECIMAL(10,2) DEFAULT 0,

//   discount_percent DECIMAL(5,2) DEFAULT 0,
//   discount_amount DECIMAL(10,2) DEFAULT 0,

//   quantity INT NOT NULL,
//   rate DECIMAL(10,2) NOT NULL,
//   final_rate DECIMAL(10,2),
//   total DECIMAL(10,2) NOT NULL,

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//   FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
//   FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
// );
//   `);

//   await db.query(`
// CREATE TABLE IF NOT EXISTS customerBillingPayment (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     billing_id INT NOT NULL,

//     payment_date DATE NOT NULL,

//     cash_amount DECIMAL(10,2) DEFAULT 0,
//     upi_amount DECIMAL(10,2) DEFAULT 0,
//     cheque_amount DECIMAL(10,2) DEFAULT 0,

//     -- ✅ Auto calculated (NEVER manual)
//     total_amount DECIMAL(10,2)
//     GENERATED ALWAYS AS (
//         cash_amount + upi_amount + cheque_amount
//     ) STORED,

//     reference_no VARCHAR(100),
//     remarks VARCHAR(255),

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     -- ✅ Critical indexes
//     INDEX idx_payment_date (payment_date),
//     INDEX idx_billing_id (billing_id),

//     FOREIGN KEY (billing_id) 
//     REFERENCES customerBilling(id) 
//     ON DELETE CASCADE
// );
// `);
// };
