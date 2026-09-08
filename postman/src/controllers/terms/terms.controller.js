import db from "../../config/db.js";

export const createTerms = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { version, title, points } = req.body;

    if (!version || !Array.isArray(points) || points.length === 0) {
      throw new Error("Version and points are required");
    }

    // 🔴 deactivate old terms
    await conn.query(`UPDATE terms SET is_active = FALSE`);

    // 🔴 insert new terms
    const [result] = await conn.query(
      `INSERT INTO terms (version, title) VALUES (?, ?)`,
      [version, title || null]
    );

    const terms_id = result.insertId;

    // 🔴 insert points
    const values = points.map((p, index) => [
      terms_id,
      p.point_order || index + 1,
      p.content,
      p.is_mandatory ?? true,
    ]);

    await conn.query(
      `INSERT INTO terms_points (terms_id, point_order, content, is_mandatory)
       VALUES ?`,
      [values]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Terms created successfully",
      data: { terms_id },
    });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

export const getActiveTerms = async (req, res) => {
  try {
    const [[terms]] = await db.query(
      `SELECT * FROM terms WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`
    );

    if (!terms) {
      return res.json({ success: true, data: null });
    }

    const [points] = await db.query(
      `SELECT id, point_order, content, is_mandatory
       FROM terms_points
       WHERE terms_id = ?
       ORDER BY point_order ASC`,
      [terms.id]
    );

    res.json({
      success: true,
      data: {
        ...terms,
        points,
      },
    });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const acceptTerms = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { terms_id } = req.body;

    if (!user_id) throw new Error("Unauthorized");
    if (!terms_id) throw new Error("terms_id required");

    await db.query(
      `INSERT INTO user_terms_acceptance 
       (user_id, terms_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?)`,
      [
        user_id,
        terms_id,
        req.ip || null,
        req.headers["user-agent"] || null,
      ]
    );

    res.json({
      success: true,
      message: "Terms accepted",
    });

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.json({
        success: true,
        message: "Already accepted",
      });
    }

    res.status(400).json({ success: false, message: err.message });
  }
};

export const checkTermsStatus = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) throw new Error("Unauthorized");

    const [[terms]] = await db.query(
      `SELECT id FROM terms WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`
    );

    if (!terms) {
      return res.json({ success: true, accepted: true });
    }

    const [[accepted]] = await db.query(
      `SELECT id FROM user_terms_acceptance
       WHERE user_id = ? AND terms_id = ?`,
      [user_id, terms.id]
    );

    res.json({
      success: true,
      accepted: !!accepted,
      terms_id: terms.id,
    });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};