// import db from "../../config/db.js";

// // CREATE BATCH
// export const createBatch = async (req, res) => {
//   try {
//     const { batch_name, batch_duration, start_date, end_date, status } = req.body;

//     if (!batch_name || !start_date || !end_date) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     const [result] = await db.query(
//       `INSERT INTO batches
//        (batch_name, batch_duration, start_date, end_date, status)
//        VALUES (?, ?, ?, ?, ?)`,
//       [batch_name, batch_duration, start_date, end_date, status || "WAITING"]
//     );

//     res.status(201).json({
//       message: "Batch created successfully",
//       id: result.insertId,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // GET ALL BATCHES
// export const getBatches = async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM batches ORDER BY id DESC");
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // GET SINGLE BATCH
// export const getBatchById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query("SELECT * FROM batches WHERE id = ?", [id]);

//     if (!rows.length) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // UPDATE BATCH
// export const updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { batch_name, batch_duration, start_date, end_date, status } = req.body;

//     const [result] = await db.query(
//       `UPDATE batches
//        SET batch_name=?, batch_duration=?, start_date=?, end_date=?, status=?
//        WHERE id=?`,
//       [batch_name, batch_duration, start_date, end_date, status, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json({ message: "Batch updated successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // DELETE BATCH
// export const deleteBatch = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [result] = await db.query("DELETE FROM batches WHERE id = ?", [id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json({ message: "Batch deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// import db from "../../config/db.js";

// // helper to calculate status
// const calculateStatus = (start_date, end_date) => {
//   const today = new Date();
//   today.setHours(0,0,0,0);

//   const start = new Date(start_date);
//   const end = new Date(end_date);
//   start.setHours(0,0,0,0);
//   end.setHours(0,0,0,0);

//   if (today < start) return "WAITING";
//   if (today >= start && today <= end) return "ACTIVE";
//   return "CLOSED";
// };

// // CREATE BATCH
// export const createBatch = async (req, res) => {
//   try {
//     const { batch_name, batch_duration, start_date, end_date } = req.body;

//     if (!batch_name || !start_date || !end_date) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     const status = calculateStatus(start_date, end_date);

//     const [result] = await db.query(
//       `INSERT INTO batches
//        (batch_name, batch_duration, start_date, end_date, status)
//        VALUES (?, ?, ?, ?, ?)`,
//       [batch_name, batch_duration, start_date, end_date, status]
//     );

//     res.status(201).json({
//       message: "Batch created successfully",
//       id: result.insertId,
//       status
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // GET ALL BATCHES (auto update status)
// export const getBatches = async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM batches");

//     for (const batch of rows) {
//       const newStatus = calculateStatus(batch.start_date, batch.end_date);

//       if (batch.status !== newStatus) {
//         await db.query(
//           "UPDATE batches SET status=? WHERE id=?",
//           [newStatus, batch.id]
//         );
//         batch.status = newStatus;
//       }
//     }

//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // GET SINGLE BATCH
// export const getBatchById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await db.query("SELECT * FROM batches WHERE id = ?", [id]);
//     if (!rows.length) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     const batch = rows[0];
//     const newStatus = calculateStatus(batch.start_date, batch.end_date);

//     if (batch.status !== newStatus) {
//       await db.query("UPDATE batches SET status=? WHERE id=?", [newStatus, id]);
//       batch.status = newStatus;
//     }

//     res.json(batch);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // UPDATE BATCH
// export const updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { batch_name, batch_duration, start_date, end_date } = req.body;

//     const status = calculateStatus(start_date, end_date);

//     const [result] = await db.query(
//       `UPDATE batches
//        SET batch_name=?, batch_duration=?, start_date=?, end_date=?, status=?
//        WHERE id=?`,
//       [batch_name, batch_duration, start_date, end_date, status, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json({ message: "Batch updated successfully", status });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // DELETE BATCH
// export const deleteBatch = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [result] = await db.query("DELETE FROM batches WHERE id = ?", [id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json({ message: "Batch deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

import db from "../../config/db.js";

// CREATE BATCH (no status column used)
// export const createBatch = async (req, res) => {
//   try {
//     const { batch_name, batch_duration, start_date, end_date } = req.body;

//     if (!batch_name || !start_date || !end_date) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     const [result] = await db.query(
//       `INSERT INTO batches (batch_name, batch_duration, start_date, end_date)
//        VALUES (?, ?, ?, ?)`,
//       [batch_name, batch_duration, start_date, end_date]
//     );

//     res.status(201).json({
//       message: "Batch created successfully",
//       id: result.insertId,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const createBatch = async (req, res) => {
  try {
    const { batch_duration, start_date, end_date } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // // ❌ check duplicate start_date & end_date
    // const [dateExists] = await db.query(
    //   `SELECT id FROM batches WHERE start_date = ? AND end_date = ?`,
    //   [start_date, end_date]
    // );

    // if (dateExists.length > 0) {
    //   return res.status(409).json({
    //     message: "Batch already exists for this start date and end date",
    //   });
    // }

    // ❌ same start_date & end_date not allowed
    const [sameDates] = await db.query(
      `SELECT id FROM batches WHERE start_date = ? AND end_date = ?`,
      [start_date, end_date]
    );

    if (sameDates.length > 0) {
      return res.status(409).json({
        message: "Batch already exists for this date range",
      });
    }

    // ❌ start_date must not fall inside any existing batch
    const [startOverlap] = await db.query(
      `
      SELECT id 
      FROM batches
      WHERE ? BETWEEN start_date AND end_date
      `,
      [start_date]
    );

    if (startOverlap.length > 0) {
      return res.status(409).json({
        message: "Start date already falls inside another batch",
      });
    }

    // get last batch number
    const [rows] = await db.query(`
      SELECT 
        MAX(CAST(SUBSTRING(batch_name, 7) AS UNSIGNED)) AS last_no
      FROM batches
      WHERE batch_name LIKE 'Batch_%'
    `);

    const nextNo = (rows[0].last_no || 0) + 1;
    const batch_name = `Batch_${String(nextNo).padStart(2, "0")}`;

    const [result] = await db.query(
      `INSERT INTO batches (batch_name, batch_duration, start_date, end_date)
       VALUES (?, ?, ?, ?)`,
      [batch_name, batch_duration, start_date, end_date],
    );

    const [newBatch] = await db.query(
      `
  SELECT 
    id,
    batch_name,
    batch_duration,
    start_date,
    end_date,
    created_at,
    updated_at,
    CASE
      WHEN CURDATE() < start_date THEN 'WAITING'
      WHEN CURDATE() BETWEEN start_date AND end_date THEN 'ACTIVE'
      ELSE 'CLOSED'
    END AS status
  FROM batches
  WHERE id = ?
  `,
      [result.insertId],
    );

    res.status(201).json({
      message: "Batch created successfully",
      batch_name,
      id: result.insertId,
      data: newBatch[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL BATCHES (status calculated by DB)
export const getBatches = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        batch_name,
        batch_duration,
        start_date,
        end_date,
        created_at,
        updated_at,
        CASE
          WHEN CURDATE() < start_date THEN 'WAITING'
          WHEN CURDATE() BETWEEN start_date AND end_date THEN 'ACTIVE'
          ELSE 'CLOSED'
        END AS status
      FROM batches
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE BATCH
export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        id,
        batch_name,
        batch_duration,
        start_date,
        end_date,
        created_at,
        updated_at,
        CASE
          WHEN CURDATE() < start_date THEN 'WAITING'
          WHEN CURDATE() BETWEEN start_date AND end_date THEN 'ACTIVE'
          ELSE 'CLOSED'
        END AS status
      FROM batches
      WHERE id = ?
      `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE BATCH
// export const updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { batch_name, batch_duration, start_date, end_date } = req.body;

//     const [result] = await db.query(
//       `UPDATE batches
//        SET batch_name=?, batch_duration=?, start_date=?, end_date=?
//        WHERE id=?`,
//       [batch_name, batch_duration, start_date, end_date, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json({ message: "Batch updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let { batch_name, batch_duration, start_date, end_date } = req.body;

//     if (!batch_name || !start_date || !end_date) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     batch_name = batch_name.trim();

//     // check duplicate except current record
//     const [exists] = await db.query(
//       "SELECT id FROM batches WHERE batch_name = ? AND id != ?",
//       [batch_name, id]
//     );

//     if (exists.length > 0) {
//       return res.status(409).json({ message: "Batch name already exists" });
//     }

//     const [result] = await db.query(
//       `UPDATE batches
//        SET batch_name=?, batch_duration=?, start_date=?, end_date=?
//        WHERE id=?`,
//       [batch_name, batch_duration, start_date, end_date, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Batch not found" });
//     }

//     res.json({ message: "Batch updated successfully" });

//   } catch (err) {
//     // handle DB unique constraint error also
//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({ message: "Batch name already exists" });
//     }
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_duration, start_date, end_date } = req.body;

    if (!batch_duration || !start_date || !end_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        message: "Start date cannot be greater than end date",
      });
    }

    // ❌ same date range (exclude current batch)
    const [sameDates] = await db.query(
      `SELECT id FROM batches 
       WHERE start_date = ? 
         AND end_date = ? 
         AND id != ?`,
      [start_date, end_date, id]
    );

    if (sameDates.length > 0) {
      return res.status(409).json({
        message: "Batch already exists for this date range",
      });
    }

    // ❌ any overlap (start or end inside another batch OR covering another batch)
    const [overlap] = await db.query(
      `
      SELECT id FROM batches
      WHERE id != ?
        AND (
          (? BETWEEN start_date AND end_date)
          OR (? BETWEEN start_date AND end_date)
          OR (start_date BETWEEN ? AND ?)
          OR (end_date BETWEEN ? AND ?)
        )
      `,
      [id, start_date, end_date, start_date, end_date, start_date, end_date]
    );

    if (overlap.length > 0) {
      return res.status(409).json({
        message: "Batch dates overlap with another batch",
      });
    }

    const [result] = await db.query(
      `UPDATE batches
       SET batch_duration=?, start_date=?, end_date=?
       WHERE id=?`,
      [batch_duration, start_date, end_date, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json({ message: "Batch updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE BATCH
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM batches WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    res.json({ message: "Batch deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getNextBatchName = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT batch_name 
      FROM batches 
      ORDER BY id DESC 
      LIMIT 1
    `);

    let nextBatchName = "Batch_01";

    if (rows.length > 0) {
      const lastName = rows[0].batch_name; // ex: Batch_07

      // extract number part
      const match = lastName.match(/(\d+)$/);

      if (!match) {
        return res.status(400).json({
          message: "Invalid batch name format in DB",
        });
      }

      const lastNumber = parseInt(match[1], 10);
      const nextNumber = lastNumber + 1;

      nextBatchName = `Batch_${String(nextNumber).padStart(2, "0")}`;
    }

    res.json({
      last_batch_name: rows.length ? rows[0].batch_name : null,
      next_batch_name: nextBatchName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
