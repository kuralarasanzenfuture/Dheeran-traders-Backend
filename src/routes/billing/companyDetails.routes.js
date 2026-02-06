import express from "express";
import {
  saveCompanyDetails,
  getCompanyDetails,
  updateCompanyDetails,
  deleteCompanyDetails,
} from "../../controllers/billing/companyDetails.controller.js";

import { protect, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/",  getCompanyDetails);
router.post("/", protect, saveCompanyDetails);
router.put("/:id", protect, updateCompanyDetails);
router.delete("/:id", protect, deleteCompanyDetails);

export default router;