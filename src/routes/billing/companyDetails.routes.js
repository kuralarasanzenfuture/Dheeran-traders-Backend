import express from "express";
import {
  saveCompanyDetails,
  getCompanyDetails,
  updateCompanyDetails,
  deleteCompanyDetails,
} from "../../controllers/billing/companyDetails.controller.js";

import { protect, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/",  getCompanyDetails);
router.post("/", saveCompanyDetails);
router.put("/:id", updateCompanyDetails);
router.delete("/:id", deleteCompanyDetails);

export default router;