import express from "express";
import {
  createQuantity,
  getAllQuantities,
  getQuantityById,
  updateQuantity,
  deleteQuantity,
  getQuantitiesByCategory,
} from "../../../controllers/billing/products/quantityController.js";
import { protect, verifyToken } from "../../../middlewares/auth.middleware.js";
import { checkPermission } from "../../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/",checkPermission("BILLING_QUANTITY", "CREATE"), createQuantity);
router.get("/", checkPermission("BILLING_QUANTITY", "VIEW"), getAllQuantities);
router.get(
  "/brand/:brand_id/category/:category_id",
  getQuantitiesByCategory
);
router.get("/:id", getQuantityById);
router.put("/:id",checkPermission("BILLING_QUANTITY", "EDIT"), updateQuantity);
router.delete("/:id",checkPermission("BILLING_QUANTITY", "DELETE"), deleteQuantity);

export default router;
