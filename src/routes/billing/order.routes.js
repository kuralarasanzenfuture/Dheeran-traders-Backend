import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  confirmOrder,
  updateOrderStatus,
  getProductsWithAvailableStock,
  getMyOrders,
} from "../../controllers/billing/order/order.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
  getOrdersByDateRange,
  getOrderSummary,
  getCustomerReport,
  getProductSalesReport,
  getDeliveryReport,
  getCancelledOrders,
  getUserOrderReport,
} from "../../controllers/billing/order/orderReports.controller.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/my-orders", verifyToken, getMyOrders);
router.get("/available-stock", getProductsWithAvailableStock);
router.get("/report-orderSummary", getOrderSummary);
router.get("/report-orders-by-date-range", getOrdersByDateRange);
router.get("/reports/customer-report", getCustomerReport);
router.get("/reports/product-sales-report", getProductSalesReport);
router.get("/reports/delivery-performance", getDeliveryReport);
router.get("/reports/cancelled-orders", getCancelledOrders);
router.get("/reports/user-order-report", getUserOrderReport);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.put("/:id/confirm", confirmOrder);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

export default router;
