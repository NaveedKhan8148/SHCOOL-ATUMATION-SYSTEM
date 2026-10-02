import { Router } from "express";
import {
    attendanceByClass,
    resultsBySemester,
    feeCollection,
    performanceDistribution,
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/attendance-by-class", attendanceByClass);
router.get("/results-by-semester", resultsBySemester);
router.get("/fee-collection", feeCollection);
router.get("/performance-distribution", performanceDistribution);

export default router;