import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoriesByBrand,
  getBrandCategoryDropdown,
} from "../../../controllers/billing/products/category.controller.js";

import { protect, verifyToken } from "../../../middlewares/auth.middleware.js";
import { checkPermission } from "../../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

// 🔥 STATIC ROUTES FIRST
router.get("/brand-category", getBrandCategoryDropdown);
router.get("/brand/:brand_id", getCategoriesByBrand);

// CRUD
router.post("/", checkPermission("BILLING_CATEGORY", "CREATE"), createCategory);
router.get("/", checkPermission("BILLING_CATEGORY", "VIEW"), getCategories);
router.get("/:id", getCategoryById);
router.put("/:id", checkPermission("BILLING_CATEGORY", "EDIT"), updateCategory);
router.delete(
  "/:id",
  checkPermission("BILLING_CATEGORY", "DELETE"),
  deleteCategory,
);

export default router;
