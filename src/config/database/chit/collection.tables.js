export const collectionTables = async (db) => {
  //   await db.query(`
  //         CREATE TABLE IF NOT EXISTS chit_installments_generated (
  //             id INT AUTO_INCREMENT PRIMARY KEY,

  //             subscription_id INT NOT NULL,

  //             installment_number INT NOT NULL,
  //             due_date DATE NOT NULL,
  //             installment_amount DECIMAL(12,2) NOT NULL,

  //             paid_amount DECIMAL(12,2) DEFAULT 0,

  //             status ENUM('PAID','PENDING','PARTIAL') DEFAULT 'PENDING',

  //             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  //             FOREIGN KEY (subscription_id)
  //             REFERENCES chit_customer_subscriptions(id) ON DELETE CASCADE
  //         )
  //     `);

//   await db.query(`
//     CREATE TABLE IF NOT EXISTS chit_collections (
//     id INT AUTO_INCREMENT PRIMARY KEY,

//     installment_id INT NOT NULL,
//     subscription_id INT NOT NULL,
//     customer_id INT NOT NULL,

//     collected_by INT,

//     payment_date DATE NOT NULL,
//     payment_time TIME NOT NULL,

//     total_amount DECIMAL(12,2) NOT NULL,

//     remarks TEXT,

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     FOREIGN KEY (installment_id) REFERENCES chit_installments(id),
//     FOREIGN KEY (subscription_id) REFERENCES chit_customer_subscriptions(id),
//     FOREIGN KEY (customer_id) REFERENCES chit_customers(id)
// );`);

// CREATE TABLE chit_collection_payments (
//     id INT AUTO_INCREMENT PRIMARY KEY,

//     collection_id INT NOT NULL,

//     payment_method ENUM('CASH','UPI','CHEQUE'),

//     amount DECIMAL(12,2) NOT NULL,

//     reference_number VARCHAR(255),

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     FOREIGN KEY (collection_id)
//     REFERENCES chit_collections(id) ON DELETE CASCADE
// );

  await db.query(`
        CREATE TABLE IF NOT EXISTS chit_collections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            collection_name VARCHAR(255) NOT NULL,
            collection_phone VARCHAR(20) NOT NULL,
            collection_date DATE NOT NULL,
            collection_upi DECIMAL(10,2),
            collection_upi_reference VARCHAR(255),
            collection_cash DECIMAL(10,2),
            collection_cheque DECIMAL(10,2),
            collection_amount DECIMAL(10,2) NOT NULL,
            payment_date DATE ,
            collection_status ENUM('PAID', 'UNPAID') DEFAULT 'UNPAID',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};
