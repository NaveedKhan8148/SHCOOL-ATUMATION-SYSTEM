import { Router } from "express";
import {
    createTeacher,
    getAllTeachers,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
    getMyTeacherProfile,
} from "../controllers/teacher.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // all teacher routes require auth
router.route("/me").get(getMyTeacherProfile);  // ← add this
router.route("/").post(createTeacher).get(getAllTeachers);
router.route("/:id").get(getTeacherById).patch(updateTeacher).delete(deleteTeacher);

export default router;
