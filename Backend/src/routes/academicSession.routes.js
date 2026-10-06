import { Router } from "express";
import {
    createAcademicSession,
    getAllAcademicSessions,
    getCurrentAcademicSession,
    setSessionAsCurrent,
    updateAcademicSession,
    deleteAcademicSession
} from "../controllers/academicSession.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/")
    .post(createAcademicSession)
    .get(getAllAcademicSessions);

router.route("/current")
    .get(getCurrentAcademicSession);

router.route("/:id/set-current")
    .patch(setSessionAsCurrent);

router.route("/:id")
    .patch(updateAcademicSession)
    .delete(deleteAcademicSession);

export default router;
