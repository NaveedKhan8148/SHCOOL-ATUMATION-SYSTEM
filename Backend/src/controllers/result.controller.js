import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Result } from "../models/result.model.js";

// POST /api/v1/results/
const createResult = asyncHandler(async (req, res) => {
    const { studentId, classId, subject, marks, grade, semester } = req.body;
    const organizationId = req.user.organizationId;

    if (!studentId || !classId || !subject || marks === undefined || !grade || !semester) {
        throw new ApiError(400, "All fields are required");
    }

    const existing = await Result.findOne({ organizationId, studentId, classId, subject, semester });
    if (existing) throw new ApiError(409, "Result already exists for this student/subject/semester");

    const result = await Result.create({ organizationId, studentId, classId, subject, marks, grade, semester });
    return res.status(201).json(new ApiResponse(201, result, "Result created successfully"));
});

// GET /api/v1/results/student/:studentId
const getResultsByStudent = asyncHandler(async (req, res) => {
    const { semester } = req.query;
    const filter = { organizationId: req.user.organizationId, studentId: req.params.studentId };
    if (semester) filter.semester = semester;

    const results = await Result.find(filter)
        .populate("classId", "name")
        .sort({ semester: -1 });

    return res.status(200).json(new ApiResponse(200, results, "Results fetched"));
});

// GET /api/v1/results/class/:classId?semester=Fall-2024
const getResultsByClass = asyncHandler(async (req, res) => {
    const { semester } = req.query;
    const filter = { organizationId: req.user.organizationId, classId: req.params.classId };
    if (semester) filter.semester = semester;

    const results = await Result.find(filter)
        .populate("studentId", "studentName rollNo")
        .sort({ marks: -1 });

    return res.status(200).json(new ApiResponse(200, results, "Class results fetched"));
});

// PATCH /api/v1/results/:id
const updateResult = asyncHandler(async (req, res) => {
    const { marks, grade } = req.body;

    const result = await Result.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { marks, grade } },
        { new: true, runValidators: true }
    );

    if (!result) throw new ApiError(404, "Result not found");
    return res.status(200).json(new ApiResponse(200, result, "Result updated successfully"));
});

// DELETE /api/v1/results/:id
const deleteResult = asyncHandler(async (req, res) => {
    const result = await Result.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!result) throw new ApiError(404, "Result not found");
    return res.status(200).json(new ApiResponse(200, {}, "Result deleted successfully"));
});

export { createResult, getResultsByStudent, getResultsByClass, updateResult, deleteResult };
