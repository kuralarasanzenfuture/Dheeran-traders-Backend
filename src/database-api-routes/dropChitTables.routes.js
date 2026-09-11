import express from "express";
import { dropChitTables } from "./chitDatabase.controller.js";

const router = express.Router();

router.post("/drop-chit-tables", dropChitTables);
router.delete("/drop-chit-tables", dropChitTables);

export default router;
