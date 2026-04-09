// utils/auditLogger.js
export const logAudit = async ({
  connection,
  table,
  recordId,
  action,
  oldData = null,
  newData = null,
  userId,
  remarks
}) => {
  await connection.query(
    `INSERT INTO audit_logs 
    (table_name, record_id, action, old_data, new_data, changed_by, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      table,
      recordId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      userId,
      remarks
    ]
  );
};