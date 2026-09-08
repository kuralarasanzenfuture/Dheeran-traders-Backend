export const createBatchTables = async (db) => {
  //     await db.query(`
  //                   CREATE TABLE IF NOT EXISTS batches (
  //                           id INT AUTO_INCREMENT PRIMARY KEY,
  //                           batch_name VARCHAR(100) NOT NULL,
  //                           batch_duration INT,
  //                           start_date DATE NOT NULL,
  //                           end_date DATE NOT NULL,
  //                           status ENUM('WAITING','ACTIVE','CLOSED') DEFAULT 'WAITING',
  //                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  //                   )
  //           `);

  await db.query(`
                  CREATE TABLE IF NOT EXISTS batches (
                          id INT AUTO_INCREMENT PRIMARY KEY,
                          batch_name VARCHAR(100) NOT NULL,
                          batch_duration INT,
                          start_date DATE NOT NULL,
                          end_date DATE NOT NULL,
                          created_by INT,
                          updated_by INT,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                          INDEX idx_start_date(start_date),
                          INDEX idx_end_date(end_date)
                  )
          `);

  //   await db.query(`
  //                 CREATE TABLE IF NOT EXISTS batches (
  //   id INT AUTO_INCREMENT PRIMARY KEY,
  //   batch_name VARCHAR(100) NOT NULL,
  //   batch_duration INT,
  //   start_date DATE NOT NULL,
  //   end_date DATE NOT NULL,

  //   status VARCHAR(10)
  //   GENERATED ALWAYS AS (
  //     CASE
  //       WHEN CURDATE() < start_date THEN 'WAITING'
  //       WHEN CURDATE() BETWEEN start_date AND end_date THEN 'ACTIVE'
  //       ELSE 'CLOSED'
  //     END
  //   ) STORED,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  // );
  //         `);
};
