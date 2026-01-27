import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import quantityRoutes from "./routes/quantity.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import companyBankRoutes from "./routes/companyBank.routes.js";
import vendorStock from "./routes/vendorStock.routes.js";
import customerBillingRoutes from "./routes/customerBilling.routes.js";
import customerPaymentRoutes from "./routes/customerPayment.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/uploads", express.static("src/uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/quantities", quantityRoutes);
app.use("/api/company-bank", companyBankRoutes);
app.use("/api/vendor-stocks", vendorStock);

app.use("/api/customer-billing", customerBillingRoutes);
app.use("/api/customer-payments", customerPaymentRoutes);

app.use(errorHandler);

export default app;
