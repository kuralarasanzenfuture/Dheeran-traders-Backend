import express from "express";
import {
  createArea,
  getAreas,
  updateArea,
  deleteArea
} from "../../controllers/billing/areas.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// CREATE
router.post("/", createArea);

// GET ALL
router.get("/", getAreas);

// UPDATE
router.put("/:id", updateArea);

// DELETE (soft)
router.delete("/:id", deleteArea);

export default router;