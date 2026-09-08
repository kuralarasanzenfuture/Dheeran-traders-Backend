import express from "express";
import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} from "../../../controllers/billing/products/brand.controller.js";

import {
  protect,
  adminOnly,
  verifyToken,
} from "../../../middlewares/auth.middleware.js";
import { checkPermission } from "../../../middlewares/permission/permission.middleware.js";

const router = express.Router();

// router.use(protect);
router.use(verifyToken);

router.post("/", createBrand);
router.get("/", getBrands);
router.get("/:id", getBrandById);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;
