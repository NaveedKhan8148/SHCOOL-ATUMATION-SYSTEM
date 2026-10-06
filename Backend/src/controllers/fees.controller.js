import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Fees } from "../models/fees.model.js";
import { Student } from "../models/student.model.js";

// Helper function to generate unique voucher numbers
const generateVoucherNo = async (organizationId) => {
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", ""); // YYYYMM
    const count = await Fees.countDocuments({ organizationId });
    const sequence = String(count + 1).padStart(4, "0");
    return `VCH-${dateStr}-${sequence}`;
};

// POST /api/v1/fees/voucher
const createFeeVoucher = asyncHandler(async (req, res) => {
    const { studentId, classId, feeMonth, feeHeads, concessions, dueDate, academicSessionId, remarks } = req.body;
    const organizationId = req.user.organizationId;

    if (!feeMonth || !dueDate || !Array.isArray(feeHeads) || feeHeads.length === 0) {
        throw new ApiError(400, "feeMonth, dueDate, and at least one feeHead are required");
    }

    // Determine target students (either single student or entire class)
    let targetStudents = [];
    if (studentId) {
        const s = await Student.findOne({ _id: studentId, organizationId });
        if (s) targetStudents.push(s);
    } else if (classId) {
        targetStudents = await Student.find({ classId, organizationId, status: "ACTIVE" });
    }

    if (targetStudents.length === 0) {
        throw new ApiError(404, "No eligible active students found to issue fee voucher");
    }

    const createdVouchers = [];

    const subTotal = feeHeads.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalConcession = Array.isArray(concessions)
        ? concessions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
        : 0;
    const netPayable = Math.max(0, subTotal - totalConcession);

    for (const student of targetStudents) {
        const voucherNo = await generateVoucherNo(organizationId);

        const fee = await Fees.create({
            organizationId,
            voucherNo,
            studentId: student._id,
            academicSessionId: academicSessionId || student.academicSessionId || null,
            feeMonth,
            feeHeads,
            subTotal,
            concessions: concessions || [],
            totalConcession,
            netPayable,
            dueDate,
            status: "PENDING",
            remarks: remarks || "",
        });

        createdVouchers.push(fee);
    }

    return res.status(201).json(
        new ApiResponse(201, createdVouchers, `Successfully generated ${createdVouchers.length} fee voucher(s)`)
    );
});

// GET /api/v1/fees
const getAllFees = asyncHandler(async (req, res) => {
    const { status, classId, month, search } = req.query;
    const query = { organizationId: req.user.organizationId };

    if (status) query.status = status.toUpperCase();
    if (month) query.feeMonth = month;

    let studentIds = null;
    if (classId) {
        const classStudents = await Student.find({ classId, organizationId: req.user.organizationId }).select("_id");
        studentIds = classStudents.map(s => s._id);
        query.studentId = { $in: studentIds };
    }

    const fees = await Fees.find(query)
        .populate({
            path: "studentId",
            select: "studentName rollNo classId",
            populate: { path: "classId", select: "name section" }
        })
        .populate("academicSessionId", "name")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, fees, "Fees fetched successfully"));
});

// GET /api/v1/fees/student/:studentId
const getFeesByStudent = asyncHandler(async (req, res) => {
    const fees = await Fees.find({
        organizationId: req.user.organizationId,
        studentId: req.params.studentId,
    })
        .populate("academicSessionId", "name")
        .sort({ dueDate: -1 });

    return res.status(200).json(new ApiResponse(200, fees, "Fees fetched for student"));
});

// GET /api/v1/fees/student/:studentId/pending
const getPendingFees = asyncHandler(async (req, res) => {
    const fees = await Fees.find({
        organizationId: req.user.organizationId,
        studentId: req.params.studentId,
        status: { $in: ["PENDING", "OVERDUE", "PARTIAL", "Pending", "Overdue"] },
    })
        .populate("academicSessionId", "name")
        .sort({ dueDate: 1 });

    return res.status(200).json(new ApiResponse(200, fees, "Pending fees fetched"));
});

// PATCH /api/v1/fees/:id/pay
const markFeePaid = asyncHandler(async (req, res) => {
    const { paidAmount, paymentMethod, remarks } = req.body;

    const feeRecord = await Fees.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!feeRecord) throw new ApiError(404, "Fee record not found");

    const amountPaying = Number(paidAmount) || feeRecord.netPayable;
    feeRecord.paidAmount = amountPaying;
    feeRecord.paidDate = new Date();
    feeRecord.paymentMethod = paymentMethod || "CASH";
    feeRecord.receivedBy = req.user.email || req.user.role;
    if (remarks) feeRecord.remarks = remarks;

    if (amountPaying >= feeRecord.netPayable) {
        feeRecord.status = "PAID";
    } else if (amountPaying > 0) {
        feeRecord.status = "PARTIAL";
    }

    await feeRecord.save();

    return res.status(200).json(new ApiResponse(200, feeRecord, `Fee marked as ${feeRecord.status}`));
});

// DELETE /api/v1/fees/:id
const deleteFee = asyncHandler(async (req, res) => {
    const fee = await Fees.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!fee) throw new ApiError(404, "Fee record not found");
    return res.status(200).json(new ApiResponse(200, {}, "Fee record deleted"));
});

export {
    createFeeVoucher,
    getAllFees,
    getFeesByStudent,
    getPendingFees,
    markFeePaid,
    deleteFee
};
