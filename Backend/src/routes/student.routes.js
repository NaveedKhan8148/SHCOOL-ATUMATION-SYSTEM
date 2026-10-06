import { Router } from "express";
import {
    createStudent,
    getAllStudents,
    getStudentById,
    getStudentsByClass,
    updateStudent,
    deleteStudent,
    getMyStudentProfile,  
    bulkPromoteStudents,
    getAlumniStudents,
} from "../controllers/student.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/me").get(getMyStudentProfile);
router.route("/alumni").get(getAlumniStudents);
router.route("/bulk-promote").post(bulkPromoteStudents);
router.route("/").post(createStudent).get(getAllStudents);
router.route("/class/:classId").get(getStudentsByClass);
router.route("/:id").get(getStudentById).patch(updateStudent).delete(deleteStudent);

export default router;
