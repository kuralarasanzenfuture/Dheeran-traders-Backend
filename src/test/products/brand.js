import db from "../../config/db.js";

const brands = [
  "Fortune", "Dhara", "Saffola", "Nature Fresh",
  "India Gate", "Daawat", "Kohinoor",
  "Aashirvaad", "Pillsbury", "Nature Fresh Atta",
  "Tata Sampann", "24 Mantra", "Organic Tattva",
  "Madhur", "Dhampur", "Tata Salt",
  "Amul", "Mother Dairy",
  "Britannia", "Parle", "Haldiram’s",
  "Maggi", "Yippee",
  "Patanjali"
];

async function seedBrands() {
  const values = brands.map(b => [b]);

  await db.query(
    "INSERT IGNORE INTO brands (name) VALUES ?",
    [values]
  );

  console.log("✅ Brands seeded");
  process.exit();
}

seedBrands();