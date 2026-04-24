export const seedCompanyDetails = async (db) => {
  await db.query(
    `INSERT IGNORE INTO company_details (
      company_name,
      company_quotes,
      company_address,
      district,
      state,
      pincode,
      phone,
      email,
      website,
      disclaimer,
      instruction
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE company_name = company_name`,
    [
      "DHEERAN TRADERS",
      "மனிதனை மனிதனாக மதிப்போம்! வேற்றுமையில் ஒற்றுமை காண்போம்!! செய்வது துணிந்து செய்",
      "Registered: 5/218/1, Pennagaram Main Road, Sogathur",
      "Dharmapuri",
      "Tamil Nadu",
      "636809",
      "9865065260",
      "dheerantradersthennarasu@gmail.com",
      "www.dheerantrades.in",
      "Goods sold under this invoice are unregistered brand names & supply under GST chargeable to 0% tax.",
      "48 மணி நேரத்திற்கு பிறகு திரும்பபெற இயலாது",
    ],
  );
};