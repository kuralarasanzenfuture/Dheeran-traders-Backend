export const createPlanRulesTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS plan_rules (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        plan_id INT NOT NULL,
                        collection_type varchar(10) NOT NULL,
                        installment_amount DECIMAL(12,2),
                        total_installments INT,

                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
                )
        `);
};
