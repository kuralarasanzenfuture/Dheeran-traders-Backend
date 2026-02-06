import express from "express";
import {
  createQuantity,
  getAllQuantities,
  getQuantityById,
  updateQuantity,
  deleteQuantity,
  getQuantitiesByCategory,
} from "../../controllers/billing/quantityController.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createQuantity);
router.get("/", protect, getAllQuantities);
router.get(
  "/brand/:brand_id/category/:category_id",
  protect,
  getQuantitiesByCategory
);
router.get("/:id", protect, getQuantityById);
router.put("/:id", protect, updateQuantity);
router.delete("/:id", protect, deleteQuantity);

export default router;
