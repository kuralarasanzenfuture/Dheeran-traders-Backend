import db from "../../../config/db.js";

/**
 * CREATE QUANTITY
 */
// export const createQuantity = async (req, res) => {
//   try {
//     const { brand_id, category_id, name } = req.body;

//     if (!brand_id || !category_id || !name) {
//       return res.status(400).json({
//         message: "Brand, category and quantity name are required",
//       });
//     }

//     // 🔍 Validate brand
//     const [[brand]] = await db.query(
//       "SELECT id FROM brands WHERE id = ?",
//       [brand_id]
//     );
//     if (!brand) {
//       return res.status(400).json({ message: "Invalid brand" });
//     }

//     // 🔍 Validate category belongs to brand
//     const [[category]] = await db.query(
//       "SELECT id FROM categories WHERE id = ? AND brand_id = ?",
//       [category_id, brand_id]
//     );
//     if (!category) {
//       return res.status(400).json({
//         message: "Invalid category for selected brand",
//       });
//     }

//     // 🔍 Duplicate check
//     const [exists] = await db.query(
//       `
//       SELECT id FROM quantities
//       WHERE brand_id = ? AND category_id = ? AND name = ?
//       `,
//       [brand_id, category_id, name]
//     );

//     if (exists.length) {
//       return res.status(409).json({
//         message: "Quantity already exists for this category",
//       });
//     }

//     const [result] = await db.query(
//       `
//       INSERT INTO quantities (brand_id, category_id, name)
//       VALUES (?, ?, ?)
//       `,
//       [brand_id, category_id, name]
//     );

//     const [[quantity]] = await db.query(
//       `
//       SELECT 
//         q.id,
//         q.name,
//         b.id AS brand_id,
//         b.name AS brand_name,
//         c.id AS category_id,
//         c.name AS category_name
//       FROM quantities q
//       JOIN brands b ON q.brand_id = b.id
//       JOIN categories c ON q.category_id = c.id
//       WHERE q.id = ?
//       `,
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Quantity created successfully",
//       quantity,
//     });
//   } catch (error) {
//     console.error("Create quantity error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

/**
 * GET ALL QUANTITIES
 */
export const getAllQuantities = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        q.id,
        q.name,
        b.id AS brand_id,
        b.name AS brand_name,
        c.id AS category_id,
        c.name AS category_name
      FROM quantities q
      JOIN brands b ON q.brand_id = b.id
      JOIN categories c ON q.category_id = c.id
      ORDER BY q.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Get quantities error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET QUANTITIES BY BRAND & CATEGORY
 */
export const getQuantitiesByCategory = async (req, res) => {
  try {
    const { brand_id, category_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, name
      FROM quantities
      WHERE brand_id = ? AND category_id = ?
      ORDER BY name ASC
      `,
      [brand_id, category_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Get quantities by category error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET SINGLE QUANTITY
 */
export const getQuantityById = async (req, res) => {
  try {
    const [[quantity]] = await db.query(
      `
      SELECT 
        q.id,
        q.name,
        b.name AS brand_name,
        c.name AS category_name
      FROM quantities q
      JOIN brands b ON q.brand_id = b.id
      JOIN categories c ON q.category_id = c.id
      WHERE q.id = ?
      `,
      [req.params.id]
    );

    if (!quantity) {
      return res.status(404).json({ message: "Quantity not found" });
    }

    res.json(quantity);
  } catch (error) {
    console.error("Get quantity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPDATE QUANTITY
 */
// export const updateQuantity = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { brand_id, category_id, name } = req.body;

//     if (brand_id) {
//       const [[brand]] = await db.query(
//         "SELECT id FROM brands WHERE id = ?",
//         [brand_id]
//       );
//       if (!brand) {
//         return res.status(400).json({ message: "Invalid brand" });
//       }
//     }

//     if (brand_id && category_id) {
//       const [[category]] = await db.query(
//         "SELECT id FROM categories WHERE id = ? AND brand_id = ?",
//         [category_id, brand_id]
//       );
//       if (!category) {
//         return res.status(400).json({
//           message: "Invalid category for selected brand",
//         });
//       }
//     }

//     const [result] = await db.query(
//       `
//       UPDATE quantities
//       SET
//         brand_id = COALESCE(?, brand_id),
//         category_id = COALESCE(?, category_id),
//         name = COALESCE(?, name)
//       WHERE id = ?
//       `,
//       [brand_id, category_id, name, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Quantity not found" });
//     }

//     const [[quantity]] = await db.query(
//       `
//       SELECT 
//         q.id,
//         q.name,
//         b.name AS brand_name,
//         c.name AS category_name
//       FROM quantities q
//       JOIN brands b ON q.brand_id = b.id
//       JOIN categories c ON q.category_id = c.id
//       WHERE q.id = ?
//       `,
//       [id]
//     );

//     res.json({
//       message: "Quantity updated successfully",
//       quantity,
//     });
//   } catch (error) {
//     console.error("Update quantity error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

/**
 * DELETE QUANTITY
 */
// export const deleteQuantity = async (req, res) => {
//   try {
//     const [result] = await db.query(
//       "DELETE FROM quantities WHERE id = ?",
//       [req.params.id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Quantity not found" });
//     }

//     res.json({ message: "Quantity deleted successfully" });
//   } catch (error) {
//     console.error("Delete quantity error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// -------------------------------- hard delete -------------------------------------------------------

export const createQuantity = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { brand_id, category_id, name, remarks } = req.body;
    const userId = req.user?.id;

    if (!brand_id || !category_id || !name) {
      throw new Error("Missing fields");
    }

    const [exists] = await connection.query(
      `SELECT id FROM quantities 
       WHERE brand_id=? AND category_id=? AND name=?`,
      [brand_id, category_id, name]
    );

    if (exists.length) throw new Error("Duplicate quantity");

    const [result] = await connection.query(
      `INSERT INTO quantities (brand_id, category_id, name, created_by)
       VALUES (?, ?, ?, ?)`,
      [brand_id, category_id, name, userId]
    );

    const id = result.insertId;

    // ✅ Audit
    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, new_data, changed_by, remarks)
       VALUES (?, ?, 'INSERT', ?, ?, ?)`,
      [
        "quantities",
        id,
        JSON.stringify({ brand_id, category_id, name }),
        userId,
        remarks || "Created"
      ]
    );

    await connection.commit();

    res.status(201).json({ message: "Created", id });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

export const updateQuantity = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { brand_id, category_id, name, remarks } = req.body;
    const userId = req.user?.id;

    const [[oldData]] = await connection.query(
      "SELECT * FROM quantities WHERE id = ?",
      [id]
    );

    if (!oldData) throw new Error("Quantity not found");

    await connection.query(
      `UPDATE quantities
       SET 
         brand_id = COALESCE(?, brand_id),
         category_id = COALESCE(?, category_id),
         name = COALESCE(?, name),
         updated_by = ?
       WHERE id = ?`,
      [brand_id, category_id, name, userId, id]
    );

    const [[newData]] = await connection.query(
      "SELECT * FROM quantities WHERE id = ?",
      [id]
    );

    // ✅ Audit
    await connection.query(
      `INSERT INTO audit_logs
       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
       VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
      [
        "quantities",
        id,
        JSON.stringify(oldData),
        JSON.stringify(newData),
        userId,
        remarks || "Quantity updated"
      ]
    );

    await connection.commit();

    res.json({ message: "Updated", data: newData });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

export const deleteQuantity = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { remarks } = req.body || {};
    const userId = req.user?.id;

    // 🔴 STEP 1: Get data BEFORE delete
    const [[oldData]] = await connection.query(
      "SELECT * FROM quantities WHERE id = ?",
      [id]
    );

    if (!oldData) {
      return res.status(404).json({ message: "Quantity not found" });
    }

    // 🔴 STEP 2: Audit FIRST
    await connection.query(
      `INSERT INTO audit_logs
      (table_name, record_id, action, old_data, changed_by, remarks)
      VALUES (?, ?, 'DELETE', ?, ?, ?)`,
      [
        "quantities",
        id,
        JSON.stringify(oldData),
        userId,
        remarks || "Hard delete quantity"
      ]
    );

    // 🔴 STEP 3: HARD DELETE
    await connection.query(
      "DELETE FROM quantities WHERE id = ?",
      [id]
    );

    await connection.commit();

    res.json({ message: "Quantity permanently deleted" });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
