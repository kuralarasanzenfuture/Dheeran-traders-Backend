import { connect } from "socket.io-client";
import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

// export const createGST = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const userId = req.user?.id;
//     if (!userId) throw new Error("Unauthorized");

//     let { gst_number, is_default = false } = req.body;

//     if (!gst_number) throw new Error("GST number required");

//     gst_number = gst_number.toUpperCase().trim();

//     if (!GST_REGEX.test(gst_number)) {
//       throw new Error("Invalid GST format");
//     }

//     is_default = is_default === true || is_default === "true";

//     /* 🔍 Duplicate check */
//     const [exists] = await conn.query(
//       `SELECT id FROM company_gst_number WHERE gst_number=?`,
//       [gst_number]
//     );

//     if (exists.length) throw new Error("GST already exists");

//     /* 🔒 Lock default row */
//     const [[row]] = await conn.query(
//       `SELECT COUNT(*) as count
//        FROM company_gst_number
//        WHERE is_default=1 FOR UPDATE`
//     );

//     // If no default exists → force default
//     if (row.count === 0) {
//       is_default = true;
//     }

//     // If new default → remove old one
//     if (is_default) {
//       await conn.query(
//         `UPDATE company_gst_number SET is_default=0`
//       );
//     }

//     const [result] = await conn.query(
//       `INSERT INTO company_gst_number
//        (gst_number, is_default, created_by)
//        VALUES (?, ?, ?)`,
//       [gst_number, is_default ? 1 : 0, userId]
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "GST created",
//       id: result.insertId,
//       is_default,
//     });

//   } catch (err) {
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const createGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    let { gst_number, remarks } = req.body;

    if (!gst_number) throw new Error("GST number required");

    gst_number = gst_number.toUpperCase().trim();

    if (!GST_REGEX.test(gst_number)) {
      throw new Error("Invalid GST format");
    }

    /* 🔍 Duplicate check */
    const [exists] = await conn.query(
      `SELECT id FROM company_gst_number WHERE gst_number=?`,
      [gst_number],
    );

    if (exists.length) throw new Error("GST already exists");

    /* 🔒 Lock table for default logic */
    const [[row]] = await conn.query(
      `SELECT COUNT(*) as count 
       FROM company_gst_number 
       WHERE is_default=1 FOR UPDATE`,
    );

    let is_default = false;

    // ✅ Only first GST becomes default
    if (row.count === 0) {
      is_default = true;
    }

    const [result] = await conn.query(
      `INSERT INTO company_gst_number
       (gst_number, is_default, created_by)
       VALUES (?, ?, ?)`,
      [gst_number, is_default ? 1 : 0, userId],
    );

    await AuditLog({
      connection: conn,
      table: "company_gst_number",
      recordId: result.insertId,
      action: "INSERT",
      newData: {
        gst_number,
        is_default,
      },
      userId,
      remarks: remarks || "GST created",
    });

    await conn.commit();

    res.status(201).json({
      message: "GST created",
      id: result.insertId,
      is_default,
    });
  } catch (err) {
    console.error("Create GST error:", err.message);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const getAllGST = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM company_gst_number ORDER BY id DESC`,
    );

    res.json({ data: rows });
  } catch (err) {
    console.error("Get All GST Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;

    let { gst_number, is_default, is_active, remarks } = req.body;

    if (!id) throw new Error("ID required");

    const [[gst]] = await conn.query(
      `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    is_default = is_default === true || is_default === "true";

    /* 🔒 Handle default switch */
    if (is_default) {
      await conn.query(`UPDATE company_gst_number SET is_default=0`);
    }

    await conn.query(
      `UPDATE company_gst_number
       SET gst_number=?, is_default=?, is_active=?, updated_by=?
       WHERE id=?`,
      [
        gst_number ?? gst.gst_number,
        is_default ? 1 : gst.is_default,
        is_active ?? gst.is_active,
        userId,
        id,
      ],
    );

    await AuditLog({
      connection: conn,
      table: "company_gst_number",
      recordId: id,
      action: "UPDATE",
      oldData: gst,
      newData: {
        gst_number: gst_number ?? gst.gst_number,
        is_default: is_default ? 1 : gst.is_default,
        is_active: is_active ?? gst.is_active,
      },
      userId,
      remarks: remarks || "GST updated",
    });

    await conn.commit();

    res.json({ message: "GST updated" });
  } catch (err) {
    console.error("Update GST error:", err.message);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// export const deleteGST = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     const { id } = req.params;

//     const [[gst]] = await conn.query(
//       `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
//       [id]
//     );

//     if (!gst) throw new Error("GST not found");

//     if (gst.is_default) {
//       throw new Error("Cannot delete default GST");
//     }

//     await conn.query(
//       `DELETE FROM company_gst_number WHERE id=?`,
//       [id]
//     );

//     await conn.commit();

//     res.json({ message: "GST deleted" });

//   } catch (err) {
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const deleteGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { remarks } = req.body || {};

    /* 1️⃣ LOCK GST */
    const [[gst]] = await conn.query(
      `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    /* 2️⃣ DELETE GST */
    await conn.query(`DELETE FROM company_gst_number WHERE id=?`, [id]);

    /* 3️⃣ IF DELETED GST WAS DEFAULT → ASSIGN NEW DEFAULT */
    if (gst.is_default) {
      const [[nextGST]] = await conn.query(
        `SELECT id FROM company_gst_number 
         ORDER BY id ASC 
         LIMIT 1 FOR UPDATE`,
      );

      if (nextGST) {
        await conn.query(
          `UPDATE company_gst_number 
           SET is_default=1 
           WHERE id=?`,
          [nextGST.id],
        );
      }
      // if no rows → no default exists → next insert will handle it
    }

    await AuditLog({
      connection: conn,
      table: "company_gst_number",
      recordId: id,
      action: "DELETE",
      oldData: gst,
      userId,
      remarks: remarks || "GST deleted",
    });

    await conn.commit();

    res.json({
      message: "GST deleted successfully",
      reassigned_default: gst.is_default ? true : false,
    });
  } catch (err) {
    console.error("deleteGST ERROR:", err);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const setDefaultGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[gst]] = await conn.query(
      `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    await conn.query(`UPDATE company_gst_number SET is_default=0`);

    await conn.query(`UPDATE company_gst_number SET is_default=1 WHERE id=?`, [
      id,
    ]);

    await conn.commit();

    res.json({ message: "Default GST updated" });
  } catch (err) {
    console.error("setDefaultGST ERROR:", err);
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
