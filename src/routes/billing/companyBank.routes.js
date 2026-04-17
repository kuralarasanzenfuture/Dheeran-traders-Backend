import express from "express";
import uploadBankQR from "../../middlewares/uploadBankQR.js";
import {
  createCompanyBank,
  getCompanyBanks,
  getCompanyBankById,
  updateCompanyBank,
  deleteCompanyBank,
  setPrimaryBank,
} from "../../controllers/billing/companyBankController.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/* 🔐 AUTH */
router.use(verifyToken);

/* CREATE */
router.post("/", uploadBankQR.single("qr_code_image"), createCompanyBank);

/* READ */
router.get("/", getCompanyBanks);
router.get("/:id", getCompanyBankById);

/* UPDATE */
router.put("/:id", uploadBankQR.single("qr_code_image"), updateCompanyBank);

/* DELETE */
router.delete("/:id", deleteCompanyBank);

/* 🔥 SET PRIMARY */
router.patch("/:id/set-primary", setPrimaryBank);

export default router;
