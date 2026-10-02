import { Router } from "express";
import {
    createStudent,
    getAllStudents,
    getStudentById,
    getStudentsByClass,
    updateStudent,
    deleteStudent,
    getMyStudentProfile,  
} from "../controllers/student.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/me").get(getMyStudentProfile); 
router.route("/").post(createStudent).get(getAllStudents);
router.route("/class/:classId").get(getStudentsByClass);
router.route("/:id").get(getStudentById).patch(updateStudent).delete(deleteStudent);

export default router;
