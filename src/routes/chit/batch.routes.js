import express from "express";
import {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
} from "../../controllers/chit/batch.controllers.js";

const router = express.Router();

router.post("/", createBatch);        // Create batch
router.get("/", getBatches);          // Get all batches
router.get("/:id", getBatchById);     // Get one batch
router.put("/:id", updateBatch);      // Update batch
router.delete("/:id", deleteBatch);   // Delete batch

export default router;