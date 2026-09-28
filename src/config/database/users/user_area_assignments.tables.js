export const createUserAreaAssignmentsTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_area_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,

      user_id INT NOT NULL,
      area_id INT NOT NULL,

      assigned_by INT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_by INT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      is_active BOOLEAN NOT NULL DEFAULT TRUE,

      UNIQUE KEY uq_user_area (
        user_id,
        area_id
      ),

      FOREIGN KEY (user_id)
        REFERENCES users_roles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      FOREIGN KEY (area_id)
        REFERENCES areas(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      FOREIGN KEY (assigned_by)
        REFERENCES users_roles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      FOREIGN KEY (updated_by)
        REFERENCES users_roles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      INDEX idx_user_id (user_id),
      INDEX idx_area_id (area_id),
      INDEX idx_user_active (
        user_id,
        is_active
      ),
      INDEX idx_area_active (
        area_id,
        is_active
      )
    ) ENGINE=InnoDB;
  `);

  // Safe checks for pre-existing tables if any migrations needed
  try {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_area_assignments' AND COLUMN_NAME = 'is_active'`,
    );
    if (!cols.length) {
      await db.query(
        `ALTER TABLE user_area_assignments ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE`,
      );
    }
  } catch (err) {
    console.error("Migration notice for user_area_assignments.is_active:", err.message);
  }
};
