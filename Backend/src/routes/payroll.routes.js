import { Router } from "express";
import {
    createPayroll,
    getAllPayroll,
    disburseSalary,
    deletePayroll
} from "../controllers/payroll.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/")
    .post(createPayroll)
    .get(getAllPayroll);

router.route("/:id/disburse")
    .patch(disburseSalary);

router.route("/:id")
    .delete(deletePayroll);

export default router;
