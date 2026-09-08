import express from "express";
import {
  createTerms,
  getActiveTerms,
  acceptTerms,
  checkTermsStatus,
} from "../../controllers/terms/terms.controller.js";

import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// 🔐 Create terms (admin only ideally)
router.post("/", verifyToken, createTerms);

// 🌐 Get active terms
router.get("/active", verifyToken, getActiveTerms);

// 🔐 Accept terms
router.post("/accept", verifyToken, acceptTerms);

// 🔐 Check status
router.get("/status", verifyToken, checkTermsStatus);

export default router;
