import express from "express";
import uploadBankQR from "../../middlewares/uploadBankQR.js";
import {
  createCompanyBank,
  getCompanyBanks,
  getCompanyBankById,
  updateCompanyBank,
  deleteCompanyBank,
} from "../../controllers/billing/companyBankController.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/* CREATE */
router.post(
  "/",
  protect,
  uploadBankQR.single("qr_code_image"),
  createCompanyBank,
);

/* READ */
router.get("/", protect, getCompanyBanks);
router.get("/:id", protect, getCompanyBankById);

/* UPDATE */
router.put(
  "/:id",
  protect,
  uploadBankQR.single("qr_code_image"),
  updateCompanyBank,
);

/* DELETE */
router.delete("/:id", protect, deleteCompanyBank);

export default router;
