import { Router } from "express";
import {
    createFeeVoucher,
    getAllFees,
    getFeesByStudent,
    getPendingFees,
    markFeePaid,
    deleteFee
} from "../controllers/fees.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/")
    .get(getAllFees);

router.route("/voucher")
    .post(createFeeVoucher);

router.route("/student/:studentId")
    .get(getFeesByStudent);

router.route("/student/:studentId/pending")
    .get(getPendingFees);

router.route("/:id/pay")
    .patch(markFeePaid);

router.route("/:id")
    .delete(deleteFee);

export default router;
