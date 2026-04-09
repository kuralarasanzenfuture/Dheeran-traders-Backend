import db from "../../../config/db.js";

/**
 * CREATE CATEGORY
 */
// export const createCategory = async (req, res, next) => {
//   try {
//     const { brand_id, name, hsn_code } = req.body;

//     if (!brand_id || !name) {
//       return res.status(400).json({
//         message: "Brand and category name are required",
//       });
//     }

//     // Check brand exists
//     const [[brand]] = await db.query("SELECT id FROM brands WHERE id = ?", [
//       brand_id,
//     ]);

//     if (!brand) {
//       return res.status(400).json({ message: "Invalid brand" });
//     }

//     // Prevent duplicate category under same brand
//     const [exists] = await db.query(
//       "SELECT id FROM categories WHERE brand_id = ? AND name = ?",
//       [brand_id, name],
//     );

//     if (exists.length) {
//       return res.status(400).json({
//         message: "Category already exists for this brand",
//       });
//     }

//     const [result] = await db.query(
//       "INSERT INTO categories (brand_id, name, hsn_code) VALUES (?, ?, ?)",
//       [brand_id, name, hsn_code || null],
//     );

//     const [[category]] = await db.query(
//       `
//       SELECT c.id, c.name, c.hsn_code, c.brand_id, b.name AS brand_name
//       FROM categories c
//       JOIN brands b ON c.brand_id = b.id
//       WHERE c.id = ?
//       `,
//       [result.insertId],
//     );

//     res.status(201).json({
//       message: "Category created successfully",
//       category,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * GET ALL CATEGORIES
 */
export const getCategories = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.name,
        c.hsn_code,
        c.brand_id,
        b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY c.id DESC
      `,
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET CATEGORIES BY BRAND
 */
export const getCategoriesByBrand = async (req, res, next) => {
  try {
    const { brand_id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, name, hsn_code
      FROM categories
      WHERE brand_id = ?
      ORDER BY name ASC
      `,
      [brand_id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET CATEGORY BY ID
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const [[category]] = await db.query(
      `
      SELECT 
        c.id,
        c.name,
        c.hsn_code,
        c.brand_id,
        b.name AS brand_name
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.id = ?
      `,
      [req.params.id],
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE CATEGORY
 */
// export const updateCategory = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { brand_id, name, hsn_code } = req.body;

//     if (brand_id) {
//       const [[brand]] = await db.query(
//         "SELECT id FROM brands WHERE id = ?",
//         [brand_id]
//       );
//       if (!brand) {
//         return res.status(400).json({ message: "Invalid brand" });
//       }
//     }

//     const [result] = await db.query(
//       `
//       UPDATE categories
//       SET
//         brand_id = COALESCE(?, brand_id),
//         name = COALESCE(?, name),
//         hsn_code = COALESCE(?, hsn_code)
//       WHERE id = ?
//       `,
//       [brand_id, name, hsn_code, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Category not found" });
//     }

//     const [[category]] = await db.query(
//       `
//       SELECT
//         c.id,
//         c.name,
//         c.hsn_code,
//         c.brand_id,
//         b.name AS brand_name
//       FROM categories c
//       JOIN brands b ON c.brand_id = b.id
//       WHERE c.id = ?
//       `,
//       [id]
//     );

//     res.json({
//       message: "Category updated successfully",
//       category,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// export const updateCategory = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { brand_id, name, hsn_code } = req.body;

//     if (brand_id) {
//       const [[brand]] = await db.query("SELECT id FROM brands WHERE id = ?", [
//         brand_id,
//       ]);
//       if (!brand) {
//         return res.status(400).json({ message: "Invalid brand" });
//       }
//     }

//     // Update category
//     const [result] = await db.query(
//       `
//       UPDATE categories
//       SET 
//         brand_id = COALESCE(?, brand_id),
//         name = COALESCE(?, name),
//         hsn_code = COALESCE(?, hsn_code)
//       WHERE id = ?
//       `,
//       [brand_id, name, hsn_code, id],
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Category not found" });
//     }

//     // ✅ Sync HSN to products
//     // await db.query(
//     //   `
//     //   UPDATE products p
//     //   JOIN categories c ON p.category = c.name
//     //   SET p.hsn_code = c.hsn_code
//     //   WHERE c.id = ?
//     //   `,
//     //   [id]
//     // );

//     await db.query(
//       `
//   UPDATE products p
//   JOIN categories c ON c.id = ?
//   JOIN brands b ON c.brand_id = b.id
//   SET 
//     p.category = c.name,
//     p.brand = b.name,
//     p.hsn_code = c.hsn_code
//   WHERE 
//     p.category = c.name
//     AND p.brand = b.name
//   `,
//       [id],
//     );

//     const [[category]] = await db.query(
//       `
//       SELECT 
//         c.id,
//         c.name,
//         c.hsn_code,
//         c.brand_id,
//         b.name AS brand_name
//       FROM categories c
//       JOIN brands b ON c.brand_id = b.id
//       WHERE c.id = ?
//       `,
//       [id],
//     );

//     res.json({
//       message: "Category updated successfully (HSN synced to products)",
//       category,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * DELETE CATEGORY
 */
// export const deleteCategory = async (req, res, next) => {
//   try {
//     const [result] = await db.query("DELETE FROM categories WHERE id = ?", [
//       req.params.id,
//     ]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Category not found" });
//     }

//     res.json({ message: "Category deleted successfully" });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * GET BRAND + CATEGORY DROPDOWN DATA
 */
export const getBrandCategoryDropdown = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id AS category_id,
        b.id AS brand_id,
        b.name AS brand_name,
        c.name AS category_name,
        c.hsn_code,
        CONCAT(b.name, ' - ', c.name) AS label
      FROM categories c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY b.name ASC, c.name ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Brand-category dropdown error:", error);
    res.status(500).json({ message: "Failed to load dropdown data" });
  }
};

// ------------------------------------------------------------------------------------------------------

export const createCategory = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let { brand_id, name, hsn_code, remarks } = req.body;
    const userId = req.user?.id;

    if (!brand_id ) {
      return res.status(400).json({
        message: "Brand id are required",
      });
    }
    
    // ✅ Validation
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Normalize
    name = name.trim().toLowerCase();

    // ✅ Check brand exists
    const [[brand]] = await connection.query(
      "SELECT id FROM brands WHERE id = ?",
      [brand_id]
    );

    if (!brand) {
      return res.status(400).json({ message: "Invalid brand" });
    }

    let result;
    try {
      [result] = await connection.query(
        "INSERT INTO categories (brand_id, name, hsn_code) VALUES (?, ?, ?)",
        [brand_id, name, hsn_code || null]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Category already exists for this brand",
        });
      }
      throw err;
    }

    const categoryId = result.insertId;

    const [[newData]] = await connection.query(
      `SELECT * FROM categories WHERE id = ?`,
      [categoryId]
    );

    // ✅ Audit
    await connection.query(
      `INSERT INTO audit_logs 
      (table_name, record_id, action, new_data, changed_by, remarks)
      VALUES (?, ?, 'INSERT', ?, ?, ?)`,
      [
        "categories",
        categoryId,
        JSON.stringify(newData),
        userId,
        remarks || "Category created",
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Category created successfully",
      category: newData,
    });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

export const updateCategory = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let { brand_id, name, hsn_code, remarks } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Get old data
    const [[oldData]] = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );

    if (!oldData) {
      return res.status(404).json({ message: "Category not found" });
    }

    // ✅ Normalize
    if (name) name = name.trim().toLowerCase();

    // ✅ Validate brand if changed
    if (brand_id) {
      const [[brand]] = await connection.query(
        "SELECT id FROM brands WHERE id = ?",
        [brand_id]
      );
      if (!brand) {
        return res.status(400).json({ message: "Invalid brand" });
      }
    }

    let updateResult;
    try {
      [updateResult] = await connection.query(
        `UPDATE categories
         SET 
           brand_id = COALESCE(?, brand_id),
           name = COALESCE(?, name),
           hsn_code = COALESCE(?, hsn_code)
         WHERE id = ?`,
        [brand_id, name, hsn_code, id]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Category already exists for this brand",
        });
      }
      throw err;
    }

    const [[newData]] = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );

    // 🔥 Sync products (your logic kept but fixed)
    await connection.query(
      `
      UPDATE products p
      JOIN categories c ON c.id = ?
      JOIN brands b ON c.brand_id = b.id
      SET 
        p.category = c.name,
        p.brand = b.name,
        p.hsn_code = c.hsn_code
      WHERE p.category = c.name AND p.brand = b.name
      `,
      [id]
    );

    // ✅ Audit
    await connection.query(
      `INSERT INTO audit_logs 
      (table_name, record_id, action, old_data, new_data, changed_by, remarks)
      VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
      [
        "categories",
        id,
        JSON.stringify(oldData),
        JSON.stringify(newData),
        userId,
        remarks || "Category updated",
      ]
    );

    await connection.commit();

    res.json({
      message: "Category updated successfully",
      category: newData,
    });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

export const deleteCategory = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const remarks = req.body?.remarks || "Category deleted";
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [[oldData]] = await connection.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );

    if (!oldData) {
      return res.status(404).json({ message: "Category not found" });
    }

    const [result] = await connection.query(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      throw new Error("Delete failed");
    }

    // ✅ Audit
    await connection.query(
      `INSERT INTO audit_logs 
      (table_name, record_id, action, old_data, changed_by, remarks)
      VALUES (?, ?, 'DELETE', ?, ?, ?)`,
      [
        "categories",
        id,
        JSON.stringify(oldData),
        userId,
        remarks,
      ]
    );

    await connection.commit();

    res.json({ message: "Category deleted permanently" });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
