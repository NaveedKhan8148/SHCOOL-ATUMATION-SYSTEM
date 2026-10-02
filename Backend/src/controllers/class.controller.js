import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Class } from "../models/class.model.js";

// POST /api/v1/classes/
const createClass = asyncHandler(async (req, res) => {
    const { name, classTeacherId, section, academicYear } = req.body;
    const organizationId = req.user.organizationId;

    if (!name?.trim() || !classTeacherId) {
        throw new ApiError(400, "name and classTeacherId are required");
    }

    const existing = await Class.findOne({ organizationId, name });
    if (existing) throw new ApiError(409, "Class with this name already exists in your organization");

    const newClass = await Class.create({ organizationId, name, classTeacherId, section, academicYear });

    return res.status(201).json(new ApiResponse(201, newClass, "Class created successfully"));
});

// GET /api/v1/classes/
const getAllClasses = asyncHandler(async (req, res) => {
    const classes = await Class.find({ organizationId: req.user.organizationId })
        .populate("classTeacherId", "name subject");
    return res.status(200).json(new ApiResponse(200, classes, "Classes fetched"));
});

// GET /api/v1/classes/:id
const getClassById = asyncHandler(async (req, res) => {
    const cls = await Class.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
        .populate("classTeacherId", "name subject");
    if (!cls) throw new ApiError(404, "Class not found");
    return res.status(200).json(new ApiResponse(200, cls, "Class fetched"));
});

// PATCH /api/v1/classes/:id
const updateClass = asyncHandler(async (req, res) => {
    const { name, classTeacherId, section, academicYear } = req.body;

    const cls = await Class.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { name, classTeacherId, section, academicYear } },
        { new: true, runValidators: true }
    );

    if (!cls) throw new ApiError(404, "Class not found");
    return res.status(200).json(new ApiResponse(200, cls, "Class updated successfully"));
});

// DELETE /api/v1/classes/:id
const deleteClass = asyncHandler(async (req, res) => {
    const cls = await Class.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!cls) throw new ApiError(404, "Class not found");
    return res.status(200).json(new ApiResponse(200, {}, "Class deleted successfully"));
});

export { createClass, getAllClasses, getClassById, updateClass, deleteClass };
