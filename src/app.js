import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
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

// Middlewares
import { errorHandler } from "./middlewares/error.middleware.js";

// ------------------------------------------------------------------
// App & dirname setup (IMPORTANT for ES Modules)
// ------------------------------------------------------------------
const app = express();

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

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------
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