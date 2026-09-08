// utils/withAudit.js

import { createAuditLog } from "../services/audit.service.js";

export const withAudit = async ({
  connection,
  table,
  id,
  action,
  userId,
  remarks,
  getOldData,
  operation,
  getNewData
}) => {

  // 🔹 Get old state
  const oldData = getOldData ? await getOldData() : null;

  // 🔹 Run actual DB operation
  const result = await operation();

  // 🔹 Get new state (if needed)
  const newData = getNewData ? await getNewData() : null;

  // 🔹 Log audit
  await createAuditLog({
    connection,
    table,
    recordId: id,
    action,
    oldData,
    newData,
    userId,
    remarks
  });

  return result;
};