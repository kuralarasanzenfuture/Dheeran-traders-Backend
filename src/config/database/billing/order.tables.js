export const createOrderTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS customerOrders (
  id INT AUTO_INCREMENT PRIMARY KEY,

  order_number VARCHAR(30) UNIQUE,

  customer_id INT NOT NULL,
  customer_name VARCHAR(150),

  employee_id INT NOT NULL,

  order_date DATE NOT NULL,
  expected_delivery_date DATE NOT NULL,
  delivery_date DATE NULL,

  status ENUM('PENDING','CONFIRMED','BILLED','DELIVERED','CANCELLED') 
    DEFAULT 'PENDING',

  remarks TEXT,

  created_by INT NULL,
  updated_by INT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  /* ⚡ INDEXES (VERY IMPORTANT) */
  INDEX idx_customer (customer_id),
  INDEX idx_employee (employee_id),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date),
  INDEX idx_customer_date (customer_id, order_date),
  INDEX idx_employee_date (employee_id, order_date),
  INDEX idx_delivery_date (delivery_date),

  /* 🔗 FK */
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (employee_id) REFERENCES employees_details(id)

) ENGINE=InnoDB;
            `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS customerOrderProducts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  order_id INT NOT NULL,
  product_id INT NOT NULL,

  quantity INT NOT NULL,

  /* ⚡ INDEXES */
  INDEX idx_order (order_id),
  INDEX idx_product (product_id),
  INDEX idx_order_product (order_id, product_id),

  /* 🔗 FK */
  FOREIGN KEY (order_id) REFERENCES customerOrders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)

) ENGINE=InnoDB;
    `);
};
