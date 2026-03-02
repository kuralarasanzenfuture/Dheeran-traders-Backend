export const createBatchPlanTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS batch_plans (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        batch_id INT NOT NULL,
                        plan_id INT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
                        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
                )
        `);
};
