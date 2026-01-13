import express from "express";
import {
  createVendorStock,
  getVendorStocks,
  getVendorStockById,
  updateVendorStock,
  addVendorStock,
  deleteVendorStock,
} from "../controllers/vendorStock.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Vendor Stock Routes
 */
router.post("/", protect, createVendorStock);         // Vendor comes (NEW ENTRY)
router.get("/", protect, getVendorStocks);            // All entries
router.get("/:id", protect, getVendorStockById);      // Single entry
router.put("/:id", protect, updateVendorStock);       // Correction
router.patch("/:id/add", protect, addVendorStock);    // Add stock
router.delete("/:id", protect, deleteVendorStock);    // Delete entry

export default router;
