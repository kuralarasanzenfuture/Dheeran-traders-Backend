import express from "express";
import {
  getChitDatabaseStatus,
  clearAllChitData,
  clearChitCategory,
  dropChitTables,
  reinitChitTables,
  resetChitDatabase,
} from "./chitDatabase.controller.js";

const router = express.Router();

// 1. Status / Records count check
router.get("/status", getChitDatabaseStatus);
router.get("/chit/status", getChitDatabaseStatus);

// 2. Clear / Truncate all chit data (resets auto_increment, supports preserve_masters)
router.post("/clear-all-data", clearAllChitData);
router.delete("/clear-all-data", clearAllChitData);
router.post("/chit/clear-all-data", clearAllChitData);
router.delete("/chit/clear-all-data", clearAllChitData);

// 3. Clear targeted category of data (payments, subscriptions, customers, assignments, masters)
router.post("/clear-category", clearChitCategory);
router.delete("/clear-category", clearChitCategory);
router.post("/chit/clear-category", clearChitCategory);
router.delete("/chit/clear-category", clearChitCategory);

// 4. Drop chit tables
router.post("/drop-tables", dropChitTables);
router.delete("/drop-tables", dropChitTables);
router.post("/chit/drop-tables", dropChitTables);
router.delete("/chit/drop-tables", dropChitTables);

// Legacy / alias drop route
router.post("/drop-chit-tables", dropChitTables);
router.delete("/drop-chit-tables", dropChitTables);

// 5. Re-initialize / re-create chit tables
router.post("/reinit-tables", reinitChitTables);
router.post("/chit/reinit-tables", reinitChitTables);

// 6. Complete Reset (Drop + Re-create fresh tables)
router.post("/reset-database", resetChitDatabase);
router.post("/chit/reset-database", resetChitDatabase);

export default router;
