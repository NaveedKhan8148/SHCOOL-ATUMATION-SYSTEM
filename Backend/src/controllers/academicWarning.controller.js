import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AcademicWarning } from "../models/academicWarning.model.js";

// POST /api/v1/warnings/
const createWarning = asyncHandler(async (req, res) => {
    const { studentId, ruleViolated, detailDescription, warningDate } = req.body;
    const organizationId = req.user.organizationId;

    if (!studentId || !ruleViolated || !detailDescription) {
        throw new ApiError(400, "studentId, ruleViolated and detailDescription are required");
    }

    const warning = await AcademicWarning.create({
        organizationId,
        studentId,
        ruleViolated,
        detailDescription,
        warningDate: warningDate || new Date(),
    });

    return res.status(201).json(new ApiResponse(201, warning, "Warning issued successfully"));
});

// GET /api/v1/warnings/student/:studentId
const getWarningsByStudent = asyncHandler(async (req, res) => {
    const warnings = await AcademicWarning.find({
        organizationId: req.user.organizationId,
        studentId: req.params.studentId,
    })
        .populate("studentId", "studentName rollNo")
        .sort({ warningDate: -1 });

    return res.status(200).json(new ApiResponse(200, warnings, "Warnings fetched"));
});

// GET /api/v1/warnings/
const getAllWarnings = asyncHandler(async (req, res) => {
    const warnings = await AcademicWarning.find({ organizationId: req.user.organizationId })
        .populate("studentId", "studentName rollNo")
        .sort({ warningDate: -1 });

    return res.status(200).json(new ApiResponse(200, warnings, "All warnings fetched"));
});

// PATCH /api/v1/warnings/:id
const updateWarning = asyncHandler(async (req, res) => {
    const { ruleViolated, detailDescription } = req.body;

    const warning = await AcademicWarning.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { ruleViolated, detailDescription } },
        { new: true, runValidators: true }
    );

    if (!warning) throw new ApiError(404, "Warning not found");
    return res.status(200).json(new ApiResponse(200, warning, "Warning updated"));
});

// DELETE /api/v1/warnings/:id
const deleteWarning = asyncHandler(async (req, res) => {
    const warning = await AcademicWarning.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!warning) throw new ApiError(404, "Warning not found");
    return res.status(200).json(new ApiResponse(200, {}, "Warning deleted"));
});

export { createWarning, getWarningsByStudent, getAllWarnings, updateWarning, deleteWarning };
