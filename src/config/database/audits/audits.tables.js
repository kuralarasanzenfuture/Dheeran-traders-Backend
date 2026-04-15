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
  INDEX idx_version (table_name, record_id, changed_at),
  INDEX idx_action (action),
  INDEX idx_user (changed_by),
  INDEX idx_changed_at (changed_at)

);
  `);

};

// {
// CREATE TABLE audit_logs (
//     id BIGINT AUTO_INCREMENT PRIMARY KEY,

//     table_name VARCHAR(100) NOT NULL,
//     record_id BIGINT NOT NULL,

//     action ENUM('INSERT','UPDATE','DELETE') NOT NULL,

//     old_data JSON,
//     new_data JSON,

//     version INT NOT NULL,  -- 🔥 IMPORTANT

//     changed_fields JSON,   -- optional diff tracking

//     performed_by INT NULL,

//     remarks TEXT,

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     INDEX idx_table_record (table_name, record_id),
//     INDEX idx_version (table_name, record_id, version),
//     INDEX idx_created_at (created_at)
// );

// const getNextVersion = async (connection, table, recordId) => {
//   const [[row]] = await connection.query(
//     `SELECT COALESCE(MAX(version),0)+1 as nextVersion
//      FROM audit_logs
//      WHERE table_name=? AND record_id=?`,
//     [table, recordId]
//   );

//   return row.nextVersion;
// };

// export const AuditLog = async ({
//   connection,
//   table,
//   recordId,
//   action,
//   oldData = null,
//   newData = null,
//   userId = null,
//   remarks = null,
// }) => {

//   const version = await getNextVersion(connection, table, recordId);

//   // 🔥 track only changed fields (optional but powerful)
//   let changedFields = null;

//   if (oldData && newData) {
//     changedFields = {};

//     for (const key in newData) {
//       if (oldData[key] !== newData[key]) {
//         changedFields[key] = {
//           old: oldData[key],
//           new: newData[key],
//         };
//       }
//     }
//   }

//   await connection.query(
//     `INSERT INTO audit_logs
//     (table_name, record_id, action, old_data, new_data, version, changed_fields, performed_by, remarks)
//     VALUES (?,?,?,?,?,?,?,?,?)`,
//     [
//       table,
//       recordId,
//       action,
//       oldData ? JSON.stringify(oldData) : null,
//       newData ? JSON.stringify(newData) : null,
//       version,
//       changedFields ? JSON.stringify(changedFields) : null,
//       userId,
//       remarks,
//     ]
//   );
// };

// export const replayRecord = async ({
//   table,
//   recordId,
//   uptoVersion = null,
//   uptoTime = null,
// }) => {

//   let condition = "";
//   let params = [table, recordId];

//   if (uptoVersion) {
//     condition = "AND version <= ?";
//     params.push(uptoVersion);
//   }

//   if (uptoTime) {
//     condition = "AND created_at <= ?";
//     params.push(uptoTime);
//   }

//   const [logs] = await db.query(
//     `SELECT * FROM audit_logs
//      WHERE table_name=? AND record_id=?
//      ${condition}
//      ORDER BY version ASC`,
//     params
//   );

//   if (logs.length === 0) return null;

//   let state = {};

//   for (const log of logs) {
//     const newData = log.new_data ? JSON.parse(log.new_data) : null;

//     if (log.action === "INSERT") {
//       state = { ...newData };
//     }

//     else if (log.action === "UPDATE") {
//       state = { ...state, ...newData };
//     }

//     else if (log.action === "DELETE") {
//       state = null;
//     }
//   }

//   return state;
// };

// export const getSubscriptionAtVersion = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { version, datetime } = req.query;

//     const data = await replayRecord({
//       table: "chit_customer_subscriptions",
//       recordId: id,
//       uptoVersion: version ? Number(version) : null,
//       uptoTime: datetime || null,
//     });

//     if (!data) {
//       return res.status(404).json({
//         success: false,
//         message: "No data found at this version/time",
//       });
//     }

//     res.json({
//       success: true,
//       data,
//     });

//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// CREATE TABLE audit_snapshots (
//     id BIGINT AUTO_INCREMENT PRIMARY KEY,
//     table_name VARCHAR(100),
//     record_id BIGINT,
//     version INT,
//     snapshot_data JSON,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     INDEX idx_snapshot (table_name, record_id, version)
// );
// }