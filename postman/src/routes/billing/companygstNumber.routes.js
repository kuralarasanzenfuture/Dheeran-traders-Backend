import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";

import {
  createGST,
  getAllGST,
  updateGST,
  deleteGST,
  setDefaultGST
} from "../../controllers/billing/companygstNumber.controller.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createGST);
router.get("/", getAllGST);

router.put("/:id", updateGST);
router.delete("/:id", deleteGST);

router.patch("/set-default/:id", setDefaultGST);

export default router;