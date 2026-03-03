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
export const createBatch = async (req, res) => {
  try {
    const { batch_name, batch_duration, start_date, end_date } = req.body;

    if (!batch_name || !start_date || !end_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [result] = await db.query(
      `INSERT INTO batches (batch_name, batch_duration, start_date, end_date)
       VALUES (?, ?, ?, ?)`,
      [batch_name, batch_duration, start_date, end_date]
    );

    res.status(201).json({
      message: "Batch created successfully",
      id: result.insertId,
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
      [id]
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
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_name, batch_duration, start_date, end_date } = req.body;

    const [result] = await db.query(
      `UPDATE batches
       SET batch_name=?, batch_duration=?, start_date=?, end_date=?
       WHERE id=?`,
      [batch_name, batch_duration, start_date, end_date, id]
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