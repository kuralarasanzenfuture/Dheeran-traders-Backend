import express from "express";
import {
  brandWiseReport,
  createCustomerBilling,
  customerWiseReport,
  getAllCustomerBillings,
  getCustomerBillingById,
  getCustomerProductFullData,
  getHighestSellingBrand,
  productWiseReport,
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

router.get("/:id", getCustomerBillingById);



export default router;
