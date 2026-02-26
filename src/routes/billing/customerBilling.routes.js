import express from "express";
import {
  brandWiseReport,
  createCustomerBilling,
  customerWiseReport,
  deleteCustomerBilling,
  getAllCustomerBillings,
  getCustomerBillingById,
  getCustomerProductFullData,
  getHighestSellingBrand,
  getPendingBills,
  productWiseReport,
  productWiseReportByDate,
  updateCustomerBilling,
} from "../../controllers/billing/customerBilling.controller.js";
import { verifyAdminPassword } from "../../middlewares/verifyAdminPassword.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/* CREATE INVOICE */
router.post("/", protect, createCustomerBilling);

router.get("/", getAllCustomerBillings);

/* 📊 HIGHEST SELLING BRAND */
router.get("/stats/highest-selling-brand", getHighestSellingBrand);

router.get("/customer-products", getCustomerProductFullData);

router.get("/products", productWiseReport);
router.get("/products-by-date", productWiseReportByDate);
router.get("/brands", brandWiseReport);
router.get("/customers", customerWiseReport);
router.get("/pending", getPendingBills);

router.get("/:id", getCustomerBillingById);

router.put("/:id", protect, verifyAdminPassword, updateCustomerBilling);
router.delete("/:id", protect, verifyAdminPassword,  deleteCustomerBilling);

export default router;
