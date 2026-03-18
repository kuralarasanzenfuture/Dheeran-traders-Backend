import db from "../../config/db.js";

const quantityMap = {
  // 🌾 Rice brands
  "India Gate": {
    "Basmati Rice": ["1 Kg", "5 Kg", "10 Kg"]
  },

  "Daawat": {
    "Basmati Rice": ["1 Kg", "5 Kg"]
  },

  // 🛢️ Oils
  "Fortune": {
    "Sunflower Oil": ["1 Litre", "2 Litre", "5 Litre"],
    "Mustard Oil": ["1 Litre", "5 Litre"]
  },

  "Dhara": {
    "Sunflower Oil": ["1 Litre", "5 Litre"]
  },

  // 🌾 Atta
  "Aashirvaad": {
    "Wheat Atta": ["2 Kg", "5 Kg", "10 Kg"]
  },

  "Pillsbury": {
    "Wheat Atta": ["5 Kg", "10 Kg"]
  },

  // 🫘 Dal
  "Tata Sampann": {
    "Toor Dal": ["500 g", "1 Kg", "2 Kg"],
    "Moong Dal": ["500 g", "1 Kg"]
  },

  // 🧂 Sugar & Salt
  "Madhur": {
    "Sugar": ["1 Kg", "5 Kg"]
  },

  "Tata Salt": {
    "Salt": ["1 Kg", "2 Kg"]
  },

  // 🥛 Dairy
  "Amul": {
    "Butter": ["100 g", "500 g"]
  },

  // 🍪 Snacks
  "Britannia": {
    "Biscuits": ["100 g", "200 g", "500 g"]
  },

  // 🍜 Instant
  "Maggi": {
    "Noodles": ["280 g", "420 g"]
  }
};

async function seedQuantities() {

  for (const brandName in quantityMap) {

    // 🔎 Get brand id
    const [brandRows] = await db.query(
      "SELECT id FROM brands WHERE name = ?",
      [brandName]
    );

    if (!brandRows.length) continue;

    const brandId = brandRows[0].id;

    for (const categoryName in quantityMap[brandName]) {

      // 🔎 Get category id
      const [catRows] = await db.query(
        "SELECT id FROM categories WHERE brand_id = ? AND name = ?",
        [brandId, categoryName]
      );

      if (!catRows.length) continue;

      const categoryId = catRows[0].id;

      const quantities = quantityMap[brandName][categoryName];

      for (const q of quantities) {

        await db.query(
          `INSERT IGNORE INTO quantities
           (brand_id, category_id, name)
           VALUES (?, ?, ?)`,
          [brandId, categoryId, q]
        );
      }
    }
  }

  console.log("✅ Quantities seeded");
  process.exit();
}

seedQuantities();