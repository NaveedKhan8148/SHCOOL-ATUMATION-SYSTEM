import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Result } from "../models/result.model.js";

const calculateGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
};

// POST /api/v1/results/
const createResult = asyncHandler(async (req, res) => {
    const { studentId, classId, subject, marks, maxMarks = 100, grade, semester } = req.body;
    const organizationId = req.user.organizationId;

    if (!studentId || !classId || !subject || marks === undefined || !semester) {
        throw new ApiError(400, "All fields are required");
    }

    const numMarks = Number(marks);
    const numMax = Number(maxMarks) || 100;
    const computedGrade = grade || calculateGradeFromPercentage((numMarks / numMax) * 100);

    const existing = await Result.findOne({ organizationId, studentId, classId, subject, semester });
    if (existing) throw new ApiError(409, "Result already exists for this student/subject/semester");

    const result = await Result.create({
        organizationId,
        studentId,
        classId,
        subject,
        marks: numMarks,
        maxMarks: numMax,
        grade: computedGrade,
        semester
    });
    return res.status(201).json(new ApiResponse(201, result, "Result created successfully"));
});

// POST /api/v1/results/bulk
const createBulkResults = asyncHandler(async (req, res) => {
    const { studentId, classId, semester, subjects } = req.body;
    const organizationId = req.user.organizationId;

    if (!studentId || !classId || !semester || !Array.isArray(subjects) || subjects.length === 0) {
        throw new ApiError(400, "Student, class, semester and at least one subject entry are required");
    }

    const savedResults = [];

    for (const item of subjects) {
        const { subject, marks, maxMarks = 100 } = item;
        if (!subject || marks === undefined || marks === '') continue;

        const numMarks = Number(marks);
        const numMax = Number(maxMarks) || 100;
        const pct = (numMarks / numMax) * 100;
        const computedGrade = calculateGradeFromPercentage(pct);

        const result = await Result.findOneAndUpdate(
            { organizationId, studentId, classId, subject, semester },
            {
                $set: {
                    organizationId,
                    studentId,
                    classId,
                    subject,
                    marks: numMarks,
                    maxMarks: numMax,
                    grade: computedGrade,
                    semester
                }
            },
            { upsert: true, new: true, runValidators: true }
        );
        savedResults.push(result);
    }

    return res.status(201).json(new ApiResponse(201, savedResults, "Multiple subject marks saved successfully"));
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
        .populate("studentId", "studentName rollNo fatherName")
        .sort({ marks: -1 });

    return res.status(200).json(new ApiResponse(200, results, "Class results fetched"));
});

// PATCH /api/v1/results/:id
const updateResult = asyncHandler(async (req, res) => {
    const { marks, maxMarks, grade } = req.body;

    const updateFields = {};
    if (marks !== undefined) updateFields.marks = Number(marks);
    if (maxMarks !== undefined) updateFields.maxMarks = Number(maxMarks);
    
    if (updateFields.marks !== undefined || updateFields.maxMarks !== undefined) {
        const existing = await Result.findById(req.params.id);
        if (existing) {
            const numMarks = updateFields.marks !== undefined ? updateFields.marks : existing.marks;
            const numMax = updateFields.maxMarks !== undefined ? updateFields.maxMarks : (existing.maxMarks || 100);
            updateFields.grade = grade || calculateGradeFromPercentage((numMarks / numMax) * 100);
        }
    } else if (grade) {
        updateFields.grade = grade;
    }

    const result = await Result.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: updateFields },
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

export { createResult, createBulkResults, getResultsByStudent, getResultsByClass, updateResult, deleteResult };

