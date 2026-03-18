export const collectionTables = async (db) => {
    
  

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
            subscription_id INT NOT NULL,
            collection_user_id INT NOT NULL,
            collection_due_date DATE NOT NULL,
            collection_upi DECIMAL(10,2),
            collection_upi_reference VARCHAR(255),
            collection_cash DECIMAL(10,2),
            collection_cheque DECIMAL(10,2),
            collection_amount DECIMAL(10,2) NOT NULL,
            collection_remarks VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            FOREIGN KEY (subscription_id)
            REFERENCES chit_customer_subscriptions(id) ON DELETE CASCADE
        )
    `);

//     CREATE TABLE chit_collections (

//     id INT AUTO_INCREMENT PRIMARY KEY,

//     subscription_id INT NOT NULL,
//     customer_id INT NOT NULL,

//     payment_date DATE NOT NULL,

//     collection_cash DECIMAL(10,2),
//     collection_upi DECIMAL(10,2),
//     collection_cheque DECIMAL(10,2),

//     collection_amount DECIMAL(10,2) NOT NULL,

//     remarks VARCHAR(255),

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     FOREIGN KEY (subscription_id)
//     REFERENCES chit_customer_subscriptions(id)
// );


};
