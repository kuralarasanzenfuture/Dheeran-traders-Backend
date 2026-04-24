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
    INDEX idx_total_installments (total_installments),\
    INDEX idx_plan_name (plan_name),
    INDEX idx_duration_days (duration_days)
);
  `);

  await db.query(`
    INSERT IGNORE INTO plans (plan_name, duration_days, collection_type, total_installments)
VALUES 
('100 Days Daily', 100, 'DAILY', 100),
('50 Days Plan', 50, 'SINGLE', 1),
('90 Days Plan', 90, 'SINGLE', 1),
('16 Weekly Chit', 112, 'WEEKLY', 16);
    `);
};
