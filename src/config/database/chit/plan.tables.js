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

  await db.query(`
        CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    duration_days INT NOT NULL,
    collection_type ENUM('DAILY','WEEKLY','MONTHLY','SINGLE') NOT NULL,
    total_installments INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )

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
