export const applyStockChange = async ({
  conn,
  product_id,
  qty_change,
  reference_type,
  reference_id,
  remarks,
  userId,
}) => {
  /* 🔒 LOCK PRODUCT */
  const [[product]] = await conn.query(
    `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
    [product_id]
  );

  if (!product) throw new Error("Product not found");

  const newStock = product.stock + qty_change;

  if (newStock < 0) {
    throw new Error("Insufficient stock");
  }

  /* UPDATE CACHE */
  await conn.query(
    `UPDATE products SET stock = ? WHERE id = ?`,
    [newStock, product_id]
  );

  /* LEDGER ENTRY */
  await conn.query(
    `INSERT INTO billing_stock_inventory_ledger
    (product_id, change_qty, balance_after,
     reference_type, reference_id, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      product_id,
      qty_change,
      newStock,
      reference_type,
      reference_id,
      remarks,
      userId,
    ]
  );

  return newStock;
};