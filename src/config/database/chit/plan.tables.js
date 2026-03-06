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
    plan_name VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL,
    collection_type ENUM('DAILY','WEEKLY','MONTHLY','SINGLE') NOT NULL,
    total_installments INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    `);
};
