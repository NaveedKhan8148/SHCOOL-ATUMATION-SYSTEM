import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Fees } from "../models/fees.model.js";

// POST /api/v1/fees/
const createFee = asyncHandler(async (req, res) => {
    const { studentId, feeType, amount, dueDate } = req.body;
    const organizationId = req.user.organizationId;

    if (!studentId || !feeType || !amount || !dueDate) {
        throw new ApiError(400, "studentId, feeType, amount and dueDate are required");
    }

    const fee = await Fees.create({ organizationId, studentId, feeType, amount, dueDate });
    return res.status(201).json(new ApiResponse(201, fee, "Fee record created successfully"));
});

// GET /api/v1/fees/student/:studentId
const getFeesByStudent = asyncHandler(async (req, res) => {
    const fees = await Fees.find({
        organizationId: req.user.organizationId,
        studentId: req.params.studentId,
    }).sort({ dueDate: -1 });
    return res.status(200).json(new ApiResponse(200, fees, "Fees fetched for student"));
});

// GET /api/v1/fees/student/:studentId/pending
const getPendingFees = asyncHandler(async (req, res) => {
    const fees = await Fees.find({
        organizationId: req.user.organizationId,
        studentId: req.params.studentId,
        status: { $in: ["Pending", "Overdue"] },
    }).sort({ dueDate: 1 });

    return res.status(200).json(new ApiResponse(200, fees, "Pending fees fetched"));
});

// PATCH /api/v1/fees/:id/pay
const markFeePaid = asyncHandler(async (req, res) => {
    const fee = await Fees.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { status: "Paid", paidDate: new Date() } },
        { new: true }
    );

    if (!fee) throw new ApiError(404, "Fee record not found");
    return res.status(200).json(new ApiResponse(200, fee, "Fee marked as paid"));
});

// PATCH /api/v1/fees/:id
const updateFee = asyncHandler(async (req, res) => {
    const { feeType, amount, dueDate, status, paidDate } = req.body;

    const fee = await Fees.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { feeType, amount, dueDate, status, paidDate } },
        { new: true, runValidators: true }
    );

    if (!fee) throw new ApiError(404, "Fee record not found");
    return res.status(200).json(new ApiResponse(200, fee, "Fee updated successfully"));
});

// DELETE /api/v1/fees/:id
const deleteFee = asyncHandler(async (req, res) => {
    const fee = await Fees.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!fee) throw new ApiError(404, "Fee record not found");
    return res.status(200).json(new ApiResponse(200, {}, "Fee record deleted"));
});

export { createFee, getFeesByStudent, getPendingFees, markFeePaid, updateFee, deleteFee };
