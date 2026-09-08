export const createAgentAndStaffTables = async (db) => {
  //   await db.query(`
  //                 CREATE TABLE IF NOT EXISTS chit_agent_and_staff (
  //                         id INT AUTO_INCREMENT PRIMARY KEY,
  //                         name VARCHAR(100) NOT NULL,
  //                         phone VARCHAR(20) NOT NULL UNIQUE,
  //                         reference_mode VARCHAR(100) NOT NULL,
  //                         no_of_referals INT DEFAULT 0,
  //                         status ENUM('active','inactive') DEFAULT 'active',
  //                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  //                 )
  //         `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chit_agent_and_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    reference_mode ENUM('AGENT','STAFF') NOT NULL,
    no_of_referals INT DEFAULT 0,

    status ENUM('active','inactive') DEFAULT 'active',

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ✅ Constraints
    UNIQUE KEY unique_phone (phone),

    -- ✅ Indexes (important for scaling)
    INDEX idx_name (name),
    INDEX idx_phone (phone),
    INDEX idx_mode (reference_mode),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
`);
};
