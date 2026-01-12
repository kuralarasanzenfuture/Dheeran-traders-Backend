import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoriesByBrand,
  getBrandCategoryDropdown,
} from "../controllers/category.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 🔥 STATIC ROUTES FIRST
router.get("/brand-category", protect, getBrandCategoryDropdown);
router.get("/brand/:brand_id", protect, getCategoriesByBrand);

// CRUD
router.post("/", protect, createCategory);
router.get("/", protect, getCategories);
router.get("/:id", protect, getCategoryById);
router.put("/:id", protect, updateCategory);
router.delete("/:id", protect, deleteCategory);

export default router;
