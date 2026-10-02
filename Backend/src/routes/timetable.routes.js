import { Router } from "express";
import {
    createTimetableEntry,
    getTimetableByClass,
    getTimetableByTeacher,
    updateTimetableEntry,
    deleteTimetableEntry,
} from "../controllers/timetable.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createTimetableEntry);
router.route("/class/:classId").get(getTimetableByClass);
router.route("/teacher/:teacherId").get(getTimetableByTeacher);
router.route("/:id").patch(updateTimetableEntry).delete(deleteTimetableEntry);

export default router;
