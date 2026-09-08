import db from "../../config/db.js";

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `SELECT u.id,r.role_name
       FROM users_roles u
       JOIN role_based r
       ON u.role_id=r.id
       WHERE u.id=?`,
      [id],
    );

    if (!users.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (users[0].role_name === "ADMIN") {
      return res.status(403).json({
        message: "ADMIN cannot be deleted",
      });
    }

    await db.query(`DELETE FROM users_roles WHERE id=?`, [id]);

    res.json({
      message: "User deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
