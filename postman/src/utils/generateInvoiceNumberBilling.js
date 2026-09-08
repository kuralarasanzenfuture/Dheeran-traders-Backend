
export const generateInvoiceNumber = async (db) => {
  const now = new Date();

  let startYear = now.getFullYear();

  // Handle financial year (Apr–Mar)
  if (now.getMonth() < 3) {
    startYear = startYear - 1;
  }

  const shortStartYear = startYear.toString().slice(-2); // "26"
  const shortEndYear = (startYear + 1).toString().slice(-2); // "27"

  const financialYear = `${shortStartYear}-${shortEndYear}`;

  const [rows] = await db.query(
    `SELECT invoice_number 
     FROM customerBilling 
     WHERE invoice_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`INV/${financialYear}/%`],
  );

  let next = 1;

  if (rows.length) {
    next = parseInt(rows[0].invoice_number.split("/")[2]) + 1;
  }

  return `INV/${financialYear}/${String(next).padStart(4, "0")}`;
};