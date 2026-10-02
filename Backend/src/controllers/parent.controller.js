import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Parent } from "../models/parent.model.js";
import { User } from "../models/user.model.js";
import { StudentParent } from "../models/studentParent.model.js";

// POST /api/v1/parents/
const createParent = asyncHandler(async (req, res) => {
    const { email, password, name, cnicNo, contactNumber } = req.body;
    const organizationId = req.user.organizationId;

    if ([email, password, name, cnicNo, contactNumber].some((f) => !f?.trim())) {
        throw new ApiError(400, "All required fields must be provided");
    }

    const existingUser = await User.findOne({ organizationId, email: email.toLowerCase().trim() });
    if (existingUser) throw new ApiError(409, "Email already registered in this organization");

    const user = await User.create({ organizationId, email, password, role: "PARENT" });

    const parent = await Parent.create({
        organizationId,
        userId: user._id,
        name,
        cnicNo,
        contactNumber,
    });

    return res.status(201).json(new ApiResponse(201, parent, "Parent created successfully"));
});

// GET /api/v1/parents/
const getAllParents = asyncHandler(async (req, res) => {
    const parents = await Parent.find({ organizationId: req.user.organizationId })
        .populate("userId", "-password -refreshToken");
    return res.status(200).json(new ApiResponse(200, parents, "Parents fetched"));
});

// GET /api/v1/parents/:id
const getParentById = asyncHandler(async (req, res) => {
    const parent = await Parent.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
        .populate("userId", "-password -refreshToken");
    if (!parent) throw new ApiError(404, "Parent not found");
    return res.status(200).json(new ApiResponse(200, parent, "Parent fetched"));
});

// PATCH /api/v1/parents/:id
const updateParent = asyncHandler(async (req, res) => {
    const { name, cnicNo, contactNumber } = req.body;

    const parent = await Parent.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { name, cnicNo, contactNumber } },
        { new: true, runValidators: true }
    );

    if (!parent) throw new ApiError(404, "Parent not found");
    return res.status(200).json(new ApiResponse(200, parent, "Parent updated successfully"));
});

// DELETE /api/v1/parents/:id
const deleteParent = asyncHandler(async (req, res) => {
    const parent = await Parent.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!parent) throw new ApiError(404, "Parent not found");

    await User.findByIdAndDelete(parent.userId);
    await StudentParent.deleteMany({ parentId: req.params.id });
    await Parent.findByIdAndDelete(req.params.id);

    return res.status(200).json(new ApiResponse(200, {}, "Parent deleted successfully"));
});

// POST /api/v1/parents/link-student
const linkStudentToParent = asyncHandler(async (req, res) => {
    const { studentId, parentId, relationship } = req.body;

    if (!studentId || !parentId || !relationship) {
        throw new ApiError(400, "studentId, parentId and relationship are required");
    }

    const existing = await StudentParent.findOne({ studentId, parentId });
    if (existing) throw new ApiError(409, "This student-parent link already exists");

    const link = await StudentParent.create({ studentId, parentId, relationship });

    return res.status(201).json(new ApiResponse(201, link, "Student linked to parent successfully"));
});

// GET /api/v1/parents/:id/students
const getStudentsOfParent = asyncHandler(async (req, res) => {
    const links = await StudentParent.find({ parentId: req.params.id })
        .populate({ path: "studentId", populate: { path: "classId", select: "name" } });

    return res.status(200).json(new ApiResponse(200, links, "Students of parent fetched"));
});

// GET /api/v1/parents/me
const getMyParentProfile = asyncHandler(async (req, res) => {
    const parent = await Parent.findOne({ userId: req.user._id })
        .populate("userId", "-password -refreshToken");
    if (!parent) throw new ApiError(404, "Parent profile not found");
    return res.status(200).json(new ApiResponse(200, parent, "Profile fetched"));
});

export { createParent, getAllParents, getParentById, updateParent, deleteParent, linkStudentToParent, getStudentsOfParent, getMyParentProfile };
