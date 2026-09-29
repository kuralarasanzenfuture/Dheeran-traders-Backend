/**
 * Utility for generating investment interest schedules upfront.
 * 
 * Rules:
 *  - lock_in_end_date = investment_date + lock_in_days
 *  - interest_start_date >= lock_in_end_date (defaults to lock_in_end_date)
 *  - Schedules generated for total_installments (default 52 weeks / 1 year)
 *  - Installment 1: interest_start_date
 *  - Installment 2: interest_start_date + 7 days
 *  - ...
 *  - Installment 52: interest_start_date + (52 - 1) * 7 days
 */

/**
 * Format a Date object or date string into strict YYYY-MM-DD without timezone shifts.
 * @param {Date|string} date 
 * @returns {string} YYYY-MM-DD
 */
export const formatDateOnly = (date) => {
  if (!date) return null;
  if (typeof date === "string") {
    // If it's already YYYY-MM-DD, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it has ISO time, extract date portion
    if (date.includes("T")) {
      return date.split("T")[0];
    }
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Adds a specific number of days to a YYYY-MM-DD date string.
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {number} days 
 * @returns {string} 'YYYY-MM-DD'
 */
export const addDaysToDateStr = (dateStr, days) => {
  const cleanDateStr = formatDateOnly(dateStr);
  const [y, m, d] = cleanDateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Number(days));

  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Generates the full 52-week interest schedule upfront for an investment subscription.
 * 
 * @param {object} params
 * @param {number} params.subscriptionId
 * @param {string} params.interestStartDate - 'YYYY-MM-DD'
 * @param {number} [params.totalInstallments=52]
 * @param {number} [params.weeklyInterestAmount=0.00]
 * @param {number|null} [params.createdBy=null]
 * 
 * @returns {{ schedules: Array, valuesForInsert: Array, interestEndDate: string }}
 */
export const generateFullInterestSchedule = ({
  subscriptionId,
  interestStartDate,
  totalInstallments = 52,
  weeklyInterestAmount = 0.0,
  createdBy = null,
}) => {
  const start = formatDateOnly(interestStartDate);
  const total = Number(totalInstallments) || 52;
  const amount = Number(Number(weeklyInterestAmount || 0).toFixed(2));

  const schedules = [];
  const valuesForInsert = [];

  for (let i = 1; i <= total; i++) {
    const daysToAdd = (i - 1) * 7;
    const dueDate = addDaysToDateStr(start, daysToAdd);

    schedules.push({
      subscription_id: subscriptionId,
      installment_no: i,
      interest_due_date: dueDate,
      interest_amount: amount,
      status: "PENDING",
      paid_amount: 0.0,
      created_by: createdBy,
    });

    valuesForInsert.push([
      subscriptionId,
      i,
      dueDate,
      amount,
      "PENDING",
      0.0,
      createdBy,
    ]);
  }

  const interestEndDate = schedules[schedules.length - 1].interest_due_date;

  return {
    schedules,
    valuesForInsert,
    interestEndDate,
  };
};
