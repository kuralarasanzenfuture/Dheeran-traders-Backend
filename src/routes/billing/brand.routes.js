import express from "express";
import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} from "../../controllers/billing/brand.controller.js";

import { protect, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createBrand);
router.get("/", protect, getBrands);
router.get("/:id", protect, getBrandById);
router.put("/:id", protect, updateBrand);
router.delete("/:id", protect, deleteBrand);

export default router;
