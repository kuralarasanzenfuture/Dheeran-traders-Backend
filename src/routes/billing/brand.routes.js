import express from "express";
import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} from "../../controllers/billing/brand.controller.js";

import { protect, adminOnly, verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(protect);
router.use(verifyToken);

router.post("/",  createBrand);
router.get("/", getBrands);
router.get("/:id", getBrandById);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;
