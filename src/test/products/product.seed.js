import db from "../../config/db.js";

const brands = [
  "Fortune",
  "India Gate",
  "Daawat",
  "Aashirvaad",
  "Tata Sampann",
  "Patanjali",
  "Dhara",
  "Saffola",
  "Nature Fresh",
  "24 Mantra"
];

const categories = [
  { name: "Basmati Rice", hsn: "10063020", gst: 5 },
  { name: "Non-Basmati Rice", hsn: "10063090", gst: 5 },
  { name: "Sunflower Oil", hsn: "15121110", gst: 5 },
  { name: "Mustard Oil", hsn: "15149100", gst: 5 },
  { name: "Wheat Atta", hsn: "11010000", gst: 0 },
  { name: "Toor Dal", hsn: "07136000", gst: 0 },
  { name: "Sugar", hsn: "17019910", gst: 5 },
  { name: "Salt", hsn: "25010010", gst: 0 }
];

const quantities = [
  "500 g",
  "1 Kg",
  "2 Kg",
  "5 Kg",
  "10 Kg",
  "1 Litre",
  "2 Litre",
  "5 Litre"
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice(category) {
  const base = {
    "Basmati Rice": 120,
    "Non-Basmati Rice": 60,
    "Sunflower Oil": 150,
    "Mustard Oil": 170,
    "Wheat Atta": 50,
    "Toor Dal": 140,
    "Sugar": 45,
    "Salt": 20
  };

  return (base[category] + Math.random() * 120).toFixed(2);
}

async function seedProducts(count = 1500) {
  console.log(`🌱 Seeding ${count} products...`);

  const values = [];

  for (let i = 1; i <= count; i++) {
    const brand = random(brands);
    const categoryObj = random(categories);
    const quantity = random(quantities);

    const productName = `${brand} ${categoryObj.name} ${quantity}`;
    const code = `P${String(i).padStart(6, "0")}`;

    const gst = categoryObj.gst;
    const cgst = gst / 2;
    const sgst = gst / 2;

    const price = randomPrice(categoryObj.name);
    const stock = Math.floor(Math.random() * 500);

    values.push([
      code,
      productName,
      brand,
      categoryObj.name,
      quantity,
      categoryObj.hsn,
      cgst,
      sgst,
      gst,
      price,
      stock
    ]);
  }

  await db.query(
    `INSERT IGNORE INTO products
     (product_code, product_name, brand, category, quantity,
      hsn_code, cgst_rate, sgst_rate, gst_total_rate,
      price, stock)
     VALUES ?`,
    [values]
  );

  console.log("✅ Bulk seeding complete");
  process.exit();
}

seedProducts();