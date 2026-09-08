export const createStockManageTables = async (db) => {
  //   await db.query(`
  //     CREATE TABLE IF NOT EXISTS billing_stock_inventory_ledger (
  //       id INT AUTO_INCREMENT PRIMARY KEY,

  //   product_id INT NOT NULL,

  //   change_qty INT NOT NULL, -- +100, -50
  //   balance_after INT NOT NULL, -- running balance

  //   reference_type ENUM(
  //     'VENDOR_STOCK',
  //     'SALE',
  //     'ADJUSTMENT',
  //     'RETURN'
  //   ) NOT NULL,

  //   reference_id INT, -- entry_id / billing_id

  //   remarks TEXT,

  //   created_by INT,
  //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  //   INDEX idx_product (product_id),

  //   FOREIGN KEY (product_id) REFERENCES products(id)
  //     ON DELETE CASCADE
  // ) ENGINE=InnoDB;
  //     `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS billing_stock_inventory_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,

  product_id INT NOT NULL,

  change_qty INT NOT NULL,
  balance_after INT NOT NULL,

  reference_type VARCHAR(50) NOT NULL, -- 🔥 flexible (NO ENUM)

  reference_id INT,

  remarks TEXT,

  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  /* 🔥 PERFORMANCE INDEXES */
  INDEX idx_product (product_id),
  INDEX idx_product_id_id (product_id, id),

  /* 🔥 RELATIONS */
  CONSTRAINT fk_ledger_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_ledger_user
    FOREIGN KEY (created_by)
    REFERENCES users_roles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB;
    `);
};

// CREATE TABLE inventory_ledger (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   product_id INT NOT NULL,

//   change_qty INT NOT NULL, -- +100, -50
//   balance_after INT NOT NULL, -- running balance

//   reference_type ENUM(
//     'VENDOR_STOCK',
//     'SALE',
//     'ADJUSTMENT',
//     'RETURN'
//   ) NOT NULL,

//   reference_id INT, -- entry_id / billing_id

//   remarks TEXT,

//   created_by INT,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//   INDEX idx_product (product_id),

//   FOREIGN KEY (product_id) REFERENCES products(id)
//     ON DELETE CASCADE
// ) ENGINE=InnoDB;

// // 2.
// // ALTER TABLE products ADD stock INT DEFAULT 0;

// 3.
// HELPER FUNCTION (CRITICAL)

// Create ONE function. Never repeat logic.
// const applyStockChange = async ({
//   conn,
//   product_id,
//   qty_change,
//   reference_type,
//   reference_id,
//   remarks,
//   userId,
// }) => {
//   /* 🔒 LOCK PRODUCT */
//   const [[product]] = await conn.query(
//     `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
//     [product_id]
//   );

//   if (!product) {
//     throw new Error(`Product not found: ${product_id}`);
//   }

//   const newStock = product.stock + qty_change;

//   if (newStock < 0) {
//     throw new Error("Stock cannot go negative");
//   }

//   /* UPDATE PRODUCT CACHE */
//   await conn.query(
//     `UPDATE products SET stock = ? WHERE id = ?`,
//     [newStock, product_id]
//   );

//   /* INSERT LEDGER */
//   await conn.query(
//     `INSERT INTO inventory_ledger
//     (product_id, change_qty, balance_after,
//      reference_type, reference_id, remarks, created_by)
//      VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [
//       product_id,
//       qty_change,
//       newStock,
//       reference_type,
//       reference_id,
//       remarks,
//       userId,
//     ]
//   );
// };

// CREATE VENDOR STOCK

// Replace this:

// UPDATE products SET stock = stock + ?

// 👉 WITH:

// await applyStockChange({
//   conn,
//   product_id,
//   qty_change: total_stock,
//   reference_type: "VENDOR_STOCK",
//   reference_id: entry_id,
//   remarks: "Vendor stock added",
//   userId,
// });
// ✅ UPDATE VENDOR STOCK

// Instead of manual diff logic:

// const diff = new - old;

// 👉 Use:

// await applyStockChange({
//   conn,
//   product_id,
//   qty_change: diff,
//   reference_type: "VENDOR_STOCK",
//   reference_id: id,
//   remarks: "Vendor stock updated",
//   userId,
// });
// ✅ DELETE STOCK
// await applyStockChange({
//   conn,
//   product_id,
//   qty_change: -row.total_stock,
//   reference_type: "VENDOR_STOCK",
//   reference_id: id,
//   remarks: "Vendor stock deleted",
//   userId,
// });

// CREATE VENDOR STOCK

// Replace this:

// UPDATE products SET stock = stock + ?

// 👉 WITH:

// await applyStockChange({
//   conn,
//   product_id,
//   qty_change: total_stock,
//   reference_type: "VENDOR_STOCK",
//   reference_id: entry_id,
//   remarks: "Vendor stock added",
//   userId,
// });
// ✅ UPDATE VENDOR STOCK

// Instead of manual diff logic:

// const diff = new - old;

// 👉 Use:

// await applyStockChange({
//   conn,
//   product_id,
//   qty_change: diff,
//   reference_type: "VENDOR_STOCK",
//   reference_id: id,
//   remarks: "Vendor stock updated",
//   userId,
// });
// ✅ DELETE STOCK
// await applyStockChange({
//   conn,
//   product_id,
//   qty_change: -row.total_stock,
//   reference_type: "VENDOR_STOCK",
//   reference_id: id,
//   remarks: "Vendor stock deleted",
//   userId,
// });

// 🔥 5. WHY THIS IS SUPERIOR
// ❌ Your current system
// Overwrite stock ❌
// Lose history ❌
// Hard to debug ❌
// ✅ Ledger system
// Full history ✅
// Audit-ready ✅
// Debuggable ✅
// Scalable ✅
// Industry standard ✅
// 🧠 REAL WORLD EXAMPLE
// +100  (Vendor)
// -20   (Sale)
// +10   (Return)
// -5    (Adjustment)

// Final = 85

// 👉 You can reconstruct EVERYTHING.

// 💣 HARD TRUTH

// Your current design:

// Good for demo
// Bad for real business

// Ledger system:

// Used in ERP, accounting, warehouses
