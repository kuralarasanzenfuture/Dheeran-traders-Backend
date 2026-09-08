export const createCustomerTables = async (db) => {
  //   await db.query(`
  //       CREATE TABLE IF NOT EXISTS customers (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   first_name VARCHAR(100) NOT NULL,
  //   last_name VARCHAR(100),

  //   phone VARCHAR(20) NOT NULL UNIQUE,
  //   email VARCHAR(150) UNIQUE,

  //   address TEXT,

  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP
  // ) ENGINE=InnoDB;
  //     `);

  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS customers (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   first_name VARCHAR(100) NOT NULL,
  //   last_name VARCHAR(100),

  //   phone VARCHAR(20) NOT NULL UNIQUE,
  //   email VARCHAR(150) UNIQUE,

  //   address TEXT,

  //   -- ✅ AUDIT LINKING (important for tracking)
  //   created_by INT,
  //   updated_by INT,

  //   -- ✅ TIMESTAMPS
  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP,

  //   -- ✅ UNIQUE CONSTRAINTS
  //   UNIQUE KEY uq_customers_phone (phone),
  //   UNIQUE KEY uq_customers_email (email),

  //   -- ✅ INDEXES (for performance)
  //   INDEX idx_phone (phone),
  //   INDEX idx_email (email),
  //   INDEX idx_created_by (created_by),

  //   -- ✅ FOREIGN KEY (optional but recommended)
  //   CONSTRAINT fk_customers_created_by
  //     FOREIGN KEY (created_by)
  //     REFERENCES users_roles(id)
  //     ON DELETE SET NULL
  //     ON UPDATE CASCADE,

  //   CONSTRAINT fk_customers_updated_by
  //     FOREIGN KEY (updated_by)
  //     REFERENCES users_roles(id)
  //     ON DELETE SET NULL
  //     ON UPDATE CASCADE

  // ) ENGINE=InnoDB;
  //     `);
  // add feild area
  //     await db.query(`
  //   CREATE TABLE IF NOT EXISTS customers (
  //   id INT AUTO_INCREMENT PRIMARY KEY,

  //   first_name VARCHAR(100) NOT NULL,
  //   last_name VARCHAR(100),

  //   phone VARCHAR(20) NOT NULL UNIQUE,
  //   email VARCHAR(150) UNIQUE,

  //   place VARCHAR(100),

  //   address TEXT,

  //   -- ✅ AUDIT LINKING (important for tracking)
  //   created_by INT,
  //   updated_by INT,

  //   -- ✅ TIMESTAMPS
  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     ON UPDATE CURRENT_TIMESTAMP,

  //   -- ✅ UNIQUE CONSTRAINTS
  //   UNIQUE KEY uq_customers_phone (phone),
  //   UNIQUE KEY uq_customers_email (email),

  //   -- ✅ INDEXES (for performance)
  //   INDEX idx_phone (phone),
  //   INDEX idx_email (email),
  //   INDEX idx_created_by (created_by),
  //   INDEX idx_updated_by (updated_by),
  //   INDEX idx_place (place),

  //   -- ✅ FOREIGN KEY (optional but recommended)
  //   CONSTRAINT fk_customers_created_by
  //     FOREIGN KEY (created_by)
  //     REFERENCES users_roles(id)
  //     ON DELETE SET NULL
  //     ON UPDATE CASCADE,

  //   CONSTRAINT fk_customers_updated_by
  //     FOREIGN KEY (updated_by)
  //     REFERENCES users_roles(id)
  //     ON DELETE SET NULL
  //     ON UPDATE CASCADE

  // ) ENGINE=InnoDB;
  //     `);

  /*------------------------------------------------------*/
  await db.query(`
  CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- =========================
    -- CUSTOMER NAME
    -- =========================
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),

    -- =========================
    -- CONTACT DETAILS
    -- =========================
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),

    -- =========================
    -- ADDRESS
    -- =========================
    address VARCHAR(255),

    place VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',

    -- =========================
    -- GEO LOCATION
    -- =========================
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    google_maps_url VARCHAR(500),

    location_updated_at TIMESTAMP NULL,

    -- =========================
    -- AUDIT
    -- =========================
    created_by INT,
    updated_by INT,

    -- =========================
    -- TIMESTAMPS
    -- =========================
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- =========================
    -- CONSTRAINTS
    -- =========================
    UNIQUE KEY uq_customers_phone (phone),
    UNIQUE KEY uq_customers_email (email),

    -- =========================
    -- INDEXES
    -- =========================
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_place (place),
    INDEX idx_district (district),
    INDEX idx_state (state),
    INDEX idx_pincode (pincode),
    INDEX idx_created_by (created_by),
    INDEX idx_updated_by (updated_by),
    INDEX idx_location (latitude, longitude),

    -- =========================
    -- FOREIGN KEYS
    -- =========================
    CONSTRAINT fk_customers_created_by
        FOREIGN KEY (created_by)
        REFERENCES users_roles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_customers_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users_roles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB;
    `);

  // Safe check to add missing columns to pre-existing customers tables
  const requiredColumns = [
    { name: "place", def: "VARCHAR(100) NULL" },
    { name: "district", def: "VARCHAR(100) NULL" },
    { name: "state", def: "VARCHAR(100) NULL" },
    { name: "pincode", def: "VARCHAR(10) NULL" },
    { name: "country", def: "VARCHAR(100) DEFAULT 'India'" },
    { name: "latitude", def: "DECIMAL(10,8) NULL" },
    { name: "longitude", def: "DECIMAL(11,8) NULL" },
    { name: "google_maps_url", def: "VARCHAR(500) NULL" },
    { name: "location_updated_at", def: "TIMESTAMP NULL" },
    { name: "created_by", def: "INT NULL" },
    { name: "updated_by", def: "INT NULL" },
  ];

  for (const col of requiredColumns) {
    try {
      const [colExists] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = ?`,
        [col.name]
      );
      if (!colExists.length) {
        await db.query(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.def}`);
      }
    } catch (err) {
      console.error(`Migration notice for customers.${col.name}:`, err.message);
    }
  }
};

