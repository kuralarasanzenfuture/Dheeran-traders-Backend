export const createCollectionPaymentTables = async (db) => {
//   await db.query(`
//     CREATE TABLE IF NOT EXISTS chit_collections_payments (
//     id INT AUTO_INCREMENT PRIMARY KEY,

//     subscription_id INT NULL,
    
//     customer_id INT NOT NULL,

//     collected_by INT NOT NULL,  -- logged-in user ID

//     payment_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,

//     pay_upi DECIMAL(12,2) DEFAULT 0,
//     pay_upi_reference VARCHAR(255) UNIQUE,
//     pay_cheque DECIMAL(12,2) DEFAULT 0,
//     pay_cash DECIMAL(12,2) DEFAULT 0,

//     total_amount DECIMAL(12,2) NOT NULL,

//     remarks TEXT,

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     FOREIGN KEY (subscription_id)
//         REFERENCES chit_customer_subscriptions(id)
//         ON DELETE CASCADE
//         ON UPDATE CASCADE,

//     FOREIGN KEY (customer_id)
//         REFERENCES chit_customers(id)
//         ON DELETE CASCADE
//         ON UPDATE CASCADE,

//     FOREIGN KEY (collected_by)
//         REFERENCES users_roles(id)
//         ON DELETE RESTRICT
//         ON UPDATE CASCADE,

//     -- ✅ Prevent duplicate UPI
//     UNIQUE KEY unique_upi (pay_upi_reference),

//     INDEX idx_subscription (subscription_id),
//     INDEX idx_customer (customer_id),
//     INDEX idx_collected_by (collected_by)
// );
// `);

// 🔹 Payments table
// NO subscription_id
// 🔹 Allocations table
// has:
// installment_id
// subscription_id
// customer_id

await db.query(`
    CREATE TABLE IF NOT EXISTS chit_collections_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    subscription_id INT NULL,
    
    customer_id INT NOT NULL,

    collected_by INT NOT NULL,  -- logged-in user ID

    payment_type ENUM('INSTALLMENT','SUBSCRIPTION','CUSTOMER') NOT NULL,

    payment_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,

    pay_upi DECIMAL(12,2) DEFAULT 0,
    pay_upi_reference VARCHAR(255) UNIQUE,
    pay_cheque DECIMAL(12,2) DEFAULT 0,
    pay_cash DECIMAL(12,2) DEFAULT 0,

    total_amount DECIMAL(12,2) NOT NULL,

    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (subscription_id)
        REFERENCES chit_customer_subscriptions(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES chit_customers(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (collected_by)
        REFERENCES users_roles(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- ✅ Prevent duplicate UPI
    UNIQUE KEY unique_upi (pay_upi_reference),

    INDEX idx_subscription (subscription_id),
    INDEX idx_customer (customer_id),
    INDEX idx_collected_by (collected_by),

    INDEX idx_payment_type (payment_type),

    INDEX idx_payment_datetime (payment_datetime),

    INDEX idx_customer_datetime (customer_id, payment_datetime)
);
`);


await db.query(`
    CREATE TABLE IF NOT EXISTS chit_payment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,

    payment_id INT NOT NULL,
    installment_id INT NOT NULL,

    allocated_amount DECIMAL(12,2) NOT NULL,


    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_id)
        REFERENCES chit_collections_payments(id)
        ON DELETE CASCADE,

    FOREIGN KEY (installment_id)
        REFERENCES chit_customer_installments(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_payment_installment (payment_id, installment_id),

    INDEX idx_payment (payment_id),
    INDEX idx_installment (installment_id),

    INDEX idx_payment_installment (payment_id, installment_id)
);
`);

};


// export const createCollectionPaymentTables = async (db) => {
//   await db.query(`
//     CREATE TABLE IF NOT EXISTS chit_collections_payments (
//     id INT AUTO_INCREMENT PRIMARY KEY,

//     subscription_id INT NOT NULL,

//     installment_id INT NOT NULL,
    
//     customer_id INT NOT NULL,

//     collected_by INT NOT NULL,  -- logged-in user ID

//     payment_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,

//     pay_upi DECIMAL(12,2) DEFAULT 0,
//     pay_upi_reference VARCHAR(255) UNIQUE,
//     pay_cheque DECIMAL(12,2) DEFAULT 0,
//     pay_cash DECIMAL(12,2) DEFAULT 0,

//     total_amount DECIMAL(12,2) NOT NULL,

//     remarks TEXT,

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     -- 🔗 FKs
//     FOREIGN KEY (installment_id)
//         REFERENCES chit_customer_installments(id)
//         ON DELETE CASCADE
//         ON UPDATE CASCADE,

//     FOREIGN KEY (subscription_id)
//         REFERENCES chit_customer_subscriptions(id)
//         ON DELETE CASCADE
//         ON UPDATE CASCADE,

//     FOREIGN KEY (customer_id)
//         REFERENCES chit_customers(id)
//         ON DELETE CASCADE
//         ON UPDATE CASCADE,

//     FOREIGN KEY (collected_by)
//         REFERENCES users_roles(id)
//         ON DELETE RESTRICT
//         ON UPDATE CASCADE,

//     -- ✅ Prevent duplicate UPI
//     UNIQUE KEY unique_upi (pay_upi_reference),

//     INDEX idx_installment (installment_id)
// );
// `);
// /* =========================================================
//    🔧 2. INSTALLMENT BASED PAYMENT (STRICT) 
//    ========================================================= */
// export const collectPaymentByInstallment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       installment_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* 1️⃣ BASIC VALIDATION */

//     if (!installment_id) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "installment_id is required",
//       });
//     }

//     if (!collected_by) {
//       await connection.rollback();
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     /* 2️⃣ FETCH INSTALLMENT + LOCK */

//     const [rows] = await connection.query(
//       `SELECT 
//           i.*,
//           s.customer_id
//        FROM chit_customer_installments i
//        JOIN chit_customer_subscriptions s 
//          ON i.subscription_id = s.id
//        WHERE i.id = ?
//        FOR UPDATE`,
//       [installment_id],
//     );

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         message: "Invalid installment_id",
//       });
//     }

//     const inst = rows[0];

//     /* 3️⃣ FULL SUBSCRIPTION CHECK (IMPORTANT) */

//     const [summary] = await connection.query(
//       `SELECT 
//           SUM(installment_amount) AS total_amount,
//           SUM(paid_amount) AS total_paid
//        FROM chit_customer_installments
//        WHERE subscription_id = ?`,
//       [inst.subscription_id],
//     );

//     const totalAmount = Number(summary[0].total_amount || 0);
//     const totalPaid = Number(summary[0].total_paid || 0);

//     if (totalPaid >= totalAmount) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Full due already completed",
//       });
//     }

//     /* 4️⃣ SANITIZE INPUT */

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     if (upi < 0 || cheque < 0 || cash < 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Payment cannot be negative",
//       });
//     }

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Enter valid payment amount",
//       });
//     }

//     /* 5️⃣ PENDING CHECK */

//     const pending = Number(inst.installment_amount) - Number(inst.paid_amount);

//     if (pending <= 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Installment already fully paid",
//       });
//     }

//     if (total_amount > pending) {
//       await connection.rollback();
//       return res.status(400).json({
//         success: false,
//         message: `Payment exceeds pending amount (${pending})`,
//       });
//     }

//     /* 6️⃣ UPI VALIDATION */

//     if (upi > 0) {
//       if (!pay_upi_reference) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "UPI reference is required",
//         });
//       }

//       const [dup] = await connection.query(
//         `SELECT id FROM chit_collections_payments
//          WHERE pay_upi_reference = ?
//          LIMIT 1`,
//         [pay_upi_reference],
//       );

//       if (dup.length > 0) {
//         await connection.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "Duplicate UPI reference",
//         });
//       }
//     }

//     /* 7️⃣ UPDATE INSTALLMENT */

//     const newPaid = Number(inst.paid_amount) + total_amount;

//     // const installmentAmount = Number(inst.installment_amount);
//     // const updatedPaid = Number(inst.paid_amount) + total_amount;

//     // const safePaid = Math.min(updatedPaid, installmentAmount);

//     // let status = "PARTIAL";
//     // if (safePaid >= installmentAmount) {
//     //   status = "PAID";
//     // }

//     const installmentAmount = Number(inst.installment_amount);
//     const previousPaid = Number(inst.paid_amount);
//     const updatedPaid = previousPaid + total_amount;

//     const safePaid = Math.min(updatedPaid, installmentAmount);
//     const pendingAfter = installmentAmount - safePaid;

//     // normalize date
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const dueDate = new Date(inst.due_date); // MUST exist
//     dueDate.setHours(0, 0, 0, 0);

//     let status;

//     // ✅ FULLY PAID
//     if (safePaid >= installmentAmount) {
//       if (today < dueDate) {
//         status = "BEFOREPAID"; // early payment
//       } else {
//         status = "PAID";
//       }
//     }

//     // ❌ NOT FULLY PAID
//     else {
//       if (today > dueDate) {
//         status = "OVERDUE";
//       } else {
//         if (safePaid === 0) {
//           status = "PENDING";
//         } else {
//           status = "PARTIAL";
//         }
//       }
//     }

//     await connection.query(
//       `UPDATE chit_customer_installments
//    SET paid_amount = ?, status = ?
//    WHERE id = ?`,
//       [safePaid, status, installment_id],
//     );

//     /* 8️⃣ INSERT PAYMENT */

//     await connection.query(
//       `INSERT INTO chit_collections_payments
//       (
//         subscription_id,
//         installment_id,
//         customer_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks
//       )
//       VALUES (?,?,?,?,?,?,?,?,?,?)`,
//       [
//         inst.subscription_id,
//         installment_id,
//         inst.customer_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//       ],
//     );

//     await connection.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Installment payment successful",
//       data: {
//         installment_id,
//         paid_now: total_amount,
//         total_paid: newPaid,
//         pending: pending - total_amount,
//         pending: pendingAfter,
//         status,
//       },
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error(err);

//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(400).json({
//         success: false,
//         message: "UPI reference must be unique",
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };

// };


// {
// await db.query(`
// CREATE TABLE IF NOT EXISTS chit_collections_payments (
//     id INT AUTO_INCREMENT PRIMARY KEY,

//     installment_id INT NOT NULL,

//     collected_by INT NOT NULL,

//     payment_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,

//     pay_upi DECIMAL(12,2) DEFAULT 0,
//     pay_upi_reference VARCHAR(255),

//     pay_cheque DECIMAL(12,2) DEFAULT 0,
//     pay_cash DECIMAL(12,2) DEFAULT 0,

//     total_amount DECIMAL(12,2) NOT NULL,

//     remarks TEXT,

//     idempotency_key VARCHAR(255),

//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//     -- 🔗 FK
//     FOREIGN KEY (installment_id)
//         REFERENCES chit_customer_installments(id)
//         ON DELETE CASCADE,

//     FOREIGN KEY (collected_by)
//         REFERENCES users_roles(id)
//         ON DELETE RESTRICT,

//     -- ✅ Prevent duplicate UPI
//     UNIQUE KEY unique_upi (pay_upi_reference),

//     -- ✅ Prevent duplicate request replay
//     UNIQUE KEY unique_idempotency (idempotency_key),

//     -- ✅ Prevent exact duplicate insert (fallback safety)
//     UNIQUE KEY unique_guard (installment_id, total_amount, payment_datetime),

//     INDEX idx_installment (installment_id)
// );
// `);

// postman
// {
//   "installment_id": 1,
// //   "pay_upi": 2000,
//   "pay_cheque": 0,
//   "pay_cash": 425,
//   "pay_upi_reference": "UPI_TXN_123456",
//   "remarks": "March installment payment",
//   "idempotency_key": "txn-001-unique"
// }

// export const collectPaymentByInstallment = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       installment_id,
//       pay_upi = 0,
//       pay_cheque = 0,
//       pay_cash = 0,
//       pay_upi_reference,
//       remarks,
//       idempotency_key, // 🔥 NEW
//     } = req.body;

//     const collected_by = req.user?.id;

//     /* 1️⃣ BASIC VALIDATION */

//     if (!installment_id) {
//       throw new Error("installment_id is required");
//     }

//     if (!collected_by) {
//       throw new Error("Unauthorized");
//     }

//     if (!idempotency_key) {
//       throw new Error("idempotency_key is required");
//     }

//     /* 2️⃣ IDEMPOTENCY CHECK */

//     const [existingKey] = await connection.query(
//       `SELECT id FROM chit_collections_payments WHERE idempotency_key = ?`,
//       [idempotency_key]
//     );

//     if (existingKey.length > 0) {
//       await connection.rollback();
//       return res.status(200).json({
//         success: true,
//         message: "Payment already processed",
//       });
//     }

//     /* 3️⃣ FETCH INSTALLMENT (LOCK) */

//     const [rows] = await connection.query(
//       `SELECT * FROM chit_customer_installments
//        WHERE id = ?
//        FOR UPDATE`,
//       [installment_id]
//     );

//     if (rows.length === 0) {
//       throw new Error("Invalid installment_id");
//     }

//     const inst = rows[0];

//     /* 4️⃣ PAYMENT SANITIZE */

//     const upi = Number(pay_upi) || 0;
//     const cheque = Number(pay_cheque) || 0;
//     const cash = Number(pay_cash) || 0;

//     if (upi < 0 || cheque < 0 || cash < 0) {
//       throw new Error("Invalid payment values");
//     }

//     const total_amount = upi + cheque + cash;

//     if (total_amount <= 0) {
//       throw new Error("Enter valid payment amount");
//     }

//     /* 5️⃣ PENDING CHECK */

//     const installmentAmount = Number(inst.installment_amount);
//     const previousPaid = Number(inst.paid_amount);

//     const pending = installmentAmount - previousPaid;

//     if (pending <= 0) {
//       throw new Error("Installment already fully paid");
//     }

//     if (total_amount > pending) {
//       throw new Error(`Payment exceeds pending (${pending})`);
//     }

//     /* 6️⃣ UPI VALIDATION */

//     if (upi > 0) {
//       if (!pay_upi_reference) {
//         throw new Error("UPI reference required");
//       }

//       const [dup] = await connection.query(
//         `SELECT id FROM chit_collections_payments WHERE pay_upi_reference = ?`,
//         [pay_upi_reference]
//       );

//       if (dup.length > 0) {
//         throw new Error("Duplicate UPI reference");
//       }
//     }

//     /* 7️⃣ CALCULATE NEW VALUES */

//     const updatedPaid = previousPaid + total_amount;
//     const safePaid = Math.min(updatedPaid, installmentAmount);
//     const pendingAfter = installmentAmount - safePaid;

//     // date logic
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const dueDate = new Date(inst.due_date);
//     dueDate.setHours(0, 0, 0, 0);

//     let status;

//     if (safePaid >= installmentAmount) {
//       status = today < dueDate ? "BEFOREPAID" : "PAID";
//     } else {
//       if (today > dueDate) {
//         status = "OVERDUE";
//       } else {
//         status = safePaid === 0 ? "PENDING" : "PARTIAL";
//       }
//     }

//     /* 8️⃣ UPDATE INSTALLMENT */

//     await connection.query(
//       `UPDATE chit_customer_installments
//        SET paid_amount = ?, status = ?
//        WHERE id = ?`,
//       [safePaid, status, installment_id]
//     );

//     /* 9️⃣ INSERT PAYMENT */

//     await connection.query(
//       `INSERT INTO chit_collections_payments
//       (
//         installment_id,
//         collected_by,
//         pay_upi,
//         pay_upi_reference,
//         pay_cheque,
//         pay_cash,
//         total_amount,
//         remarks,
//         idempotency_key
//       )
//       VALUES (?,?,?,?,?,?,?,?,?)`,
//       [
//         installment_id,
//         collected_by,
//         upi,
//         pay_upi_reference || null,
//         cheque,
//         cash,
//         total_amount,
//         remarks || null,
//         idempotency_key,
//       ]
//     );

//     await connection.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Payment successful",
//       data: {
//         installment_id,
//         paid_now: total_amount,
//         total_paid: safePaid,
//         pending: pendingAfter,
//         status,
//       },
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error(err);

//     return res.status(400).json({
//       success: false,
//       message: err.message || "Server error",
//     });
//   } finally {
//     connection.release();
//   }
// };
// }