/**
 * Utility to generate a meaningful and unique plan_code for investment plans.
 * 
 * Examples:
 *  "Diamond 106 Weekly Plan" -> "INV-DIAMOND-106-01"
 *  "Gold Growth"             -> "INV-GOLD-GROWTH-01"
 *  "Wealth"                  -> "INV-WEALTH-01"
 */

const STOP_WORDS = new Set([
  "A", "AN", "AND", "ARE", "AS", "AT", "BE", "BY", "FOR",
  "FROM", "IN", "IS", "IT", "OF", "ON", "OR", "THAT", "THE",
  "THIS", "TO", "WITH"
]);

/**
 * Creates a slug from plan_name.
 * @param {string} planName 
 * @returns {string} Clean base slug, e.g. "DIAMOND-106"
 */
export const createPlanSlug = (planName) => {
  if (!planName || typeof planName !== "string") {
    return "PLAN";
  }

  // Strip non-alphanumeric characters except spaces
  const cleaned = planName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ");

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "PLAN";
  }

  // Filter common filler words if there are multiple words
  const meaningfulWords = words.filter((w) => !STOP_WORDS.has(w));
  const candidateWords = meaningfulWords.length > 0 ? meaningfulWords : words;

  // Build base from up to 3 meaningful words, capped in total length
  let slug = "";
  for (let i = 0; i < Math.min(candidateWords.length, 3); i++) {
    const word = candidateWords[i].slice(0, 12);
    slug = slug ? `${slug}-${word}` : word;
    if (slug.length >= 25) break;
  }

  return slug.slice(0, 25);
};

/**
 * Generates a unique, meaningful plan code by inspecting existing codes in DB.
 * 
 * @param {string} planName 
 * @param {object} dbOrConnection - MySQL connection or pool
 * @returns {Promise<string>} E.g. "INV-DIAMOND-106-01"
 */
export const generateMeaningfulPlanCode = async (planName, dbOrConnection) => {
  const baseSlug = createPlanSlug(planName);
  const prefix = `INV-${baseSlug}`;

  // Query existing codes matching prefix
  const [rows] = await dbOrConnection.query(
    `SELECT plan_code 
     FROM investment_plans 
     WHERE plan_code LIKE ?
     ORDER BY plan_code ASC`,
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}-01`;
  }

  // Extract existing sequential numbers
  let maxSeq = 0;
  const existingCodes = new Set(rows.map((r) => r.plan_code));

  for (const row of rows) {
    const code = row.plan_code;
    // Check if code matches prefix-NN
    const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${String(nextSeq).padStart(2, "0")}`;

  // Extra safety check: ensure candidate is strictly unique
  let attempt = nextSeq;
  while (existingCodes.has(candidate)) {
    attempt++;
    candidate = `${prefix}-${String(attempt).padStart(2, "0")}`;
  }

  return candidate;
};
