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

router.use(protect);

router.post("/", createVendor);
router.get("/", getVendors);
router.get("/:id", getVendorById);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

export default router;
