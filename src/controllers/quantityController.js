// import db from "../config/db.js";

// /**
//  * CREATE QUANTITY
//  */
// export const createQuantity = async (req, res) => {
//   try {
//     const { brand_id, category_id, name, status } = req.body;

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

//     // 🔍 Duplicate check (brand + category + name)
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
//       INSERT INTO quantities (brand_id, category_id, name, status)
//       VALUES (?, ?, ?, ?)
//       `,
//       [brand_id, category_id, name, status || "active"]
//     );

//     const [[quantity]] = await db.query(
//       `
//       SELECT 
//         q.id,
//         q.name,
//         q.status,
//         q.created_at,
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

// /**
//  * GET ALL QUANTITIES
//  */
// export const getAllQuantities = async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT 
//         q.id,
//         q.name,
//         q.status,
//         q.created_at,
//         b.id AS brand_id,
//         b.name AS brand_name,
//         c.id AS category_id,
//         c.name AS category_name
//       FROM quantities q
//       JOIN brands b ON q.brand_id = b.id
//       JOIN categories c ON q.category_id = c.id
//       ORDER BY q.created_at DESC
//     `);

//     res.json(rows);
//   } catch (error) {
//     console.error("Get quantities error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /**
//  * GET QUANTITIES BY BRAND & CATEGORY (🔥 IMPORTANT)
//  */
// export const getQuantitiesByCategory = async (req, res) => {
//   try {
//     const { brand_id, category_id } = req.params;

//     const [rows] = await db.query(
//       `
//       SELECT id, name, status
//       FROM quantities
//       WHERE brand_id = ? AND category_id = ? AND status = 'active'
//       ORDER BY name ASC
//       `,
//       [brand_id, category_id]
//     );

//     res.json(rows);
//   } catch (error) {
//     console.error("Get quantities by category error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /**
//  * GET SINGLE QUANTITY
//  */
// export const getQuantityById = async (req, res) => {
//   try {
//     const [[quantity]] = await db.query(
//       `
//       SELECT 
//         q.*,
//         b.name AS brand_name,
//         c.name AS category_name
//       FROM quantities q
//       JOIN brands b ON q.brand_id = b.id
//       JOIN categories c ON q.category_id = c.id
//       WHERE q.id = ?
//       `,
//       [req.params.id]
//     );

//     if (!quantity) {
//       return res.status(404).json({ message: "Quantity not found" });
//     }

//     res.json(quantity);
//   } catch (error) {
//     console.error("Get quantity error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /**
//  * UPDATE QUANTITY
//  */
// export const updateQuantity = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { brand_id, category_id, name, status } = req.body;

//     // Validate brand if provided
//     if (brand_id) {
//       const [[brand]] = await db.query(
//         "SELECT id FROM brands WHERE id = ?",
//         [brand_id]
//       );
//       if (!brand) {
//         return res.status(400).json({ message: "Invalid brand" });
//       }
//     }

//     // Validate category belongs to brand
//     if (category_id && brand_id) {
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
//         name = COALESCE(?, name),
//         status = COALESCE(?, status)
//       WHERE id = ?
//       `,
//       [brand_id, category_id, name, status, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: "Quantity not found" });
//     }

//     const [[quantity]] = await db.query(
//       `
//       SELECT 
//         q.*,
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

// /**
//  * DELETE QUANTITY
//  */
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


  import db from "../config/db.js";

  /**
   * CREATE QUANTITY
   */
  export const createQuantity = async (req, res) => {
    try {
      const { brand_id, category_id, name, status } = req.body;

      if (!brand_id || !category_id || !name) {
        return res.status(400).json({
          message: "Brand, category and quantity name are required",
        });
      }

      // 🔍 Validate brand
          const [[brand]] = await db.query(
            "SELECT id FROM brands WHERE id = ? AND status = 'active'",
            [brand_id]
          );
      if (!brand) {
        return res.status(400).json({ message: "Invalid brand" });
      }

      // 🔍 Validate category belongs to brand
      const [[category]] = await db.query(
        "SELECT id FROM categories WHERE id = ? AND brand_id = ?",
        [category_id, brand_id]
      );
      if (!category) {
        return res.status(400).json({
          message: "Invalid category for selected brand",
        });
      }

      // 🔍 Duplicate check (brand + category + name)
      const [exists] = await db.query(
        `
        SELECT id FROM quantities
        WHERE brand_id = ? AND category_id = ? AND name = ?
        `,
        [brand_id, category_id, name]
      );

      if (exists.length) {
        return res.status(409).json({
          message: "Quantity already exists for this category",
        });
      }

      const [result] = await db.query(
        `
        INSERT INTO quantities (brand_id, category_id, name, status)
        VALUES (?, ?, ?, ?)
        `,
        [brand_id, category_id, name, status || "active"]
      );

      const [[quantity]] = await db.query(
        `
        SELECT 
          q.id,
          q.name,
          q.status,
          q.created_at,
          b.id AS brand_id,
          b.name AS brand_name,
          c.id AS category_id,
          c.name AS category_name
        FROM quantities q
        JOIN brands b ON q.brand_id = b.id
        JOIN categories c ON q.category_id = c.id
        WHERE q.id = ?
        `,
        [result.insertId]
      );

      res.status(201).json({
        message: "Quantity created successfully",
        quantity,
      });
    } catch (error) {
      console.error("Create quantity error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  /**
   * GET ALL QUANTITIES
   */
  export const getAllQuantities = async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          q.id,
          q.name,
          q.status,
          q.created_at,
          b.id AS brand_id,
          b.name AS brand_name,
          c.id AS category_id,
          c.name AS category_name
        FROM quantities q
        JOIN brands b ON q.brand_id = b.id
        JOIN categories c ON q.category_id = c.id
        ORDER BY q.created_at DESC
      `);

      res.json(rows);
    } catch (error) {
      console.error("Get quantities error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  /**
   * GET QUANTITIES BY BRAND & CATEGORY (🔥 IMPORTANT)
   */
  export const getQuantitiesByCategory = async (req, res) => {
    try {
      const { brand_id, category_id } = req.params;

      const [rows] = await db.query(
        `
        SELECT id, name, status
        FROM quantities
        WHERE brand_id = ? AND category_id = ? AND status = 'active'
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
          q.*,
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
  export const updateQuantity = async (req, res) => {
    try {
      const { id } = req.params;
      const { brand_id, category_id, name, status } = req.body;

      // Validate brand if provided
      if (brand_id) {
        const [[brand]] = await db.query(
        "SELECT id FROM brands WHERE id = ? AND status = 'active'",
        [brand_id]
        );
        if (!brand) {
          return res.status(400).json({ message: "Invalid brand" });
        }
      }

      // Validate category belongs to brand
      if (category_id && brand_id) {
        const [[category]] = await db.query(
          "SELECT id FROM categories WHERE id = ? AND brand_id = ?",
          [category_id, brand_id]
        );
        if (!category) {
          return res.status(400).json({
            message: "Invalid category for selected brand",
          });
        }
      }

      const [result] = await db.query(
        `
        UPDATE quantities
        SET
          brand_id = COALESCE(?, brand_id),
          category_id = COALESCE(?, category_id),
          name = COALESCE(?, name),
          status = COALESCE(?, status)
        WHERE id = ?
        `,
        [brand_id, category_id, name, status, id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Quantity not found" });
      }

      const [[quantity]] = await db.query(
        `
        SELECT 
          q.*,
          b.name AS brand_name,
          c.name AS category_name
        FROM quantities q
        JOIN brands b ON q.brand_id = b.id
        JOIN categories c ON q.category_id = c.id
        WHERE q.id = ?
        `,
        [id]
      );

      res.json({
        message: "Quantity updated successfully",
        quantity,
      });
    } catch (error) {
      console.error("Update quantity error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  /**
   * DELETE QUANTITY
   */
  export const deleteQuantity = async (req, res) => {
    try {
      const [result] = await db.query(
        "DELETE FROM quantities WHERE id = ?",
        [req.params.id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Quantity not found" });
      }

      res.json({ message: "Quantity deleted successfully" });
    } catch (error) {
      console.error("Delete quantity error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
