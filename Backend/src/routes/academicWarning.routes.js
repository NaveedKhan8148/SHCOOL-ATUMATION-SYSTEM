import { Router } from "express";
import {
    createWarning,
    getWarningsByStudent,
    getAllWarnings,
    updateWarning,
    deleteWarning,
} from "../controllers/academicWarning.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createWarning).get(getAllWarnings);
router.route("/student/:studentId").get(getWarningsByStudent);
router.route("/:id").patch(updateWarning).delete(deleteWarning);

export default router;
