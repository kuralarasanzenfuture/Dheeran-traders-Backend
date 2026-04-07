import express from "express";
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} from "../../controllers/billing/vendor.controller.js";
import { protect, verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/",checkPermission("BILLING_VENDOR", "CREATE"), createVendor);
router.get("/",checkPermission("BILLING_VENDOR", "VIEW"), getVendors);
router.get("/:id", getVendorById);
router.put("/:id",checkPermission("BILLING_VENDOR", "EDIT"), updateVendor);
router.delete("/:id",checkPermission("BILLING_VENDOR", "DELETE"), deleteVendor);

export default router;
