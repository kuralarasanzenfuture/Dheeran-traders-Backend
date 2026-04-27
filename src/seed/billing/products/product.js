// INSERT INTO products
// (product_code, product_name, brand, category, quantity,
//  hsn_code, cgst_rate, sgst_rate, gst_total_rate, price, stock)
// VALUES

// ('DTT-PDT-0001', 'Ponni Raw Rice', 'ponmani rice', 'ponni raw rice', '25kg',
//  '1006', 2.5, 2.5, 5.0, 1350.00, 50),

// ('DTT-PDT-0002', 'Ponni Boiled Rice', 'ponmani rice', 'ponni boiled rice', '50kg',
//  '1006', 2.5, 2.5, 5.0, 2600.00, 30),

// ('DTT-PDT-0003', 'Raw Rice', 'sri lalitha rice', 'raw rice', '25kg',
//  '1006', 2.5, 2.5, 5.0, 1250.00, 40),

// ('DTT-PDT-0004', 'Boiled Rice', 'sri lalitha rice', 'boiled rice', '50kg',
//  '1006', 2.5, 2.5, 5.0, 2500.00, 25),

// ('DTT-PDT-0005', 'Sona Masoori Rice', 'annapoorna rice', 'sona masoori rice', '25kg',
//  '1006', 2.5, 2.5, 5.0, 1400.00, 20);

export const seedProducts = async (db) => {
  const data = [
    ['DTT-PDT-0001','Ponni Raw Rice','ponmani rice','ponni raw rice','25kg','1006',2.5,2.5,5.0,1350,1000],
    ['DTT-PDT-0002','Ponni Boiled Rice','ponmani rice','ponni boiled rice','50kg','1006',2.5,2.5,5.0,2600,1000],
    ['DTT-PDT-0003','Raw Rice','sri lalitha rice','raw rice','25kg','1006',2.5,2.5,5.0,1250,4000],
    ['DTT-PDT-0004','Boiled Rice','sri lalitha rice','boiled rice','50kg','1006',2.5,2.5,5.0,2500,2500],
    ['DTT-PDT-0005','Sona Masoori Rice','annapoorna rice','sona masoori rice','25kg','1006',2.5,2.5,5.0,1400,2000],
  ];

  for (const p of data) {
    await db.query(
      `INSERT INTO products
      (product_code, product_name, brand, category, quantity,
       hsn_code, cgst_rate, sgst_rate, gst_total_rate, price, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        price = VALUES(price),
        stock = VALUES(stock),
        gst_total_rate = VALUES(gst_total_rate)`,
      p
    );
  }
};
