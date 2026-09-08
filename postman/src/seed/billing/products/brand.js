
// INSERT IGNORE INTO brands (name) VALUES
// ('Ponmani Rice'),
// ('Ponni Boiled Rice Brand'),
// ('Sri Lalitha Rice'),
// ('Golden Ponni'),
// ('Annapoorna Rice'),
// ('Aachi Ponni Rice'),
// ('Sona Masoori TN Brand'),
// ('Raja Bhog Rice'),
// ('AMK Ponni Rice'),
// ('Thanjavur Ponni Rice');

export const seedTamilNaduRiceBrands = async (db) => {
  const brands = [
    'Ponmani Rice',
    'Ponni Boiled Rice Brand',
    'Sri Lalitha Rice',
    'Golden Ponni',
    'Annapoorna Rice',
    'Aachi Ponni Rice',
    'Sona Masoori TN Brand',
    'Raja Bhog Rice',
    'AMK Ponni Rice',
    'Thanjavur Ponni Rice'
  ];

  for (const name of brands) {
    await db.query(
      `INSERT IGNORE INTO brands (name) VALUES (?)`,
      [name]
    );
  }
};

