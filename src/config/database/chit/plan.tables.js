export const createPlanTables = async (db) => {
  //   await db.query(`
  //         CREATE TABLE IF NOT EXISTS plans (
  //             id INT AUTO_INCREMENT PRIMARY KEY,
  //             plan_name VARCHAR(100) NOT NULL,
  //             plan_duration INT NOT NULL,
  //             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  //         )
  //     `);

  // await db.query(`
  //       CREATE TABLE IF NOT EXISTS plans (
  //   id INT AUTO_INCREMENT PRIMARY KEY,
  //   plan_name VARCHAR(100) NOT NULL UNIQUE,
  //   duration_days INT NOT NULL,
  //   collection_type ENUM('DAILY','WEEKLY','MONTHLY','SINGLE') NOT NULL,
  //   total_installments INT NOT NULL,
  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //   )

  //   `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,

    plan_name VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL CHECK (duration_days > 0),

    collection_type ENUM('DAILY','WEEKLY','MONTHLY','SINGLE') NOT NULL,

    total_installments INT NOT NULL CHECK (total_installments > 0),

    created_by INT,
    updated_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ✅ Composite unique (better than single UNIQUE)
    UNIQUE KEY unique_plan (plan_name, duration_days, collection_type),

    INDEX idx_collection_type (collection_type),
    INDEX idx_total_installments (total_installments),
    INDEX idx_plan_name (plan_name),
    INDEX idx_duration_days (duration_days)
);
  `);

  //   await db.query(`
  //     INSERT IGNORE INTO plans (plan_name, duration_days, collection_type, total_installments)
  // VALUES
  // ('100 Days Daily', 100, 'DAILY', 100),
  // ('50 Days Plan', 50, 'SINGLE', 1),
  // ('90 Days Plan', 90, 'SINGLE', 1),
  // ('16 Weekly Chit', 112, 'WEEKLY', 16);
  //     `);

  await db.query(`
    INSERT IGNORE INTO plans (plan_name, duration_days, collection_type, total_installments)
VALUES 
('100 Days (Daily Collection)', 100, 'DAILY', 100),
('90 Days Plan (Single payment)', 90, 'SINGLE', 1)
    `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS plan_amounts (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================
    -- PLAN
    -- =========================
    plan_id INT NOT NULL,

    -- =========================
    -- AMOUNT
    -- =========================
    installment_amount DECIMAL(12,2) NOT NULL,

    -- =========================
    -- STATUS
    -- =========================
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

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
    -- FOREIGN KEY
    -- =========================
    CONSTRAINT fk_plan_amounts_plan
        FOREIGN KEY (plan_id)
        REFERENCES plans(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- =========================
    -- UNIQUE
    -- Same amount should not be duplicated
    -- inside the same plan
    -- =========================
    UNIQUE KEY unique_plan_amount (
        plan_id,
        installment_amount
    ),

    -- =========================
    -- INDEXES
    -- =========================
    INDEX idx_plan_id (plan_id),
    INDEX idx_installment_amount (installment_amount),
    INDEX idx_plan_active (plan_id, is_active),

    -- =========================
    -- VALIDATION
    -- =========================
    CHECK (installment_amount > 0)

  ) ENGINE=InnoDB;
`);

  // Safe check to add missing columns to pre-existing plan_amounts tables
  const requiredPlanAmountColumns = [
    { name: "is_active", def: "BOOLEAN NOT NULL DEFAULT TRUE" },
    { name: "created_by", def: "INT NULL" },
    { name: "updated_by", def: "INT NULL" },
    { name: "created_at", def: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
    { name: "updated_at", def: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
  ];

  for (const col of requiredPlanAmountColumns) {
    try {
      const [colExists] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'plan_amounts' 
           AND COLUMN_NAME = ?`,
        [col.name]
      );
      if (!colExists.length) {
        await db.query(`ALTER TABLE plan_amounts ADD COLUMN ${col.name} ${col.def}`);
      }
    } catch (err) {
      console.error(`Migration notice for plan_amounts.${col.name}:`, err.message);
    }
  }
};

