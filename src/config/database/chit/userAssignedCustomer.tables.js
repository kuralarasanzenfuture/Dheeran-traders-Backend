export const createUserAssignedCustomerTable = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS user_chit_customer_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NOT NULL,
  customer_id INT NOT NULL,

  assigned_by INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE KEY uq_user_customer (user_id, customer_id),

  FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES chit_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users_roles(id) ON DELETE SET NULL
);
        `);
};
