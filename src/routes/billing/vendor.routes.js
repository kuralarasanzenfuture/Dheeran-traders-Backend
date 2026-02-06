import express from "express";
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} from "../../controllers/billing/vendor.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createVendor);
router.get("/", protect, getVendors);
router.get("/:id", protect, getVendorById);
router.put("/:id", protect, updateVendor);
router.delete("/:id", protect, deleteVendor);

export default router;
