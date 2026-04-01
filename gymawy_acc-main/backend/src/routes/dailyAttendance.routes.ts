import express from "express";
import * as dailyAttendanceController from "../controllers/dailyAttendance.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.post("/check-in", dailyAttendanceController.checkIn);
router.post("/check-out", dailyAttendanceController.checkOut);
router.get("/today/:employeeId", dailyAttendanceController.getTodayAttendance);
router.get("/monthly", dailyAttendanceController.getMonthlyAttendance);
router.get("/today-all", dailyAttendanceController.getAllTodayAttendance);
router.post("/mark-status", dailyAttendanceController.markStatus);
router.get("/monthly-report", dailyAttendanceController.getMonthlyReport);
router.post("/manual-entry", dailyAttendanceController.manualEntry);
router.put("/:id", dailyAttendanceController.updateAttendance);
router.delete("/:id", dailyAttendanceController.deleteAttendance);

export default router;
