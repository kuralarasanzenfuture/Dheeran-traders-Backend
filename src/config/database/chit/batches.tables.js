export const createBatchTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS batches (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        batch_name VARCHAR(100) NOT NULL,
                        batch_duration INT,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        status ENUM('WAITING','ACTIVE','CLOSED') DEFAULT 'WAITING',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
        `);
};
