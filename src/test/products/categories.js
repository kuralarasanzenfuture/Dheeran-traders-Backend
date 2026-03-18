import db from "../../config/db.js";

const categoryData = {
  "India Gate": [
    { name: "Basmati Rice", hsn: "10063020" },
    { name: "Premium Rice", hsn: "10063020" }
  ],

  "Daawat": [
    { name: "Basmati Rice", hsn: "10063020" }
  ],

  "Fortune": [
    { name: "Sunflower Oil", hsn: "15121110" },
    { name: "Mustard Oil", hsn: "15149100" },
    { name: "Refined Oil", hsn: "15121900" }
  ],

  "Aashirvaad": [
    { name: "Wheat Atta", hsn: "11010000" },
    { name: "Multigrain Atta", hsn: "11010000" }
  ],

  "Tata Sampann": [
    { name: "Toor Dal", hsn: "07136000" },
    { name: "Moong Dal", hsn: "07133100" }
  ],

  "Madhur": [
    { name: "Sugar", hsn: "17019910" }
  ],

  "Tata Salt": [
    { name: "Salt", hsn: "25010010" }
  ],

  "Amul": [
    { name: "Butter", hsn: "04051000" },
    { name: "Milk", hsn: "04011000" }
  ],

  "Britannia": [
    { name: "Biscuits", hsn: "19053100" }
  ],

  "Maggi": [
    { name: "Noodles", hsn: "19023010" }
  ],

  "Patanjali": [
    { name: "Atta", hsn: "11010000" },
    { name: "Ghee", hsn: "04059020" }
  ]
};

async function seedCategories() {

  for (const brandName in categoryData) {

    // 🔎 Get brand id
    const [rows] = await db.query(
      "SELECT id FROM brands WHERE name = ?",
      [brandName]
    );

    if (!rows.length) {
      console.log(`⚠️ Brand not found: ${brandName}`);
      continue;
    }

    const brandId = rows[0].id;

    for (const cat of categoryData[brandName]) {
      await db.query(
        `INSERT IGNORE INTO categories (brand_id, name, hsn_code)
         VALUES (?, ?, ?)`,
        [brandId, cat.name, cat.hsn]
      );
    }
  }

  console.log("✅ Categories seeded");
  process.exit();
}

seedCategories();