import express from "express";
import {
  addPlanToBatch,
  getPlansByBatch,
  removePlanFromBatch
} from "../../controllers/chit/batchPlan.controller.js";

const router = express.Router();

// assign plan to batch
router.post("/", addPlanToBatch);

// get all plans for a batch
router.get("/batch/:batch_id", getPlansByBatch);

// remove mapping
router.delete("/:id", removePlanFromBatch);

export default router;