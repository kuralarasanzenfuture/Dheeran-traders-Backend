import { createBrandsTable } from "./brands.tables.js";
import { createCategoriesTable } from "./categories.tables.js";
import { createQuantityTable } from "./quantity.tables.js";
import { createProductTables } from "./product.tables.js";

export const createMasterTables = async (db) => {
  // 7️⃣ BRANDS TABLE
  await createBrandsTable(db);

  // 8️⃣ CATEGORIES TABLE
  await createCategoriesTable(db);

  // QUANTITY TABLE
  await createQuantityTable(db);

  // 4️⃣ PRODUCTS TABLE
  await createProductTables(db);
};
