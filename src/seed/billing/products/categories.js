
// INSERT INTO categories (brand_id, name, hsn_code) VALUES

// -- Ponmani Rice
// ((SELECT id FROM brands WHERE name = 'Ponmani Rice'), 'Ponni Raw Rice', '1006'),
// ((SELECT id FROM brands WHERE name = 'Ponmani Rice'), 'Ponni Boiled Rice', '1006'),

// -- Ponni Boiled Rice Brand
// ((SELECT id FROM brands WHERE name = 'Ponni Boiled Rice Brand'), 'Boiled Rice', '1006'),

// -- Sri Lalitha Rice
// ((SELECT id FROM brands WHERE name = 'Sri Lalitha Rice'), 'Raw Rice', '1006'),
// ((SELECT id FROM brands WHERE name = 'Sri Lalitha Rice'), 'Boiled Rice', '1006'),

// -- Golden Ponni
// ((SELECT id FROM brands WHERE name = 'Golden Ponni'), 'Ponni Raw Rice', '1006'),

// -- Annapoorna Rice
// ((SELECT id FROM brands WHERE name = 'Annapoorna Rice'), 'Sona Masoori Rice', '1006'),
// ((SELECT id FROM brands WHERE name = 'Annapoorna Rice'), 'Boiled Rice', '1006'),

// -- Aachi Ponni Rice
// ((SELECT id FROM brands WHERE name = 'Aachi Ponni Rice'), 'Ponni Rice', '1006'),

// -- Sona Masoori TN Brand
// ((SELECT id FROM brands WHERE name = 'Sona Masoori TN Brand'), 'Sona Masoori Rice', '1006'),

// -- Raja Bhog Rice
// ((SELECT id FROM brands WHERE name = 'Raja Bhog Rice'), 'Raw Rice', '1006'),

// -- AMK Ponni Rice
// ((SELECT id FROM brands WHERE name = 'AMK Ponni Rice'), 'Ponni Boiled Rice', '1006'),

// -- Thanjavur Ponni Rice
// ((SELECT id FROM brands WHERE name = 'Thanjavur Ponni Rice'), 'Ponni Raw Rice', '1006'),
// ((SELECT id FROM brands WHERE name = 'Thanjavur Ponni Rice'), 'Ponni Boiled Rice', '1006');

export const seedRiceCategories = async (db) => {
  const data = [
    ['Ponmani Rice', 'Ponni Raw Rice', '1006'],
    ['Ponmani Rice', 'Ponni Boiled Rice', '1006'],

    ['Ponni Boiled Rice Brand', 'Boiled Rice', '1006'],

    ['Sri Lalitha Rice', 'Raw Rice', '1006'],
    ['Sri Lalitha Rice', 'Boiled Rice', '1006'],

    ['Golden Ponni', 'Ponni Raw Rice', '1006'],

    ['Annapoorna Rice', 'Sona Masoori Rice', '1006'],
    ['Annapoorna Rice', 'Boiled Rice', '1006'],

    ['Aachi Ponni Rice', 'Ponni Rice', '1006'],

    ['Sona Masoori TN Brand', 'Sona Masoori Rice', '1006'],

    ['Raja Bhog Rice', 'Raw Rice', '1006'],

    ['AMK Ponni Rice', 'Ponni Boiled Rice', '1006'],

    ['Thanjavur Ponni Rice', 'Ponni Raw Rice', '1006'],
    ['Thanjavur Ponni Rice', 'Ponni Boiled Rice', '1006'],
  ];

  for (const [brand, name, hsn] of data) {
    await db.query(
      `INSERT IGNORE INTO categories (brand_id, name, hsn_code)
       VALUES (
         (SELECT id FROM brands WHERE name = ?),
         ?, ?
       )`,
      [brand, name, hsn]
    );
  }
};
