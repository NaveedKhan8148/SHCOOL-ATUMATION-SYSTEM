import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Expense } from "../models/expense.model.js";
import { Fees } from "../models/fees.model.js";
import { Payroll } from "../models/payroll.model.js";

const generateReceiptNo = async (organizationId) => {
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const count = await Expense.countDocuments({ organizationId });
    const seq = String(count + 1).padStart(4, "0");
    return `EXP-${dateStr}-${seq}`;
};

// POST /api/v1/expenses
const createExpense = asyncHandler(async (req, res) => {
    const { title, category, amount, expenseDate, paymentMethod, paidTo, notes } = req.body;
    const organizationId = req.user.organizationId;

    if (!title?.trim() || amount === undefined) {
        throw new ApiError(400, "Title and amount are required");
    }

    const receiptNo = await generateReceiptNo(organizationId);

    const expense = await Expense.create({
        organizationId,
        receiptNo,
        title: title.trim(),
        category: category || "OTHER",
        amount: Number(amount),
        expenseDate: expenseDate || new Date(),
        paymentMethod: paymentMethod || "CASH",
        paidTo: paidTo || "",
        notes: notes || "",
    });

    return res.status(201).json(new ApiResponse(201, expense, "Expense recorded successfully"));
});

// GET /api/v1/expenses
const getAllExpenses = asyncHandler(async (req, res) => {
    const { category } = req.query;
    const query = { organizationId: req.user.organizationId };

    if (category) query.category = category;

    const expenses = await Expense.find(query).sort({ expenseDate: -1 });

    return res.status(200).json(new ApiResponse(200, expenses, "Expenses fetched successfully"));
});

// GET /api/v1/expenses/summary
const getFinancialSummary = asyncHandler(async (req, res) => {
    const organizationId = req.user.organizationId;

    // 1. Fee Income Collected
    const feeRecords = await Fees.find({ organizationId, status: { $in: ["PAID", "PARTIAL"] } });
    const totalFeeIncome = feeRecords.reduce((acc, curr) => acc + (curr.paidAmount || curr.netPayable || 0), 0);

    // 2. Staff Payroll Disbursed
    const payrollRecords = await Payroll.find({ organizationId, status: "DISBURSED" });
    const totalPayrollExpense = payrollRecords.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);

    // 3. School Operational Expenses
    const operationalExpenses = await Expense.find({ organizationId });
    const totalOperationalExpense = operationalExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalExpense = totalPayrollExpense + totalOperationalExpense;
    const netProfit = totalFeeIncome - totalExpense;

    return res.status(200).json(
        new ApiResponse(200, {
            totalFeeIncome,
            totalPayrollExpense,
            totalOperationalExpense,
            totalExpense,
            netProfit
        }, "Financial summary computed successfully")
    );
});

// DELETE /api/v1/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!expense) throw new ApiError(404, "Expense record not found");
    return res.status(200).json(new ApiResponse(200, {}, "Expense record deleted"));
});

export {
    createExpense,
    getAllExpenses,
    getFinancialSummary,
    deleteExpense
};
