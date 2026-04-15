import express from "express";

import roleRoutes from "./roles/roles.routes.js";
import userRolesRoutes from "./users/user.routes.js";
import employeeDetailsRoutes from "./users/employees-details.routes.js";
import rolePermissionsRoutes from "./roles/permissions/rolePermission.routes.js";
import userPermissionRoutes from "./roles/permissions/userPermission.routes.js";

import moduleRoutes from "./roles/module.routes.js";
import moduleActionRoutes from "./roles/moduleAction.routes.js";

import userRoutes from "./billing/user.routes.js";
import productRoutes from "./billing/products/product.routes.js";
import categoryRoutes from "./billing/products/category.routes.js";
import brandRoutes from "./billing/products/brand.routes.js";
import customerRoutes from "./billing/customer.routes.js";
import vendorRoutes from "./billing/vendor.routes.js";
import quantityRoutes from "./billing/products/quantity.routes.js";
import employeeRoutes from "./billing/employee.routes.js";
import companyBankRoutes from "./billing/companyBank.routes.js";
import vendorStockRoutes from "./billing/vendorStock.routes.js";
import customerBillingRoutes from "./billing/customerBilling.routes.js";
import customerPaymentRoutes from "./billing/customerPayment.routes.js";
import companyDetailsRoutes from "./billing/companyDetails.routes.js";

// chit
import planRoutes from "./chit/plan.routes.js";
import planRulesRoutes from "./chit/planRules.routes.js";
import batchRoutes from "./chit/batch.routes.js";
import batchPlanRoutes from "./chit/batchPlan.routes.js";
import chitCustomersRoutes from "./chit/chitCustomer.routes.js";
import chitAgentsAndStaffRoutes from "./chit/agentAndStaff.routes.js";
import chitCustomerSubscriptionsRoutes from "./chit/customerSubscription.routes.js";
import collectionPaymentRoutes from "./chit/collectionPayment.routes.js";
import customerInstallmentRoutes from "./chit/customerInstallment.routes.js";
import locationRoutes from "./chit/location.routes.js";
import userCustomerAssignmentRoutes from "./chit/userCustomerAssignment.routes.js";

// reports
import chitReportRoutes from "./chit/reports/chitReports.routes.js";

import auditRoutes from "./audits/auditsLog.routes.js";

// 🔥 middleware
// import { verifyToken } from "../middlewares/auth.middleware.js";
// import { validateUserSession } from "../middlewares/session.middleware.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */

// 🔴 login / auth should be here
router.use("/users-roles", userRolesRoutes);

/* =========================
   PROTECTED ROUTES 🔥
========================= */

// router.use(verifyToken);
// router.use(validateUserSession);

// roles
router.use("/roles", roleRoutes);
router.use("/modules", moduleRoutes);
router.use("/modules-actions", moduleActionRoutes);
router.use("/employees-details", employeeDetailsRoutes);
router.use("/role-permissions", rolePermissionsRoutes);
router.use("/user-permissions", userPermissionRoutes);


// billing
router.use("/users", userRoutes);
router.use("/employees", employeeRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
 router.use("/customers", customerRoutes);
router.use("/vendors", vendorRoutes);
router.use("/quantities", quantityRoutes);
router.use("/company-bank", companyBankRoutes);
router.use("/vendor-stocks", vendorStockRoutes);
router.use("/customer-billing", customerBillingRoutes);
router.use("/customer-payments", customerPaymentRoutes);
router.use("/company-details", companyDetailsRoutes);

// chit
router.use("/plans", planRoutes);
router.use("/plan-rules", planRulesRoutes);
router.use("/batches", batchRoutes);
router.use("/batch-plans", batchPlanRoutes);
router.use("/chit-customers", chitCustomersRoutes);
router.use("/chit-agent-staff", chitAgentsAndStaffRoutes);
router.use("/customer-subscriptions", chitCustomerSubscriptionsRoutes);
router.use("/chit-payment", collectionPaymentRoutes);
router.use("/installments", customerInstallmentRoutes);
router.use("/chit-reports", chitReportRoutes);

router.use("/locations", locationRoutes);

router.use("/assigned-customers", userCustomerAssignmentRoutes);


router.use("/audits-logs", auditRoutes);

export default router;