export const createUserBillAssignTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_bill_customer_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,

            user_id INT NOT NULL,
            customer_id INT NOT NULL,

            assigned_by INT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            updated_by INT NULL,
            updated_at TIMESTAMP NULL,

            is_active BOOLEAN DEFAULT TRUE,

            UNIQUE KEY uq_user_customer (user_id, customer_id),

            INDEX idx_user (user_id),
            INDEX idx_customer (customer_id),

            FOREIGN KEY (user_id) REFERENCES users_roles(id) ON DELETE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_by) REFERENCES users_roles(id) ON DELETE SET NULL,
            FOREIGN KEY (updated_by) REFERENCES users_roles(id) ON DELETE SET NULL
    );
        `);
};
