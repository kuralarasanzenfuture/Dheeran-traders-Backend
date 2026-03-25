export const validateUserSession = async (req, res, next) => {
  try {
    const { id, token_version } = req.user;

    const [[user]] = await db.query(`
      SELECT 
        u.id,
        u.status AS user_status,
        u.token_version,
        r.status AS role_status
      FROM users_roles u
      JOIN role_based r ON u.role_id = r.id
      WHERE u.id = ?
    `, [id]);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // 🔴 Token invalidation (logout)
    if (user.token_version !== token_version) {
      return res.status(401).json({
        message: "Session expired. Please login again.",
      });
    }

    // 🔴 User inactive
    if (user.user_status !== "active") {
      return res.status(403).json({
        message: "User is inactive",
      });
    }

    // 🔴 Role inactive
    if (user.role_status !== "active") {
      return res.status(403).json({
        message: "Your role is inactive. Contact admin.",
      });
    }

    next();

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};