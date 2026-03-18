export const createCustomerInstallments = async (db) => {
    // await db.query(`
    //       CREATE TABLE IF NOT EXISTS chit_customer_installments (
    //           id INT AUTO_INCREMENT PRIMARY KEY,

    //           subscription_id INT NOT NULL,

    //           installment_number INT NOT NULL,
    //           due_date DATE NOT NULL,

    //           installment_amount DECIMAL(12,2) NOT NULL,

    //           paid_amount DECIMAL(12,2) DEFAULT 0,

    //           status ENUM('PAID','PENDING','PARTIAL', 'OVERDUE','BEFOREPAID') DEFAULT 'PENDING',

    //           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    //           FOREIGN KEY (subscription_id)
    //           REFERENCES chit_customer_subscriptions(id) ON DELETE CASCADE,

    //             INDEX idx_subscription (subscription_id)
    //       )
    //   `);

    await db.query(`
CREATE TABLE IF NOT EXISTS chit_customer_installments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    subscription_id INT NOT NULL,

    installment_number INT NOT NULL,
    due_date DATE NOT NULL,

    installment_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,

    status ENUM('PAID','PENDING','PARTIAL','OVERDUE','BEFOREPAID') DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (subscription_id)
        REFERENCES chit_customer_subscriptions(id)
        ON DELETE CASCADE,

    -- 🚫 Prevent duplicate installments
    UNIQUE KEY unique_installment (subscription_id, installment_number),

    INDEX idx_subscription (subscription_id)
);
`);


};