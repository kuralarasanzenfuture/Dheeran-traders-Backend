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
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", checkPermission("CHIT_BATCHES", "CREATE"), createBatch);                 // Create batch
router.get("/next-batch-name", getNextBatchName); // MUST be before :id
router.get("/",checkPermission("CHIT_BATCHES", "VIEW"), getBatches);                   // Get all batches
router.get("/:id", getBatchById);              // Get one batch
router.put("/:id",checkPermission("CHIT_BATCHES", "EDIT"), updateBatch);               // Update batch
router.delete("/:id",checkPermission("CHIT_BATCHES", "DELETE"), deleteBatch);            // Delete batch

export default router;