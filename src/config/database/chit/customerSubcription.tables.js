export const createCustomerSubcriptionTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
                        id INT AUTO_INCREMENT PRIMARY KEY,

                        customer_id INT NOT NULL,
                        batch_id INT NOT NULL,
                        plan_id INT NOT NULL,

                        no_of_slots INT NOT NULL,
                        investment_amount DECIMAL(12,2) NOT NULL,

                        start_date DATE NOT NULL,
                        duration INT NOT NULL,
                        end_date DATE NOT NULL,
                        

                        reference_mode enum('AGENT', 'STAFF', 'OFFICE') NOT NULL,

                        agent_staff_id INT,

                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
                `);
};
