import express from "express";
import * as attendanceSystemController from "../controllers/attendanceSystem.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/daily", protect, attendanceSystemController.getDailyAttendance);
router.get("/monthly", protect, attendanceSystemController.getMonthlyReport);
router.post("/", protect, attendanceSystemController.createAttendance);
router.put("/:id", protect, attendanceSystemController.updateAttendance);
router.post("/confirm-day", protect, attendanceSystemController.confirmDay);

// GPS-based attendance
router.post("/check-in", protect, attendanceSystemController.checkInWithLocation);
router.post("/check-out", protect, attendanceSystemController.checkOutWithLocation);
router.get("/today/:employeeId", protect, attendanceSystemController.getTodayAttendance);

export default router;
