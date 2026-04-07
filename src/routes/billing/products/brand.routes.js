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

router.post("/", checkPermission("BILLING_BRAND", "CREATE"), createBrand);
router.get("/", checkPermission("BILLING_BRAND", "VIEW"), getBrands);
router.get("/:id", getBrandById);
router.put("/:id", checkPermission("BILLING_BRAND", "EDIT"), updateBrand);
router.delete("/:id", checkPermission("BILLING_BRAND", "DELETE"), deleteBrand);

export default router;
