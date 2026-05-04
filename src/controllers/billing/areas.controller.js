import db from "../../config/db.js";

// const generateAreaCode = (name) => {
//   return name
//     .trim()
//     .toUpperCase()
//     .split(" ")
//     .map(word => word.slice(0, 3)) // take first 3 letters
//     .join("")
//     .slice(0, 6); // limit length
// };

const generateUniqueAreaCode = async (connection, name) => {
  let baseCode = name
    .trim()
    .toUpperCase()
    .split(" ")
    .map(word => word.slice(0, 3))
    .join("")
    .slice(0, 6);

  let code = baseCode;
  let counter = 1;

  while (true) {
    const [rows] = await connection.query(
      `SELECT id FROM areas WHERE code = ?`,
      [code]
    );

    if (!rows.length) break;

    code = `${baseCode}${counter}`;
    counter++;
  }

  return code;
};

/* =============================
   CREATE AREA
============================= */
export const createArea = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // let { name, code } = req.body;
    let { name } = req.body;
    const created_by = req.user?.id;

    if (!name) {
      throw new Error("name are required");
    }

    // 🔥 normalize (important)
    name = name.trim().toLowerCase();
    // code = code.trim().toUpperCase();
    const code = await generateUniqueAreaCode(connection, name);

    // 🔴 CHECK DUPLICATE NAME / CODE
    const [existing] = await connection.query(
      `SELECT id FROM areas WHERE name = ? OR code = ?`,
      [name, code]
    );

    if (existing.length) {
      throw new Error("Area name or code already exists");
    }

    // 🔴 INSERT
    await connection.query(
      `INSERT INTO areas (name, code, created_by)
       VALUES (?, ?, ?)`,
      [name, code, created_by]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Area created successfully",
    });

  } catch (err) {
    await connection.rollback();
    console.error(`Create area error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};

/* =============================
   GET ALL AREAS
============================= */
export const getAreas = async (req, res) => {
  try {
    const { status = "ACTIVE" } = req.query;

    let query = `
      SELECT 
        a.id,
        a.name,
        a.code,
        a.status,
        a.created_at,

        u.username AS created_by_name
      FROM areas a
      LEFT JOIN users_roles u ON u.id = a.created_by
    `;

    let params = [];

    if (status !== "ALL") {
      query += ` WHERE a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.name ASC`;

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });

  } catch (err) {
    console.error(`Get areas error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* =============================
   UPDATE AREA
============================= */
// export const updateArea = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     let { name, code, status } = req.body;
//     const updated_by = req.user?.id;

//     if (!id) throw new Error("area id is required");

//     // 🔴 CHECK EXISTING
//     const [rows] = await connection.query(
//       `SELECT * FROM areas WHERE id = ?`,
//       [id]
//     );

//     if (!rows.length) throw new Error("Area not found");

//     const area = rows[0];

//     // 🔥 normalize if provided
//     if (name) name = name.trim().toLowerCase();
//     if (code) code = code.trim().toUpperCase();

//     const newName = name || area.name;
//     const newCode = code || area.code;
//     const newStatus = status || area.status;

//     // 🔴 DUPLICATE CHECK
//     const [duplicate] = await connection.query(
//       `SELECT id FROM areas 
//        WHERE (name = ? OR code = ?) AND id != ?`,
//       [newName, newCode, id]
//     );

//     if (duplicate.length) {
//       throw new Error("Area name or code already exists");
//     }

//     // 🔴 UPDATE
//     await connection.query(
//       `UPDATE areas
//        SET name = ?, code = ?, status = ?,
//            updated_by = ?, updated_at = NOW()
//        WHERE id = ?`,
//       [newName, newCode, newStatus, updated_by, id]
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: "Area updated successfully",
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error(`Update area error: ${err.message}`);
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   } finally {
//     connection.release();
//   }
// };

export const updateArea = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let { name, status } = req.body;
    const updated_by = req.user?.id;

    if (!id) throw new Error("area id is required");

    // 🔴 GET EXISTING
    const [rows] = await connection.query(
      `SELECT * FROM areas WHERE id = ?`,
      [id]
    );

    if (!rows.length) throw new Error("Area not found");

    const area = rows[0];

    // 🔥 normalize
    if (name) name = name.trim().toLowerCase();

    const newName = name || area.name;

    // 🔴 VALIDATE STATUS
    const allowedStatus = ["ACTIVE", "INACTIVE"];
    const newStatus = status
      ? status.toUpperCase()
      : area.status;

    if (!allowedStatus.includes(newStatus)) {
      throw new Error("Invalid status value");
    }

    // 🔴 DUPLICATE NAME CHECK
    const [duplicate] = await connection.query(
      `SELECT id FROM areas 
       WHERE name = ? AND id != ?`,
      [newName, id]
    );

    if (duplicate.length) {
      throw new Error("Area name already exists");
    }

    // 🔥 REGENERATE CODE ONLY IF NAME CHANGED
    let newCode = area.code;
    if (name && name !== area.name) {
      newCode = await generateUniqueAreaCode(connection, newName, id);
    }

    // 🔴 UPDATE
    await connection.query(
      `UPDATE areas
       SET name = ?, code = ?, status = ?,
           updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [newName, newCode, newStatus, updated_by, id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Area updated successfully",
    });

  } catch (err) {
    await connection.rollback();
    console.error(`Update area error: ${err.message}`);

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  } finally {
    connection.release();
  }
};

/* =============================
   DELETE AREA (SOFT)
============================= */
// export const deleteArea = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) throw new Error("area id is required");

//     // 🔴 CHECK LINKED CUSTOMERS
//     const [linked] = await db.query(
//       `SELECT id FROM customers WHERE area_id = ? LIMIT 1`,
//       [id]
//     );

//     if (linked.length) {
//       throw new Error("Area is linked to customers. Cannot delete.");
//     }

//     // 🔴 SOFT DELETE
//     await db.query(
//       `UPDATE areas SET status = 'INACTIVE' WHERE id = ?`,
//       [id]
//     );

//     return res.json({
//       success: true,
//       message: "Area deactivated successfully",
//     });

//   } catch (err) {
//     return res.status(400).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


/* =============================
   DELETE AREA (hard)
============================= */

export const deleteArea = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    if (!id) throw new Error("area id is required");

    // 🔴 CHECK CUSTOMERS LINK
    // const [customerCheck] = await connection.query(
    //   `SELECT id FROM customers WHERE area_id = ? LIMIT 1`,
    //   [id]
    // );

    // if (customerCheck.length) {
    //   throw new Error("Cannot delete: area is linked to customers");
    // }

    // 🔴 CHECK USER ASSIGNMENTS
    // const [userCheck] = await connection.query(
    //   `SELECT id FROM user_area_assignments WHERE area_id = ? LIMIT 1`,
    //   [id]
    // );

    // if (userCheck.length) {
    //   throw new Error("Cannot delete: area is assigned to users");
    // }

    // 🔴 FINAL DELETE
    const [result] = await connection.query(
      `DELETE FROM areas WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error("Area not found");
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Area permanently deleted",
    });

  } catch (err) {
    await connection.rollback();
    console.error(`Delete area error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
