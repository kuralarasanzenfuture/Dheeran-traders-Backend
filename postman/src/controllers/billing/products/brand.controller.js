import e from "express";
import db from "../../../config/db.js";
import { AuditLog } from "../../../services/audit.service.js";
// import { logAudit } from "../../../utils/auditLogger.js";
/**
 * CREATE BRAND
 */
// export const createBrand = async (req, res, next) => {
//   try {
//     const { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ message: "Brand name is required" });
//     }

//     const [exists] = await db.query(
//       "SELECT id FROM brands WHERE name = ?",
//       [name]
//     );

//     if (exists.length) {
//       return res.status(400).json({ message: "Brand already exists" });
//     }

//     const [result] = await db.query(
//       "INSERT INTO brands (name) VALUES (?)",
//       [name]
//     );

//     const [rows] = await db.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [result.insertId]
//     );

//     res.status(201).json({
//       message: "Brand created successfully",
//       brand: rows[0],
//     });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * GET ALL BRANDS
 */
// export const getBrands = async (req, res, next) => {
//   try {
//     const [rows] = await db.query(
//       "SELECT * FROM brands ORDER BY id DESC"
//     );
//     res.json(rows);
//   } catch (err) {
//     next(err);
//   }
// };

// export const getBrands = async (req, res, next) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM brands
//        WHERE deleted_at IS NULL
//        ORDER BY id DESC`
//     );

//     res.json(rows);
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * GET BRAND BY ID
 */
// export const getBrandById = async (req, res, next) => {
//   try {
//     const [rows] = await db.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [req.params.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * UPDATE BRAND
 */
// export const updateBrand = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ message: "Brand name is required" });
//     }

//     const [result] = await db.query(
//       "UPDATE brands SET name = ? WHERE id = ?",
//       [name, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     const [rows] = await db.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [id]
//     );

//     res.json({
//       message: "Brand updated successfully",
//       brand: rows[0],
//     });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * DELETE BRAND
 */
// export const deleteBrand = async (req, res, next) => {
//   try {
//     const [result] = await db.query(
//       "DELETE FROM brands WHERE id = ?",
//       [req.params.id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     res.json({ message: "Brand deleted successfully" });
//   } catch (err) {
//     next(err);
//   }
// };

// export const deleteBrand = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     // DELETE /brands/1?remarks=duplicate entry
//     // const { remarks } = req.query;

//     // const { remarks } = req.body;
//     const { remarks } = req.body || {};

//     // const remarks = req.body?.remarks || req.query?.remarks;

//     const userId = req.user?.id;

//     // if (!remarks) {
//     //   return res.status(400).json({ message: "Remarks is required for delete" });
//     // }

//     // 🔹 Get old data
//     const [oldRows] = await connection.query(
//       "SELECT * FROM brands WHERE id = ? AND deleted_at IS NULL",
//       [id]
//     );

//     if (!oldRows.length) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     const oldData = oldRows[0];

//     // 🔥 SOFT DELETE
//     await connection.query(
//       `UPDATE brands
//        SET deleted_at = NOW(), deleted_by = ?
//        WHERE id = ?`,
//       [userId, id]
//     );

//     // 🔹 Audit log
//     await connection.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, changed_by, remarks)
//       VALUES (?, ?, 'DELETE', ?, ?, ?)`,
//       [
//         "brands",
//         id,
//         JSON.stringify(oldData),
//         userId,
//         remarks
//       ]
//     );

//     await connection.commit();

//     res.json({ message: "Brand deleted successfully" });

//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };

// -------------------------- soft delete------------------------------------------------------------
// issue with soft delete and audit log - create eg: rice and delete rice, but again create rice, it will not create duplicate error
// export const createBrand = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { name, remarks } = req.body;
//     const userId = req.user?.id;

//     if (!name) {
//       return res.status(400).json({ message: "Brand name is required" });
//     }

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const [exists] = await connection.query(
//       "SELECT id FROM brands WHERE name = ? AND deleted_at IS NULL",
//       [name]
//     );

//     if (exists.length) {
//       return res.status(400).json({ message: "Brand already exists" });
//     }

//     const [result] = await connection.query(
//       "INSERT INTO brands (name, created_by) VALUES (?, ?)",
//       [name, userId]
//     );

//     const brandId = result.insertId;

//     // ✅ Audit log
//     await connection.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, new_data, changed_by, remarks)
//       VALUES (?, ?, 'INSERT', ?, ?, ?)`,
//       [
//         "brands",
//         brandId,
//         JSON.stringify({ name }),
//         userId,
//         remarks || "Brand created"
//       ]
//     );

//     await connection.commit();

//     const [rows] = await db.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [brandId]
//     );

//     res.status(201).json({
//       message: "Brand created successfully",
//       brand: rows[0],
//     });

//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };

// // soft update
// export const updateBrand = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const { name, remarks } = req.body;
//     const userId = req.user?.id;

//     if (!name) {
//       return res.status(400).json({ message: "Brand name is required" });
//     }

//     // if (!remarks) {
//     //   return res.status(400).json({ message: "Remarks is required for update" });
//     // }

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     // 🔹 Get old data
//     const [oldRows] = await connection.query(
//       "SELECT * FROM brands WHERE id = ? AND deleted_at IS NULL",
//       [id]
//     );

//     if (!oldRows.length) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     const oldData = oldRows[0];

//     // 🔴 Check if nothing changed
//     if (oldData.name === name) {
//       return res.status(400).json({
//         message: "No changes detected"
//       });
//     }

//     // 🔴 Check duplicate name
//     const [duplicate] = await connection.query(
//       "SELECT id FROM brands WHERE name = ? AND id != ? AND deleted_at IS NULL",
//       [name, id]
//     );

//     if (duplicate.length) {
//       return res.status(400).json({
//         message: "Brand name already exists"
//       });
//     }

//     // 🔹 Update
//     const [updateResult] = await connection.query(
//       `UPDATE brands
//        SET name = ?, updated_by = ?
//        WHERE id = ? AND deleted_at IS NULL`,
//       [name, userId, id]
//     );

//     if (!updateResult.affectedRows) {
//       throw new Error("Update failed");
//     }

//     // 🔹 Get new data
//     const [newRows] = await connection.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [id]
//     );

//     const newData = newRows[0];

//     // 🔹 Audit log
//     await connection.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//       VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
//       [
//         "brands",
//         id,
//         JSON.stringify(oldData),
//         JSON.stringify(newData),
//         userId,
//         remarks
//       ]
//     );

//     await connection.commit();

//     res.json({
//       message: "Brand updated successfully",
//       brand: newData,
//     });

//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };

// // 🔥 SOFT DELETE
// export const deleteBrand = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const remarks = req.body?.remarks || req.query?.remarks || "No remarks";
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const [oldRows] = await connection.query(
//       "SELECT * FROM brands WHERE id = ? AND deleted_at IS NULL",
//       [id]
//     );

//     if (!oldRows.length) {
//       return res.status(404).json({ message: "Brand not found or already deleted" });
//     }

//     const oldData = oldRows[0];

//     const [updateResult] = await connection.query(
//       `UPDATE brands
//        SET deleted_at = NOW(), deleted_by = ?
//        WHERE id = ? AND deleted_at IS NULL`,
//       [userId, id]
//     );

//     if (!updateResult.affectedRows) {
//       throw new Error("Delete failed");
//     }

//     await connection.query(
//       `INSERT INTO audit_logs
//       (table_name, record_id, action, old_data, changed_by, remarks)
//       VALUES (?, ?, 'DELETE', ?, ?, ?)`,
//       [
//         "brands",
//         id,
//         JSON.stringify(oldData),
//         userId,
//         remarks
//       ]
//     );

//     await connection.commit();

//     res.json({ message: "Brand deleted successfully" });

//   } catch (err) {
//     await connection.rollback();
//     next(err);
//   } finally {
//     connection.release();
//   }
// };

// // soft delete
// export const getBrands = async (req, res, next) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM brands
//        WHERE deleted_at IS NULL
//        ORDER BY id DESC`
//     );

//     res.json(rows);
//   } catch (err) {
//     next(err);
//   }
// };

// // soft delete
// export const getBrandById = async (req, res, next) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM brands
//        WHERE id = ? AND deleted_at IS NULL`,
//       [req.params.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     next(err);
//   }
// };

// ---------------------------------------hard delete-------------------------------------------------------

export const createBrand = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let { name, remarks } = req.body;
    const userId = req.user?.id;

    // ✅ Validation
    if (!name) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Normalize
    name = name.trim().toLowerCase();

    let result;
    try {
      [result] = await connection.query(
        "INSERT INTO brands (name, created_by) VALUES (?, ?)",
        [name, userId],
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Brand already exists",
        });
      }
      throw err;
    }

    const brandId = result.insertId;

    const [rows] = await connection.query("SELECT * FROM brands WHERE id = ?", [
      brandId,
    ]);

    const newData = rows[0];

    // ✅ Audit
    // await connection.query(
    //   `INSERT INTO audit_logs
    //   (table_name, record_id, action, new_data, changed_by, remarks)
    //   VALUES (?, ?, 'INSERT', ?, ?, ?)`,
    //   [
    //     "brands",
    //     brandId,
    //     JSON.stringify({ name: newData.name }),
    //     userId,
    //     remarks || "Brand created"
    //   ]
    // );

    await AuditLog({
      connection,
      table: "brands",
      recordId: brandId,
      action: "INSERT",
      newData: { name: newData.name },
      userId: userId,
      remarks: remarks || "Brand created",
    });

    await connection.commit();

    res.status(201).json({
      message: "Brand created successfully",
      brand: newData,
    });
  } catch (err) {
    await connection.rollback();
    console.error(`Error creating brand: ${err.message}`);
    res.status(500).json({ message: err.message || "Error creating brand" });
  } finally {
    connection.release();
  }
};

// export const updateBrand = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     let { name, remarks } = req.body;
//     const userId = req.user?.id;

//     if (!name || !name.trim()) {
//       return res.status(400).json({ message: "Brand name is required" });
//     }

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     name = name.trim().toLowerCase();

//     const [oldRows] = await connection.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [id],
//     );

//     if (!oldRows.length) {
//       return res.status(404).json({ message: "Brand not found" });
//     }

//     const oldData = oldRows[0];

//     if (oldData.name === name) {
//       return res.status(400).json({
//         message: "No changes detected",
//       });
//     }

//     let updateResult;
//     try {
//       [updateResult] = await connection.query(
//         "UPDATE brands SET name = ?, updated_by = ? WHERE id = ?",
//         [name, userId, id],
//       );
//     } catch (err) {
//       if (err.code === "ER_DUP_ENTRY") {
//         return res.status(400).json({
//           message: "Brand name already exists",
//         });
//       }
//       throw err;
//     }

//     const [newRows] = await connection.query(
//       "SELECT * FROM brands WHERE id = ?",
//       [id],
//     );

//     const newData = newRows[0];

//     // await connection.query(
//     //   `INSERT INTO audit_logs
//     //   (table_name, record_id, action, old_data, new_data, changed_by, remarks)
//     //   VALUES (?, ?, 'UPDATE', ?, ?, ?, ?)`,
//     //   [
//     //     "brands",
//     //     id,
//     //     JSON.stringify(oldData),
//     //     JSON.stringify(newData),
//     //     userId,
//     //     remarks || "Brand updated",
//     //   ],
//     // );

//     await AuditLog({
//       connection,
//       table: "brands",
//       recordId: id,
//       action: "UPDATE",
//       oldData: JSON.stringify(oldData),
//       newData: JSON.stringify(newData),
//       userId: userId,
//       remarks: remarks || "Brand updated",
//     });

//     await connection.commit();

//     res.json({
//       message: "Brand updated successfully",
//       brand: newData,
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error(`Error updating brand: ${err.message}`);
//     res.status(500).json({ message: err.message || "Error updating brand" });
//   } finally {
//     connection.release();
//   }
// };

/* -- changed field */
export const updateBrand = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let { name, remarks } = req.body;
    const userId = req.user?.id;

    // ✅ validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ normalize
    name = name.trim().replace(/\s+/g, " ").toLowerCase();

    // ✅ get old data
    const [[oldData]] = await connection.query(
      "SELECT * FROM brands WHERE id = ?",
      [id]
    );

    if (!oldData) {
      await connection.rollback();
      return res.status(404).json({ message: "Brand not found" });
    }

    // ✅ detect changes
    let changedFields = {};

    if (oldData.name !== name) {
      changedFields.name = {
        old: oldData.name,
        new: name,
      };
    }

    // ✅ no change case
    if (Object.keys(changedFields).length === 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "No changes detected",
      });
    }

    // ✅ update
    try {
      await connection.query(
        "UPDATE brands SET name = ?, updated_by = ? WHERE id = ?",
        [name, userId, id]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        await connection.rollback();
        return res.status(400).json({
          message: "Brand name already exists",
        });
      }
      throw err;
    }

    // ✅ get updated row
    const [[newData]] = await connection.query(
      "SELECT * FROM brands WHERE id = ?",
      [id]
    );

    // ✅ audit (only changed fields)
    await AuditLog({
      connection,
      table: "brands",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData: changedFields, // ✅ only changed fields
      userId,
      remarks: remarks || "Brand updated",
    });

    await connection.commit();

    return res.json({
      message: "Brand updated successfully",
      brand: newData,
    });

  } catch (err) {
    await connection.rollback();
    console.error("UPDATE BRAND ERROR:", err);

    return res.status(500).json({
      message: err.message || "Error updating brand",
    });
  } finally {
    connection.release();
  }
};

// export const deleteBrand = async (req, res, next) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const remarks = req.body?.remarks || "Brand deleted";
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     // ✅ Get existing data
//     const [rows] = await connection.query("SELECT * FROM brands WHERE id = ?", [
//       id,
//     ]);

//     if (!rows.length) {
//       return res.status(404).json({
//         message: "Brand not found",
//       });
//     }

//     const oldData = rows[0];

//     // ✅ HARD DELETE
//     const [result] = await connection.query("DELETE FROM brands WHERE id = ?", [
//       id,
//     ]);

//     if (!result.affectedRows) {
//       throw new Error("Delete failed");
//     }

//     // ✅ Audit log
//     // await connection.query(
//     //   `INSERT INTO audit_logs 
//     //   (table_name, record_id, action, old_data, changed_by, remarks)
//     //   VALUES (?, ?, 'DELETE', ?, ?, ?)`,
//     //   ["brands", id, JSON.stringify(oldData), userId, remarks],
//     // );

//     await AuditLog({
//       connection,
//       table: "brands",
//       recordId: id,
//       action: "DELETE",
//       oldData: oldData,
//       userId: userId,
//       remarks: remarks,
//     });

//     await connection.commit();

//     res.json({
//       message: "Brand deleted permanently",
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error(`Error deleting brand: ${err.message}`);
//     res.status(500).json({ message: err.message || "Error deleting brand" });
//   } finally {
//     connection.release();
//   }
// };

export const deleteBrand = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const remarks = req.body?.remarks || "Brand deleted";
    const userId = req.user?.id;

    if (!userId) {
      await connection.rollback(); // ✅ FIX
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ get existing data
    const [[oldData]] = await connection.query(
      "SELECT * FROM brands WHERE id = ?",
      [id]
    );

    if (!oldData) {
      await connection.rollback(); // ✅ FIX
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    // ✅ audit BEFORE delete
    await AuditLog({
      connection,
      table: "brands",
      recordId: id,
      action: "DELETE",
      oldData: oldData, // ✅ FIX
      userId,
      remarks,
    });

    // ✅ delete
    const [result] = await connection.query(
      "DELETE FROM brands WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      throw new Error("Delete failed");
    }

    await connection.commit();

    return res.json({
      message: "Brand deleted permanently",
    });

  } catch (err) {
    await connection.rollback();
    console.error("DELETE BRAND ERROR:", err);

    return res.status(500).json({
      message: err.message || "Error deleting brand",
    });
  } finally {
    connection.release();
  }
};

export const getBrands = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM brands ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(`Error fetching brands: ${err.message}`);
    res.status(500).json({ message: err.message || "Error fetching brands" });
  }
};

export const getBrandById = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM brands WHERE id = ?", [
      req.params.id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(`Error fetching brand: ${err.message}`);
    res.status(500).json({ message: err.message || "Error fetching brand" });
  }
};
