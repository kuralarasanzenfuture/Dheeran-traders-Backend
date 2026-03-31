import express from "express";
import {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getNextBatchName,
} from "../../controllers/chit/batch.controllers.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(verifyToken);

router.post("/", createBatch);                 // Create batch
router.get("/next-batch-name", getNextBatchName); // MUST be before :id
router.get("/", getBatches);                   // Get all batches
router.get("/:id", getBatchById);              // Get one batch
router.put("/:id", updateBatch);               // Update batch
router.delete("/:id", deleteBatch);            // Delete batch

export default router;