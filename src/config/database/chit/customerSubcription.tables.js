export const createCustomerSubcriptionTables = async (db) => {
  await db.query(`
                CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
                        id INT AUTO_INCREMENT PRIMARY KEY,

                        customer_id INT NOT NULL,
                        customer_name VARCHAR(150) NOT NULL,
                        customer_phone VARCHAR(20) NOT NULL,
                        batch_id INT NOT NULL,
                        plan_id INT NOT NULL,

                        slot_number INT,
                        investment_amount DECIMAL(12,2) NOT NULL,

                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        maturity_date DATE NOT NULL,

                        reference_mode enum('AGENT', 'STAFF', 'office') NOT NULL,

                        agent_staff_id INT,
                        agent_staff_name VARCHAR(150),
                        agent_staff_phone VARCHAR(20),

                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
                `);
};
