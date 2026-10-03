/**
 * Monthly Investment Schedule Generator
 * Production rules for monthly investment subscriptions and interest schedules.
 */

/**
 * Formats date into YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string} YYYY-MM-DD
 */
export const formatDateOnly = (date) => {
  if (!date) return null;
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.includes("T")) {
      return trimmed.split("T")[0];
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, "0");
      const month = dmyMatch[2].padStart(2, "0");
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return null;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Returns number of days in a given year and month (1-indexed month: 1=Jan, 12=Dec)
 * @param {number} year
 * @param {number} month (1-12)
 * @returns {number}
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * Parses and returns sorted unique allowed schedule days (1-31)
 * @param {string|Array<number>} allowedDaysInput
 * @returns {number[]} sorted ascending e.g. [1, 5, 10, 15, 20, 25, 30]
 */
export const parseAllowedDays = (allowedDaysInput) => {
  const DEFAULT_DAYS = [1, 5, 10, 15, 20, 25, 30];
  if (!allowedDaysInput) return DEFAULT_DAYS;

  let rawDays = [];
  if (Array.isArray(allowedDaysInput)) {
    rawDays = allowedDaysInput;
  } else if (typeof allowedDaysInput === "string") {
    rawDays = allowedDaysInput.split(",").map((s) => parseInt(s.trim(), 10));
  } else {
    return DEFAULT_DAYS;
  }

  const valid = rawDays
    .map(Number)
    .filter((n) => !isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 31);

  if (valid.length === 0) return DEFAULT_DAYS;

  return Array.from(new Set(valid)).sort((a, b) => a - b);
};

/**
 * Determines the first interest schedule date based on joining date and plan allowed days.
 *
 * Rule:
 * - Find smallest allowed_day >= joining_date.day in the same month.
 * - If found and valid in that month -> that date.
 * - Otherwise -> first allowed day of next month.
 *
 * @param {string|Date} subscriptionStartDate
 * @param {string|Array<number>} allowedDaysInput
 * @returns {string} YYYY-MM-DD
 */
export const calculateFirstScheduleDate = (
  subscriptionStartDate,
  allowedDaysInput = [1, 5, 10, 15, 20, 25, 30]
) => {
  const cleanStartDate = formatDateOnly(subscriptionStartDate);
  if (!cleanStartDate) {
    throw new Error("Invalid subscription start date");
  }

  const allowedDays = parseAllowedDays(allowedDaysInput);
  const [startYear, startMonth, startDay] = cleanStartDate
    .split("-")
    .map(Number);

  // Candidate: smallest allowed_day >= startDay
  const candidateDay = allowedDays.find((d) => d >= startDay);
  const maxDaysInStartMonth = getDaysInMonth(startYear, startMonth);

  if (candidateDay !== undefined && candidateDay <= maxDaysInStartMonth) {
    const mm = String(startMonth).padStart(2, "0");
    const dd = String(candidateDay).padStart(2, "0");
    return `${startYear}-${mm}-${dd}`;
  }

  // Otherwise, move to next month's first allowed day
  let nextMonth = startMonth + 1;
  let nextYear = startYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const firstAllowedDay = allowedDays[0];
  const mm = String(nextMonth).padStart(2, "0");
  const dd = String(firstAllowedDay).padStart(2, "0");
  return `${nextYear}-${mm}-${dd}`;
};

/**
 * Generates the complete array of monthly interest schedules upfront.
 *
 * Production Rules:
 * 1. Plan end date is the hard boundary (schedule_date <= plan_end_date).
 * 2. First schedule date determines the recurring schedule day.
 * 3. Calendar validity: If recurring day does not exist in a month (e.g. Feb 30),
 *    roll to next nearest valid configured schedule date (e.g. March 01).
 * 4. Generates all schedules immediately without waiting for cron.
 *
 * @param {Object} options
 * @param {string} options.subscriptionStartDate - 'YYYY-MM-DD'
 * @param {string} options.planEndDate - 'YYYY-MM-DD'
 * @param {string|Array<number>} [options.allowedDays]
 * @param {number} [options.totalMonthlyInterestAmount=0]
 * @returns {Array<Object>} List of schedule objects
 */
export const generateMonthlyInterestSchedules = ({
  subscriptionStartDate,
  planEndDate,
  allowedDays = [1, 5, 10, 15, 20, 25, 30],
  totalMonthlyInterestAmount = 0,
}) => {
  const cleanStartDate = formatDateOnly(subscriptionStartDate);
  const cleanEndDate = formatDateOnly(planEndDate);

  if (!cleanStartDate || !cleanEndDate) {
    throw new Error("Both subscriptionStartDate and planEndDate are required in YYYY-MM-DD format");
  }

  if (cleanStartDate > cleanEndDate) {
    throw new Error(
      `subscriptionStartDate (${cleanStartDate}) cannot be after planEndDate (${cleanEndDate})`
    );
  }

  const parsedDays = parseAllowedDays(allowedDays);
  const firstDueDate = calculateFirstScheduleDate(cleanStartDate, parsedDays);

  // If first schedule falls after plan end date, no schedules can be created
  if (firstDueDate > cleanEndDate) {
    return [];
  }

  const recurringDay = Number(firstDueDate.split("-")[2]);
  const [firstYear, firstMonth] = firstDueDate.split("-").map(Number);
  const [endYear, endMonth] = cleanEndDate.split("-").map(Number);

  // Calculate total calendar months span from first schedule month to plan end month
  const totalMonthsSpan = (endYear - firstYear) * 12 + (endMonth - firstMonth);

  const schedules = [];
  const todayStr = formatDateOnly(new Date());

  let previousPeriodEnd = cleanStartDate;
  const seenDueDates = new Set();

  for (let m = 0; m <= totalMonthsSpan; m++) {
    let targetMonth = firstMonth + m;
    let targetYear = firstYear;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    const maxDays = getDaysInMonth(targetYear, targetMonth);
    let dueDateStr;

    if (recurringDay <= maxDays) {
      const mm = String(targetMonth).padStart(2, "0");
      const dd = String(recurringDay).padStart(2, "0");
      dueDateStr = `${targetYear}-${mm}-${dd}`;
    } else {
      // Recurring day does not exist in target month (e.g. Feb 30).
      // Rule 7: Next nearest valid configured schedule date (e.g. March 01).
      let rollMonth = targetMonth + 1;
      let rollYear = targetYear;
      if (rollMonth > 12) {
        rollMonth = 1;
        rollYear += 1;
      }
      const firstAllowed = parsedDays[0];
      const mm = String(rollMonth).padStart(2, "0");
      const dd = String(firstAllowed).padStart(2, "0");
      dueDateStr = `${rollYear}-${mm}-${dd}`;
    }

    // Hard boundary check: never create schedule after plan_end_date
    if (dueDateStr > cleanEndDate) {
      break;
    }

    // Ensure due date is strictly >= subscription start date
    if (dueDateStr < cleanStartDate) {
      continue;
    }

    // Idempotency / Duplicate protection: ensure unique due date per subscription
    if (seenDueDates.has(dueDateStr)) {
      continue;
    }
    seenDueDates.add(dueDateStr);

    const interestNo = schedules.length + 1;
    const periodStartDate = previousPeriodEnd;
    const periodEndDate = dueDateStr;

    // Status is DUE if due date is today or in the past, otherwise PENDING
    const status = dueDateStr <= todayStr ? "DUE" : "PENDING";

    schedules.push({
      interest_no: interestNo,
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      interest_due_date: dueDateStr,
      interest_amount: Number(Number(totalMonthlyInterestAmount).toFixed(2)),
      paid_amount: 0.0,
      pending_amount: Number(Number(totalMonthlyInterestAmount).toFixed(2)),
      status,
    });

    previousPeriodEnd = periodEndDate;
  }

  return schedules;
};

/**
 * Auto-generates a unique subscription number: MIS-YYYYMM-XXXX
 * @param {Object} connection - MySQL db connection or pool
 * @returns {Promise<string>}
 */
export const generateMonthlySubscriptionNo = async (connection) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `MIS-${year}${month}`;

  const [rows] = await connection.query(
    `SELECT subscription_no 
     FROM monthly_investment_subscriptions 
     WHERE subscription_no LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}-%`]
  );

  let nextSequence = 1;
  if (rows.length > 0 && rows[0].subscription_no) {
    const parts = rows[0].subscription_no.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  return `${prefix}-${String(nextSequence).padStart(4, "0")}`;
};
