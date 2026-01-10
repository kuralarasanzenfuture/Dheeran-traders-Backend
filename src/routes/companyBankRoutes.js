import express from "express";
import uploadBankQR from "../middlewares/uploadBankQR.js";
import {
  createCompanyBank,
  getCompanyBanks,
  getCompanyBankById,
  updateCompanyBank,
  deleteCompanyBank,
} from "../controllers/companyBankController.js";

const router = express.Router();

// CREATE with QR upload
router.post(
  "/",
  uploadBankQR.single("qr_code"),
  createCompanyBank
);

router.get("/", getCompanyBanks);
router.get("/:id", getCompanyBankById);

// UPDATE with optional QR upload
router.put(
  "/:id",
  uploadBankQR.single("qr_code"),
  updateCompanyBank
);

router.delete("/:id", deleteCompanyBank);

export default router;
