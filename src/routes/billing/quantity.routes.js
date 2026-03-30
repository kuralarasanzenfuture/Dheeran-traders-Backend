import express from "express";
import {
  createQuantity,
  getAllQuantities,
  getQuantityById,
  updateQuantity,
  deleteQuantity,
  getQuantitiesByCategory,
} from "../../controllers/billing/quantityController.js";
import { protect, verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createQuantity);
router.get("/", getAllQuantities);
router.get(
  "/brand/:brand_id/category/:category_id",
  getQuantitiesByCategory
);
router.get("/:id", getQuantityById);
router.put("/:id", updateQuantity);
router.delete("/:id", deleteQuantity);

export default router;
