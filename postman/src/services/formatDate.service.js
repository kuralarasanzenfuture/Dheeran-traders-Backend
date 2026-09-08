const formatDate = (date) => {
  if (!date) return null;

  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof date === "string") {
    return date;
  }

  return null;
};

export default formatDate;