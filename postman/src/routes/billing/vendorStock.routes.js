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

import { protect, verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Vendor Stock Routes
 */

router.use(verifyToken);

router.post("/", createVendorStock);
router.get("/", getVendorStocks);
router.get("/:id", getVendorStockById);
router.put("/:id", updateVendorStock);
router.patch("/:id/add", addVendorStock);
router.delete("/:id", deleteVendorStock);
router.delete("/entry/:entry_id", deleteVendorEntry);

export default router;
