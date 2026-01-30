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
  updateCustomerBilling,
} from "../controllers/customerBilling.controller.js";

const router = express.Router();

/* CREATE INVOICE */
router.post("/", createCustomerBilling);

router.get("/", getAllCustomerBillings);

/* 📊 HIGHEST SELLING BRAND */
router.get("/stats/highest-selling-brand", getHighestSellingBrand);

router.get("/customer-products", getCustomerProductFullData);

router.get("/products", productWiseReport);
router.get("/brands", brandWiseReport);
router.get("/customers", customerWiseReport);
router.get("/pending", getPendingBills);

router.get("/:id", getCustomerBillingById);

router.put("/:id", updateCustomerBilling);
router.delete("/:id", deleteCustomerBilling);

export default router;
