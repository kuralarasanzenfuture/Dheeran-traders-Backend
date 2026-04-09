export const createAuditsTable = async (db) => {
//   await db.query(`
//         CREATE TABLE IF NOT EXISTS audit_logs (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   table_name VARCHAR(100) NOT NULL,
//   record_id INT NOT NULL,

//   action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,

//   old_data JSON,
//   new_data JSON,

//   changed_by INT,
//   changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//   INDEX idx_table_record (table_name, record_id),
//   INDEX idx_user (changed_by)
// );
//     `);

// ALTER TABLE audit_logs
// ADD COLUMN remarks VARCHAR(255) NULL;


await db.query(`
  CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,

  table_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,

  action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,

  old_data JSON,
  new_data JSON,

  changed_by INT,

  remarks TEXT, -- ✅ WHY change happened

  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_table_record (table_name, record_id),
  INDEX idx_user (changed_by)
);
  `);

};
