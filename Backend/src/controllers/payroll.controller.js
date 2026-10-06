import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Payroll } from "../models/payroll.model.js";
import { Teacher } from "../models/teacher.model.js";

const generatePayslipNo = async (organizationId) => {
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const count = await Payroll.countDocuments({ organizationId });
    const seq = String(count + 1).padStart(4, "0");
    return `PAY-${dateStr}-${seq}`;
};

// POST /api/v1/payroll
const createPayroll = asyncHandler(async (req, res) => {
    const { teacherId, month, basicSalary, allowances, deductions, remarks } = req.body;
    const organizationId = req.user.organizationId;

    if (!teacherId || !month || basicSalary === undefined) {
        throw new ApiError(400, "teacherId, month, and basicSalary are required");
    }

    const teacher = await Teacher.findOne({ _id: teacherId, organizationId });
    if (!teacher) throw new ApiError(404, "Teacher record not found");

    const totalAllowance = Array.isArray(allowances)
        ? allowances.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
        : 0;

    const totalDeduction = Array.isArray(deductions)
        ? deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
        : 0;

    const netSalary = Math.max(0, Number(basicSalary) + totalAllowance - totalDeduction);
    const payslipNo = await generatePayslipNo(organizationId);

    const payroll = await Payroll.create({
        organizationId,
        payslipNo,
        teacherId,
        month,
        basicSalary: Number(basicSalary),
        allowances: allowances || [],
        totalAllowance,
        deductions: deductions || [],
        totalDeduction,
        netSalary,
        status: "PENDING",
        remarks: remarks || "",
    });

    return res.status(201).json(new ApiResponse(201, payroll, "Payslip generated successfully"));
});

// GET /api/v1/payroll
const getAllPayroll = asyncHandler(async (req, res) => {
    const { month, status } = req.query;
    const query = { organizationId: req.user.organizationId };

    if (month) query.month = month;
    if (status) query.status = status.toUpperCase();

    const payrolls = await Payroll.find(query)
        .populate("teacherId", "name email subject employeeId")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, payrolls, "Payroll records fetched"));
});

// PATCH /api/v1/payroll/:id/disburse
const disburseSalary = asyncHandler(async (req, res) => {
    const { paymentMethod, remarks } = req.body;
    const organizationId = req.user.organizationId;

    const payroll = await Payroll.findOne({ _id: req.params.id, organizationId });
    if (!payroll) throw new ApiError(404, "Payroll record not found");

    payroll.status = "DISBURSED";
    payroll.disbursedDate = new Date();
    payroll.paymentMethod = paymentMethod || "BANK_TRANSFER";
    if (remarks) payroll.remarks = remarks;

    await payroll.save();

    return res.status(200).json(new ApiResponse(200, payroll, "Salary marked as disbursed"));
});

// DELETE /api/v1/payroll/:id
const deletePayroll = asyncHandler(async (req, res) => {
    const payroll = await Payroll.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!payroll) throw new ApiError(404, "Payroll record not found");
    return res.status(200).json(new ApiResponse(200, {}, "Payroll record deleted"));
});

export {
    createPayroll,
    getAllPayroll,
    disburseSalary,
    deletePayroll
};
