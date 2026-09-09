export const createCustomerSubcriptionTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chit_customer_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- =========================
        -- CUSTOMER DETAILS
        -- =========================
        customer_id INT NOT NULL,
        nominee_name VARCHAR(150),
        nominee_phone VARCHAR(20),

        -- =========================
        -- CHIT DETAILS
        -- =========================
        batch_id INT NOT NULL,
        plan_id INT NOT NULL,

        installment_amount DECIMAL(12,2) NOT NULL,
        investment_amount DECIMAL(12,2) NOT NULL,

        -- =========================
        -- SUBSCRIPTION PERIOD
        -- =========================
        start_date DATE NOT NULL,
        duration INT NOT NULL,
        end_date DATE NOT NULL,

        -- =========================
        -- MATURITY DETAILS
        -- =========================
        maturity_date DATE NULL,

        is_maturity_paid BOOLEAN NOT NULL DEFAULT FALSE,

        maturity_paid_date DATE NULL,

        maturity_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,

        maturity_paid_by INT NULL,

        maturity_payment_mode VARCHAR(50) NULL,

        maturity_remarks TEXT NULL,

        -- =========================
        -- REFERENCE DETAILS
        -- =========================
        reference_mode ENUM('AGENT', 'STAFF', 'OFFICE') NOT NULL,

        agent_staff_id INT,

        -- =========================
        -- AUDIT
        -- =========================
        created_by INT NULL,
        updated_by INT NULL,

        -- =========================
        -- TIMESTAMPS
        -- =========================
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP,

        -- =========================
        -- FOREIGN KEYS
        -- =========================
        FOREIGN KEY (customer_id)
            REFERENCES chit_customers(id)
            ON DELETE RESTRICT,

        FOREIGN KEY (batch_id)
            REFERENCES batches(id)
            ON DELETE RESTRICT,

        FOREIGN KEY (plan_id)
            REFERENCES plans(id)
            ON DELETE RESTRICT,

        FOREIGN KEY (agent_staff_id)
            REFERENCES chit_agent_and_staff(id)
            ON DELETE SET NULL,

        FOREIGN KEY (maturity_paid_by)
            REFERENCES users_roles(id)
            ON DELETE SET NULL,

        -- =========================
        -- INDEXES
        -- =========================
        INDEX idx_customer_id (customer_id),
        INDEX idx_batch_id (batch_id),
        INDEX idx_plan_id (plan_id),
        INDEX idx_agent_staff_id (agent_staff_id),

        INDEX idx_customer_batch (customer_id, batch_id),

        INDEX idx_reference_mode (reference_mode),

        INDEX idx_start_date (start_date),
        INDEX idx_end_date (end_date),

        INDEX idx_maturity_date (maturity_date),
        INDEX idx_maturity_paid (is_maturity_paid),
        INDEX idx_maturity_paid_by (maturity_paid_by),

        -- =========================
        -- DATA VALIDATIONS
        -- =========================
        CHECK (investment_amount > 0),
        CHECK (installment_amount > 0),
        CHECK (duration > 0),
        CHECK (end_date >= start_date),
        CHECK (maturity_paid_amount >= 0)

    ) ENGINE=InnoDB;
  `);

  // Safe check to add missing columns to pre-existing chit_customer_subscriptions tables
  const requiredColumns = [
    { name: "maturity_date", def: "DATE NULL" },
    { name: "is_maturity_paid", def: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { name: "maturity_paid_date", def: "DATE NULL" },
    { name: "maturity_paid_amount", def: "DECIMAL(12,2) NOT NULL DEFAULT 0.00" },
    { name: "maturity_paid_by", def: "INT NULL" },
    { name: "maturity_payment_mode", def: "VARCHAR(50) NULL" },
    { name: "maturity_remarks", def: "TEXT NULL" },
    { name: "created_by", def: "INT NULL" },
    { name: "updated_by", def: "INT NULL" },
  ];

  for (const col of requiredColumns) {
    try {
      const [colExists] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'chit_customer_subscriptions' 
           AND COLUMN_NAME = ?`,
        [col.name]
      );
      if (!colExists.length) {
        await db.query(`ALTER TABLE chit_customer_subscriptions ADD COLUMN ${col.name} ${col.def}`);
      }
    } catch (err) {
      console.error(`Migration notice for chit_customer_subscriptions.${col.name}:`, err.message);
    }
  }

  // Populate maturity_date for existing records where it's NULL (fallback to end_date)
  try {
    await db.query(`
      UPDATE chit_customer_subscriptions 
      SET maturity_date = end_date 
      WHERE maturity_date IS NULL
    `);
  } catch (err) {
    // Ignore if table is empty or column not ready
  }
};
