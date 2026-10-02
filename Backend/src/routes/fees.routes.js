import { Router } from "express";
import {
    createFee,
    getFeesByStudent,
    getPendingFees,
    markFeePaid,
    updateFee,
    deleteFee,
} from "../controllers/fees.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createFee);
router.route("/student/:studentId").get(getFeesByStudent);
router.route("/student/:studentId/pending").get(getPendingFees);
router.route("/:id").patch(updateFee).delete(deleteFee);
router.route("/:id/pay").patch(markFeePaid);

export default router;
