
export const generateInstallments = ({
  subscriptionId,
  startDate,
  totalInstallments,
  collectionType,
  installmentAmount,
}) => {
  let dueDate = new Date(startDate);
  const rows = [];

  for (let i = 1; i <= totalInstallments; i++) {
    rows.push([
      subscriptionId,
      i,
      new Date(dueDate),
      installmentAmount,
    ]);

    if (collectionType === "DAILY") {
      dueDate.setDate(dueDate.getDate() + 1);
    } else if (collectionType === "WEEKLY") {
      dueDate.setDate(dueDate.getDate() + 7);
    } else if (collectionType === "MONTHLY") {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
  }

  return rows;
};