export const createBillingAreasTable = async (db) => {
  await db.query(`
        CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,

    status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',

    created_by INT NULL,
    updated_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_area_name (name),
    UNIQUE KEY uq_area_code (code),

    INDEX idx_status (status),

    FOREIGN KEY (created_by) REFERENCES users_roles(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users_roles(id) ON DELETE SET NULL
) ENGINE=InnoDB;
`);
};
