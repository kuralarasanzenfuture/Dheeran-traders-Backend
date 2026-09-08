import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock,
} from "../../../controllers/billing/products/product.controller.js";

import {
  protect,
  adminOnly,
  verifyToken,
} from "../../../middlewares/auth.middleware.js";
import { verifyAdminPassword } from "../../../middlewares/verifyAdminPassword.js";
import { checkPermission } from "../../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
/* 🔥 ONLY STOCK UPDATE */
router.patch("/update-stock/:id", verifyAdminPassword, updateProductStock);

export default router;
