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

/* CREATE */
router.post(
  "/",
  uploadBankQR.single("qr_code_image"),
  createCompanyBank
);

/* READ */
router.get("/", getCompanyBanks);
router.get("/:id", getCompanyBankById);

/* UPDATE */
router.put(
  "/:id",
  uploadBankQR.single("qr_code_image"),
  updateCompanyBank
);

/* DELETE */
router.delete("/:id", deleteCompanyBank);

export default router;
