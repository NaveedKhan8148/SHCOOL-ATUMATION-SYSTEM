import { Router } from "express";
import {
    createExpense,
    getAllExpenses,
    getFinancialSummary,
    deleteExpense
} from "../controllers/expense.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/")
    .post(createExpense)
    .get(getAllExpenses);

router.route("/summary")
    .get(getFinancialSummary);

router.route("/:id")
    .delete(deleteExpense);

export default router;
