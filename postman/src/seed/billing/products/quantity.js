

// INSERT INTO quantities (brand_id, category_id, name) VALUES

// -- Ponmani Rice - Ponni Raw Rice
// (
//  (SELECT id FROM brands WHERE name = 'Ponmani Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Ponmani Rice' AND c.name = 'Ponni Raw Rice'),
//  '25kg'
// ),
// (
//  (SELECT id FROM brands WHERE name = 'Ponmani Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Ponmani Rice' AND c.name = 'Ponni Raw Rice'),
//  '50kg'
// ),

// -- Ponmani Rice - Ponni Boiled Rice
// (
//  (SELECT id FROM brands WHERE name = 'Ponmani Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Ponmani Rice' AND c.name = 'Ponni Boiled Rice'),
//  '25kg'
// ),
// (
//  (SELECT id FROM brands WHERE name = 'Ponmani Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Ponmani Rice' AND c.name = 'Ponni Boiled Rice'),
//  '50kg'
// ),

// -- Sri Lalitha Rice
// (
//  (SELECT id FROM brands WHERE name = 'Sri Lalitha Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Sri Lalitha Rice' AND c.name = 'Raw Rice'),
//  '25kg'
// ),
// (
//  (SELECT id FROM brands WHERE name = 'Sri Lalitha Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Sri Lalitha Rice' AND c.name = 'Boiled Rice'),
//  '50kg'
// ),

// -- Annapoorna Rice
// (
//  (SELECT id FROM brands WHERE name = 'Annapoorna Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Annapoorna Rice' AND c.name = 'Sona Masoori Rice'),
//  '25kg'
// ),

// -- Thanjavur Ponni Rice
// (
//  (SELECT id FROM brands WHERE name = 'Thanjavur Ponni Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Thanjavur Ponni Rice' AND c.name = 'Ponni Raw Rice'),
//  '25kg'
// ),
// (
//  (SELECT id FROM brands WHERE name = 'Thanjavur Ponni Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Thanjavur Ponni Rice' AND c.name = 'Ponni Boiled Rice'),
//  '50kg'
// ),

// -- AMK Ponni Rice
// (
//  (SELECT id FROM brands WHERE name = 'AMK Ponni Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'AMK Ponni Rice' AND c.name = 'Ponni Boiled Rice'),
//  '25kg'
// ),

// -- Raja Bhog Rice
// (
//  (SELECT id FROM brands WHERE name = 'Raja Bhog Rice'),
//  (SELECT c.id FROM categories c JOIN brands b ON c.brand_id = b.id 
//   WHERE b.name = 'Raja Bhog Rice' AND c.name = 'Raw Rice'),
//  '25kg'
// );

export const seedRiceQuantities = async (db) => {
  const data = [
    ['Ponmani Rice', 'Ponni Raw Rice', '25kg'],
    ['Ponmani Rice', 'Ponni Raw Rice', '50kg'],
    ['Ponmani Rice', 'Ponni Boiled Rice', '25kg'],
    ['Ponmani Rice', 'Ponni Boiled Rice', '50kg'],

    ['Sri Lalitha Rice', 'Raw Rice', '25kg'],
    ['Sri Lalitha Rice', 'Boiled Rice', '50kg'],

    ['Annapoorna Rice', 'Sona Masoori Rice', '25kg'],

    ['Thanjavur Ponni Rice', 'Ponni Raw Rice', '25kg'],
    ['Thanjavur Ponni Rice', 'Ponni Boiled Rice', '50kg'],

    ['AMK Ponni Rice', 'Ponni Boiled Rice', '25kg'],

    ['Raja Bhog Rice', 'Raw Rice', '25kg'],
  ];

  for (const [brand, category, qty] of data) {
    await db.query(
      `INSERT IGNORE INTO quantities (brand_id, category_id, name)
       VALUES (
         (SELECT id FROM brands WHERE name = ?),
         (SELECT c.id FROM categories c
            JOIN brands b ON c.brand_id = b.id
          WHERE b.name = ? AND c.name = ?),
         ?
       )`,
      [brand, brand, category, qty]
    );
  }
};
