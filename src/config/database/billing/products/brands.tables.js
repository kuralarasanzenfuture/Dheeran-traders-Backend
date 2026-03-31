export const createBrandsTable = async (db) => {
  await db.query(`
  CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE

  ) ENGINE=InnoDB
`);

  await seedBrands(db);

};


const seedBrands = async (db) => {
  const brands = [
    // Rice
    'India Gate', 'Daawat', 'Kohinoor', 'Lal Qilla', 'Fortune Basmati', 'Aeroplane Rice',

    // Oil
    'Fortune', 'Saffola', 'Dhara', 'Gemini', 'Gold Winner', 'Freedom Oil',

    // Food
    'Aashirvaad', 'Tata Sampann', 'Patanjali', '24 Mantra Organic',
    'MTR Foods', 'ITC Master Chef', 'Nestle India', 'Britannia', 'Amul', "Haldiram's"
  ];

  for (const name of brands) {
    await db.query(`INSERT IGNORE INTO brands (name) VALUES (?)`, [name]);
  }
};
