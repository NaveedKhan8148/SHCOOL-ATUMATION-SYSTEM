import { Router } from "express";
import {
    markAttendance,
    markBulkAttendance,
    getAttendanceByStudent,
    getAttendanceByClassAndDate,
    updateAttendance,
    deleteAttendance,
} from "../controllers/attendance.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(markAttendance);
router.route("/bulk").post(markBulkAttendance);
router.route("/student/:studentId").get(getAttendanceByStudent);
router.route("/class/:classId").get(getAttendanceByClassAndDate);
router.route("/:id").patch(updateAttendance).delete(deleteAttendance);

export default router;
