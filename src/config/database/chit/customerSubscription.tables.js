export const createCustomerSubcriptionTables = async (db) => {
  //     await db.query(`
  //                   CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
  //                           id INT AUTO_INCREMENT PRIMARY KEY,

  //                           customer_id INT NOT NULL,
  //                           batch_id INT NOT NULL,
  //                           plan_id INT NOT NULL,

  //                           no_of_slots INT NOT NULL,
  //                           investment_amount DECIMAL(12,2) NOT NULL,

  //                           start_date DATE NOT NULL,
  //                           duration INT NOT NULL,
  //                           end_date DATE NOT NULL,

  //                           reference_mode enum('AGENT', 'STAFF', 'OFFICE') NOT NULL,

  //                           agent_staff_id INT,

  //                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  //                           FOREIGN KEY (customer_id) REFERENCES chit_customers(id) ON DELETE RESTRICT,
  //                           FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  //                           FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  //                           FOREIGN KEY (agent_staff_id) REFERENCES chit_agent_and_staff(id) ON DELETE SET NULL
  //                   )
  //                   `);

  //   await db.query(`
  //                 CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
  //                         id INT AUTO_INCREMENT PRIMARY KEY,

  //                         customer_id INT NOT NULL,
  //                         nominee_name VARCHAR(150),
  //                         nominee_phone VARCHAR(20),

  //                         batch_id INT NOT NULL,
  //                         plan_id INT NOT NULL,

  //                         installment_amount DECIMAL(12,2),
  //                         investment_amount DECIMAL(12,2) NOT NULL,

  //                         start_date DATE NOT NULL,
  //                         duration INT NOT NULL,
  //                         end_date DATE NOT NULL,

  //                         reference_mode enum('AGENT', 'STAFF', 'OFFICE') NOT NULL,

  //                         agent_staff_id INT,

  //                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  //                         FOREIGN KEY (customer_id) REFERENCES chit_customers(id) ON DELETE RESTRICT,
  //                         FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  //                         FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  //                         FOREIGN KEY (agent_staff_id) REFERENCES chit_agent_and_staff(id) ON DELETE SET NULL,

  //                         INDEX customer_id (customer_id),
  //                         INDEX batch_id (batch_id),
  //                         INDEX plan_id (plan_id),
  //                         INDEX agent_staff_id (agent_staff_id),
  //                         INDEX idx_customer_batch (customer_id, batch_id)
  //                 )
  //                 `);

  await db.query(`
        CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
        
            customer_id INT NOT NULL,
            nominee_name VARCHAR(150),
            nominee_phone VARCHAR(20),
        
            batch_id INT NOT NULL,
            plan_id INT NOT NULL,
        
            installment_amount DECIMAL(12,2) NOT NULL,
            investment_amount DECIMAL(12,2) NOT NULL,
        
            start_date DATE NOT NULL,
            duration INT NOT NULL,
            end_date DATE NOT NULL,
        
            reference_mode ENUM('AGENT', 'STAFF', 'OFFICE') NOT NULL,
            agent_staff_id INT,
        
            created_by INT NULL,
            updated_by INT NULL,
        
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
            -- ✅ Foreign Keys
            FOREIGN KEY (customer_id) REFERENCES chit_customers(id) ON DELETE RESTRICT,
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
            FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
            FOREIGN KEY (agent_staff_id) REFERENCES chit_agent_and_staff(id) ON DELETE SET NULL,
        
            -- ✅ Prevent duplicate subscription
        --    UNIQUE KEY unique_customer_batch (customer_id, batch_id),
        
            -- ✅ Indexes (clean naming)
            INDEX idx_customer_id (customer_id),
            INDEX idx_batch_id (batch_id),
            INDEX idx_plan_id (plan_id),
            INDEX idx_agent_staff_id (agent_staff_id),
            INDEX idx_customer_batch (customer_id, batch_id),
            INDEX idx_reference_mode (reference_mode),
            INDEX idx_start_date (start_date),
            INDEX idx_end_date (end_date),
        
            -- ✅ Data validations
            CHECK (investment_amount > 0),
            CHECK (installment_amount > 0),
            CHECK (duration > 0),
            CHECK (end_date >= start_date)
        );
        `);

  // await db.query(`
  // CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
  //     id INT AUTO_INCREMENT PRIMARY KEY,

  //     customer_id INT NOT NULL,
  //     nominee_name VARCHAR(150),
  //     nominee_phone VARCHAR(20),

  //     batch_id INT NOT NULL,
  //     plan_id INT NOT NULL,

  //     installment_amount DECIMAL(12,2) NOT NULL,
  //     investment_amount DECIMAL(12,2) NOT NULL,

  //     start_date DATE NOT NULL,
  //     duration INT NOT NULL,
  //     end_date DATE NOT NULL,

  //     reference_mode ENUM('AGENT', 'STAFF', 'OFFICE') NOT NULL,
  //     agent_staff_id INT,

  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  //     FOREIGN KEY (customer_id) REFERENCES chit_customers(id) ON DELETE RESTRICT,
  //     FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  //     FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  //     FOREIGN KEY (agent_staff_id) REFERENCES chit_agent_and_staff(id) ON DELETE SET NULL,

  //     -- 🚫 Prevent duplicate subscription
  //     UNIQUE KEY unique_customer_batch (customer_id, batch_id, plan_id)
  // );
  // `);
};
