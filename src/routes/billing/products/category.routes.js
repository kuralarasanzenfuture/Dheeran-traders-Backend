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

const router = express.Router();

router.use(verifyToken);

// 🔥 STATIC ROUTES FIRST
router.get("/brand-category", getBrandCategoryDropdown);
router.get("/brand/:brand_id", getCategoriesByBrand);

// CRUD
router.post("/", createCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
