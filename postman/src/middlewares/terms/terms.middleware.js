export const enforceTermsAccepted = async (req, res, next) => {
  try {
    const user_id = req.user?.id;

    const [[terms]] = await db.query(
      `SELECT id FROM terms WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`
    );

    if (!terms) return next();

    const [[accepted]] = await db.query(
      `SELECT id FROM user_terms_acceptance
       WHERE user_id = ? AND terms_id = ?`,
      [user_id, terms.id]
    );

    if (!accepted) {
      return res.status(403).json({
        success: false,
        require_terms_acceptance: true,
        terms_id: terms.id,
        message: "You must accept terms first",
      });
    }

    next();

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};