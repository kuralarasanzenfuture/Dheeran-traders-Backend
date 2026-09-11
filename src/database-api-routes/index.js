import express from "express";
import chitDatabaseRoutes from "./chitDatabase.routes.js";
import dropChitTablesRoutes from "./dropChitTables.routes.js";

const router = express.Router();

router.use("/", chitDatabaseRoutes);
router.use("/", dropChitTablesRoutes);

export default router;
