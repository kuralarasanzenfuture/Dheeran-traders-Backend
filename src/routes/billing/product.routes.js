import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock,
} from "../../controllers/billing/product.controller.js";

import { protect, adminOnly } from "../../middlewares/auth.middleware.js";
import { verifyAdminPassword } from "../../middlewares/verifyAdminPassword.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/", protect, getProducts);
router.get("/:id", protect, getProductById);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);
/* 🔥 ONLY STOCK UPDATE */
router.patch("/update-stock/:id", verifyAdminPassword, updateProductStock);

export default router;
