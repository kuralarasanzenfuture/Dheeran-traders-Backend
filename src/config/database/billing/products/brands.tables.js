export const createBrandsTable = async (db) => {
  //   await db.query(`
  //   CREATE TABLE IF NOT EXISTS brands (
  //     id INT AUTO_INCREMENT PRIMARY KEY,
  //     name VARCHAR(100) NOT NULL UNIQUE

  //   ) ENGINE=InnoDB
  // `);

  // soft delete
  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS brands (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   name VARCHAR(100) NOT NULL UNIQUE,

  //   -- ✅ AUDIT FIELDS
  //   created_by INT,
  //   updated_by INT,
  //   deleted_by INT,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP,
  //   deleted_at TIMESTAMP NULL,

  //   -- ✅ OPTIONAL STATUS (better than hard delete)
  //   -- status ENUM('active', 'inactive') DEFAULT 'active',

  //   -- ✅ INDEXES
  //   INDEX idx_created_by (created_by),
  //   INDEX idx_updated_by (updated_by),
  //   INDEX idx_deleted_by (deleted_by)

  // ) ENGINE=InnoDB;
  // `);

  await db.query(`
  CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL UNIQUE,

  created_by INT,
  updated_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_created_by (created_by),
  INDEX idx_updated_by (updated_by)
) ENGINE=InnoDB;
`);
};
