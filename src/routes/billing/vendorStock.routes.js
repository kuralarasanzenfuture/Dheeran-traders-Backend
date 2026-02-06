import express from "express";
import {
  createVendorStock,
  getVendorStocks,
  getVendorStockById,
  updateVendorStock,
  addVendorStock,
  deleteVendorStock,
  deleteVendorEntry,
} from "../../controllers/billing/vendorStock.controller.js";

import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Vendor Stock Routes
 */
router.post("/", protect, createVendorStock);
router.get("/", protect, getVendorStocks);
router.get("/:id", protect, getVendorStockById);
router.put("/:id", protect, updateVendorStock);
router.patch("/:id/add", protect, addVendorStock);
router.delete("/:id", protect, deleteVendorStock);
router.delete("/entry/:entry_id", protect, deleteVendorEntry);

export default router;
