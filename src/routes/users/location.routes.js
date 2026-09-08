import express from "express";
import {
  updateLocation,
  getCurrentLocation,
  getLocationHistory,
  getAllUsersCurrentLocation,
  getLocationHistoryByDate,
  getAllUsersLocationReport,
} from "../../controllers/locationnew.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/update-location", updateLocation);

router.get("/current/:user_id", getCurrentLocation);

router.get("/history/:user_id", getLocationHistory);

router.get("/history-by-date/:user_id", getLocationHistoryByDate);

router.get("/all-users", getAllUsersCurrentLocation);

// All users report
// Optional user/date/from/to filters
router.get("/reports", getAllUsersLocationReport);

export default router;
