export const createChitCustomerTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chit_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,

    area_id INT NULL,
    place VARCHAR(100),

    aadhar VARCHAR(12) UNIQUE,
    pan_number VARCHAR(10) UNIQUE,

    door_no VARCHAR(20),
    address TEXT,

    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ✅ Proper constraints
    UNIQUE KEY unique_phone (phone),
    UNIQUE KEY unique_aadhar (aadhar),
    UNIQUE KEY unique_pan (pan_number),

    -- ✅ Indexes for search performance
    INDEX idx_name (name),
    INDEX idx_phone (phone),
    INDEX idx_area_id (area_id),
    INDEX idx_aadhar (aadhar),
    INDEX idx_pan (pan_number),
    INDEX idx_location (state, district, pincode),

    -- ✅ Foreign Keys
    CONSTRAINT fk_chit_customers_area
      FOREIGN KEY (area_id)
      REFERENCES areas(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    CONSTRAINT fk_chit_customers_created_by
      FOREIGN KEY (created_by)
      REFERENCES users_roles(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE,

    CONSTRAINT fk_chit_customers_updated_by
      FOREIGN KEY (updated_by)
      REFERENCES users_roles(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
);
    `);

  // Safe check to add missing columns to pre-existing chit_customers table
  const requiredColumns = [
    { name: "area_id", def: "INT NULL" },
    { name: "place", def: "VARCHAR(100) NULL" },
    { name: "door_no", def: "VARCHAR(20) NULL" },
    { name: "address", def: "TEXT NULL" },
    { name: "state", def: "VARCHAR(100) NULL" },
    { name: "district", def: "VARCHAR(100) NULL" },
    { name: "pincode", def: "VARCHAR(10) NULL" },
    { name: "created_by", def: "INT NULL" },
    { name: "updated_by", def: "INT NULL" },
  ];

  for (const col of requiredColumns) {
    try {
      const [colExists] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chit_customers' AND COLUMN_NAME = ?`,
        [col.name],
      );
      if (!colExists.length) {
        await db.query(
          `ALTER TABLE chit_customers ADD COLUMN ${col.name} ${col.def}`,
        );
      }
    } catch (err) {
      console.error(
        `Migration notice for chit_customers.${col.name}:`,
        err.message,
      );
    }
  }

  // Safe check for area_id index
  try {
    const [idxExists] = await db.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chit_customers' AND INDEX_NAME = 'idx_area_id'`,
    );
    if (!idxExists.length) {
      await db.query(
        `ALTER TABLE chit_customers ADD INDEX idx_area_id (area_id)`,
      );
    }
  } catch (err) {
    console.error(
      "Migration notice for chit_customers.idx_area_id:",
      err.message,
    );
  }

  // Safe check for fk_chit_customers_area foreign key constraint
  try {
    const [fkExists] = await db.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chit_customers' AND CONSTRAINT_NAME = 'fk_chit_customers_area'`,
    );
    if (!fkExists.length) {
      const [areasTable] = await db.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'areas'`,
      );
      if (areasTable.length) {
        await db.query(
          `ALTER TABLE chit_customers 
           ADD CONSTRAINT fk_chit_customers_area 
           FOREIGN KEY (area_id) REFERENCES areas(id) 
           ON DELETE SET NULL ON UPDATE CASCADE`,
        );
      }
    }
  } catch (err) {
    console.error(
      "Migration notice for chit_customers.fk_chit_customers_area:",
      err.message,
    );
  }
};
