// utils/auditService.js

export const AuditLog = async ({
  connection,
  table,
  recordId,
  action,
  oldData = null,
  newData = null,
  userId = null,
  remarks = null
}) => {

  if (!connection) throw new Error("DB connection required");
  if (!table) throw new Error("table is required");
  if (!recordId) throw new Error("recordId is required");
  if (!action) throw new Error("action is required");

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

// await AuditLog({
//       connection,
//       table: "plans",
//       recordId: result.insertId,
//       action: "INSERT",
//       newData: newPlan[0],
//       userId: userId,
//       remarks: "Plan created",
//     });

// --------------------------------------------------------
// export const AuditLog = async (connection, {
//   table_name,
//   record_id,
//   action,
//   old_data = null,
//   new_data = null,
//   changed_by = null,
//   remarks = null
// }) => {
//   await connection.query(
//     `INSERT INTO audit_logs 
//     (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//     VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [
//       table_name,
//       record_id,
//       action,
//       old_data ? JSON.stringify(old_data) : null,
//       new_data ? JSON.stringify(new_data) : null,
//       changed_by,
//       remarks
//     ]
//   );
// };

// // ✅ AUDIT
//     await logAudit(connection, {
//       table_name: "plans",
//       record_id: result.insertId,
//       action: "INSERT",
//       new_data: newPlan[0],
//       changed_by: userId,
//       remarks: "Plan created"
//     });