import { Router } from "express";
import {
    createResult,
    getResultsByStudent,
    getResultsByClass,
    updateResult,
    deleteResult,
} from "../controllers/result.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createResult);
router.route("/student/:studentId").get(getResultsByStudent);
router.route("/class/:classId").get(getResultsByClass);
router.route("/:id").patch(updateResult).delete(deleteResult);

export default router;
