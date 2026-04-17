import express from "express";
import {
  brandWiseReport,
  customerWiseReport,
  getAllCustomerBillings,
  getCustomerBillingById,
  getCustomerProductFullData,
  getHighestSellingBrand,
  getLastInvoiceNumber,
  getNextInvoiceNumber,
  getPendingBills,
  productWiseReport,
  productWiseReportByDate,
  
} from "../../controllers/billing/billing/getBilling.controller.js";
import { verifyAdminPassword } from "../../middlewares/verifyAdminPassword.js";
import { protect, verifyToken } from "../../middlewares/auth.middleware.js";
import { checkPermission } from "../../middlewares/permission/permission.middleware.js";
import { createCustomerBilling } from "../../controllers/billing/billing/createBilling.controller.js";
import { updateCustomerBilling } from "../../controllers/billing/billing/updateBilling.controller.js";
import { deleteCustomerBilling } from "../../controllers/billing/billing/deleteBilling.controller.js";

const router = express.Router();

router.use(verifyToken);

/* CREATE INVOICE */
router.post("/", createCustomerBilling);

router.get("/", getAllCustomerBillings);

/* 📊 HIGHEST SELLING BRAND */
router.get("/stats/highest-selling-brand", getHighestSellingBrand);

router.get("/customer-products", getCustomerProductFullData);

router.get("/products", productWiseReport);
router.get("/products-by-date", productWiseReportByDate);
router.get("/brands", brandWiseReport);
router.get("/customers", customerWiseReport);
router.get("/pending", getPendingBills);
router.get("/last-invoice-number", getLastInvoiceNumber);
router.get("/next-invoice-number", getNextInvoiceNumber);

router.get("/:id", getCustomerBillingById);

router.put("/:id", updateCustomerBilling);
router.delete("/:id", deleteCustomerBilling);

export default router;
