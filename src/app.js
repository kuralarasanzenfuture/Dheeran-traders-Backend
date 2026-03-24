import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes

import roleRoutes from "./routes/roles/roleBased.routes.js";
import userRolesRoutes from "./routes/roles/user.routes.js";
import employeeDetailsRoutes from "./routes/roles/employees-details.routes.js";
import rolePermissionsRoutes from "./routes/roles/permissions/rolePermission.routes.js";
import userPermissionRoutes from "./routes/roles/permissions/userPermission.routes.js";

import userRoutes from "./routes/billing/user.routes.js";
import productRoutes from "./routes/billing/product.routes.js";
import categoryRoutes from "./routes/billing/category.routes.js";
import brandRoutes from "./routes/billing/brand.routes.js";
import customerRoutes from "./routes/billing/customer.routes.js";
import vendorRoutes from "./routes/billing/vendor.routes.js";
import quantityRoutes from "./routes/billing/quantity.routes.js";
import employeeRoutes from "./routes/billing/employee.routes.js";
import companyBankRoutes from "./routes/billing/companyBank.routes.js";
import vendorStockRoutes from "./routes/billing/vendorStock.routes.js";
import customerBillingRoutes from "./routes/billing/customerBilling.routes.js";
import customerPaymentRoutes from "./routes/billing/customerPayment.routes.js";
import companyDetailsRoutes from "./routes/billing/companyDetails.routes.js";

// chit api end points
import planRoutes from "./routes/chit/plan.routes.js";
import planRulesRoutes from "./routes/chit/planRules.routes.js";
import batchRoutes from "./routes/chit/batch.routes.js";
import batchPlanRoutes from "./routes/chit/batchPlan.routes.js";
import chitCustomersRoutes from "./routes/chit/chitCustomer.routes.js";
import chitAgentsAndStaffRoutes from "./routes/chit/agentAndStaff.routes.js";
import chitCustomerSubscriptionsRoutes from "./routes/chit/customerSubcription.routes.js";
import collectionPaymentRoutes from "./routes/chit/collectionPayment.routes.js";
import customerInstallmentRoutes from "./routes/chit/customerInstallment.routes.js";

import locationRoutes from "./routes/chit/location.routes.js";

// Middlewares
import { errorHandler } from "./middlewares/error.middleware.js";

import cookieParser from "cookie-parser";
import { startCleanupJob } from "./jobs/cleanupTokens.job.js";

// app.use(cookieParser());

// ------------------------------------------------------------------
// App & dirname setup (IMPORTANT for ES Modules)
// ------------------------------------------------------------------
const app = express();

// start cron job ONCE
startCleanupJob();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------------
// Global Middlewares
// ------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// Static Files
// ------------------------------------------------------------------
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// import { attachDb } from "./middleware/dbMiddleware.js";

// app.use(attachDb);
// router.get("/:role_id", attachDb, getRolePermissions);

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------

app.use("/api/roles", roleRoutes);
app.use("/api/users-roles", userRolesRoutes);
app.use("/api/employees-details", employeeDetailsRoutes);
app.use("/api/role-permissions", rolePermissionsRoutes);
app.use("/api/user-permissions", userPermissionRoutes);

app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/quantities", quantityRoutes);
app.use("/api/company-bank", companyBankRoutes);
app.use("/api/vendor-stocks", vendorStockRoutes);

app.use("/api/customer-billing", customerBillingRoutes);
app.use("/api/customer-payments", customerPaymentRoutes);

app.use("/api/company-details", companyDetailsRoutes);


// chit api end points
app.use("/api/plans", planRoutes);
app.use("/api/plan-rules", planRulesRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/batch-plans", batchPlanRoutes);
app.use("/api/chit-customers", chitCustomersRoutes);
app.use("/api/chit-agent-staff", chitAgentsAndStaffRoutes);
app.use("/api/customer-subscriptions", chitCustomerSubscriptionsRoutes);
app.use("/api/chit/payment", collectionPaymentRoutes);
app.use("/api/installments", customerInstallmentRoutes);


app.use("/api/locations", locationRoutes);

// ------------------------------------------------------------------
// Health Check (optional but recommended)
// ------------------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// ------------------------------------------------------------------
// Error Handler (ALWAYS LAST)
// ------------------------------------------------------------------
app.use(errorHandler);

export default app;