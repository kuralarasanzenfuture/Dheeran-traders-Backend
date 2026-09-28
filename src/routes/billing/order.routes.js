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
  generateBillFromOrder,
  cancelOrder,
  deliverOrder,
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

// Apply auth middleware to all order routes
router.use(verifyToken);

// ======================================================
// 1. ORDER CREATION & BILL GENERATION
// ======================================================
router.post("/:id/generate-bill", generateBillFromOrder);
router.post("/", createOrder);

// ======================================================
// 2. ORDER LISTING & STOCK (Supports query filters & pagination)
// ======================================================
router.get("/", getOrders);
router.get("/my-orders", getMyOrders);
router.get("/available-stock", getProductsWithAvailableStock);
router.get("/products/available-stock", getProductsWithAvailableStock);

// ======================================================
// 3. REPORTS & ANALYTICS (Supports both legacy and standard REST paths)
// ======================================================
router.get("/report-orderSummary", getOrderSummary);
router.get("/reports/order-summary", getOrderSummary);
router.get("/reports/orderSummary", getOrderSummary);

router.get("/report-orders-by-date-range", getOrdersByDateRange);
router.get("/reports/orders-by-date-range", getOrdersByDateRange);

router.get("/reports/customer-report", getCustomerReport);
router.get("/reports/product-sales-report", getProductSalesReport);
router.get("/reports/delivery-performance", getDeliveryReport);
router.get("/reports/cancelled-orders", getCancelledOrders);
router.get("/reports/user-order-report", getUserOrderReport);

// ======================================================
// 4. INDIVIDUAL ORDER OPERATIONS (Placed after static routes)
// ======================================================
// router.get("/:id(\\d+)", getOrderById);
router.get("/:id", getOrderById);
router.put("/:id/confirm", confirmOrder);
router.put("/:id/cancel", cancelOrder);
router.put("/:id/deliver", deliverOrder);
router.put("/:id/status", updateOrderStatus);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

export default router;
