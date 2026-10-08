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
    // Support both new split-payment (tuitionAmount + transportAmount)
    // and legacy single-amount (paidAmount + feeType) formats
    const { tuitionAmount, transportAmount, paidAmount, paymentMethod, remarks, feeType } = req.body;

    const feeRecord = await Fees.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!feeRecord) throw new ApiError(404, "Fee record not found");

    // Calculate expected totals from feeHeads
    let expectedTransport = 0;
    let expectedAcademic = 0;
    feeRecord.feeHeads.forEach(head => {
        if (head.headName.toLowerCase().includes('transport')) {
            expectedTransport += head.amount;
        } else {
            expectedAcademic += head.amount;
        }
    });
    expectedAcademic = Math.max(0, expectedAcademic - feeRecord.totalConcession);

    const remainingTransport = Math.max(0, expectedTransport - (feeRecord.transportPaid || 0));
    const remainingAcademic = Math.max(0, expectedAcademic - (feeRecord.academicPaid || 0));
    const remainingTotal = Math.max(0, feeRecord.netPayable - (feeRecord.paidAmount || 0));

    let tuitionPaying = 0;
    let transportPaying = 0;
    let amountPaying = 0;
    let historyFeeType = "BOTH";

    // --- NEW: explicit split-payment mode ---
    if (tuitionAmount !== undefined || transportAmount !== undefined) {
        tuitionPaying = Number(tuitionAmount) || 0;
        transportPaying = Number(transportAmount) || 0;
        amountPaying = tuitionPaying + transportPaying;

        if (amountPaying <= 0) throw new ApiError(400, "Total payment amount must be greater than zero");
        if (tuitionPaying < 0) throw new ApiError(400, "Tuition payment cannot be negative");
        if (transportPaying < 0) throw new ApiError(400, "Transport payment cannot be negative");

        if (tuitionPaying > remainingAcademic) {
            throw new ApiError(400, `Tuition payment (${tuitionPaying}) cannot exceed remaining tuition fee of ${remainingAcademic}`);
        }
        if (transportPaying > remainingTransport) {
            throw new ApiError(400, `Transport payment (${transportPaying}) cannot exceed remaining transport fee of ${remainingTransport}`);
        }
        if (amountPaying > remainingTotal) {
            throw new ApiError(400, `Total payment (${amountPaying}) cannot exceed remaining balance of ${remainingTotal}`);
        }

        feeRecord.academicPaid = (feeRecord.academicPaid || 0) + tuitionPaying;
        feeRecord.transportPaid = (feeRecord.transportPaid || 0) + transportPaying;

        // Determine label for history entry
        if (tuitionPaying > 0 && transportPaying > 0) historyFeeType = "BOTH";
        else if (tuitionPaying > 0) historyFeeType = "ACADEMIC";
        else historyFeeType = "TRANSPORT";

    // --- LEGACY: single amount + feeType mode (backward compatible) ---
    } else {
        amountPaying = Number(paidAmount);
        if (!amountPaying || amountPaying <= 0) throw new ApiError(400, "Invalid payment amount");
        if (amountPaying > remainingTotal) {
            throw new ApiError(400, `Payment amount cannot exceed remaining balance of ${remainingTotal}`);
        }

        const type = feeType || "BOTH";
        historyFeeType = type;

        if (type === "TRANSPORT") {
            if (amountPaying > remainingTransport) throw new ApiError(400, `Amount exceeds remaining transport fee of ${remainingTransport}`);
            transportPaying = amountPaying;
            feeRecord.transportPaid = (feeRecord.transportPaid || 0) + amountPaying;
        } else if (type === "ACADEMIC") {
            if (amountPaying > remainingAcademic) throw new ApiError(400, `Amount exceeds remaining academic fee of ${remainingAcademic}`);
            tuitionPaying = amountPaying;
            feeRecord.academicPaid = (feeRecord.academicPaid || 0) + amountPaying;
        } else {
            // BOTH: auto-distribute
            let remainingToApply = amountPaying;
            transportPaying = Math.min(remainingToApply, remainingTransport);
            feeRecord.transportPaid = (feeRecord.transportPaid || 0) + transportPaying;
            remainingToApply -= transportPaying;
            tuitionPaying = Math.min(remainingToApply, remainingAcademic);
            feeRecord.academicPaid = (feeRecord.academicPaid || 0) + tuitionPaying;
        }
    }

    feeRecord.paidAmount = (feeRecord.paidAmount || 0) + amountPaying;
    feeRecord.paidDate = new Date();
    feeRecord.paymentMethod = paymentMethod || "CASH";
    feeRecord.receivedBy = req.user.email || req.user.role;
    if (remarks) feeRecord.remarks = remarks;

    if (!feeRecord.paymentHistory) {
        feeRecord.paymentHistory = [];
    }

    feeRecord.paymentHistory.push({
        amount: amountPaying,
        tuitionAmount: tuitionPaying,
        transportAmount: transportPaying,
        date: new Date(),
        feeType: historyFeeType,
        paymentMethod: paymentMethod || "CASH",
        remarks: remarks || ""
    });

    if (feeRecord.paidAmount >= feeRecord.netPayable) {
        feeRecord.status = "PAID";
    } else if (feeRecord.paidAmount > 0) {
        feeRecord.status = "PARTIAL";
    }

    await feeRecord.save();

    return res.status(200).json(new ApiResponse(200, feeRecord, `Payment recorded successfully`));
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
