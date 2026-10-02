import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Teacher } from "../models/teacher.model.js";
import { User } from "../models/user.model.js";

// POST /api/v1/teachers/
const createTeacher = asyncHandler(async (req, res) => {
    const { email, password, name, cnicNumber, contactNumber, subject, dateOfJoining, address } = req.body;
    const organizationId = req.user.organizationId;

    if ([email, password, name, cnicNumber, contactNumber, subject, dateOfJoining].some((f) => !f?.toString().trim())) {
        throw new ApiError(400, "All required fields must be provided");
    }

    const existingUser = await User.findOne({ organizationId, email: email.toLowerCase().trim() });
    if (existingUser) throw new ApiError(409, "Email already registered in this organization");

    const user = await User.create({ organizationId, email, password, role: "TEACHER" });

    const teacher = await Teacher.create({
        organizationId,
        userId: user._id,
        name,
        cnicNumber,
        contactNumber,
        subject,
        dateOfJoining,
        address,
    });

    return res.status(201).json(new ApiResponse(201, teacher, "Teacher created successfully"));
});

// GET /api/v1/teachers/
const getAllTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({ organizationId: req.user.organizationId })
        .populate("userId", "-password -refreshToken");
    return res.status(200).json(new ApiResponse(200, teachers, "Teachers fetched"));
});

// GET /api/v1/teachers/:id
const getTeacherById = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
        .populate("userId", "-password -refreshToken");
    if (!teacher) throw new ApiError(404, "Teacher not found");
    return res.status(200).json(new ApiResponse(200, teacher, "Teacher fetched"));
});

// PATCH /api/v1/teachers/:id
const updateTeacher = asyncHandler(async (req, res) => {
    const { name, cnicNumber, contactNumber, subject, dateOfJoining, address, status } = req.body;

    const teacher = await Teacher.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { name, cnicNumber, contactNumber, subject, dateOfJoining, address, status } },
        { new: true, runValidators: true }
    );

    if (!teacher) throw new ApiError(404, "Teacher not found");
    return res.status(200).json(new ApiResponse(200, teacher, "Teacher updated successfully"));
});

// DELETE /api/v1/teachers/:id
const deleteTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!teacher) throw new ApiError(404, "Teacher not found");

    await User.findByIdAndDelete(teacher.userId);
    await Teacher.findByIdAndDelete(req.params.id);

    return res.status(200).json(new ApiResponse(200, {}, "Teacher deleted successfully"));
});

// GET /api/v1/teachers/me
const getMyTeacherProfile = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findOne({ userId: req.user._id })
        .populate("userId", "-password -refreshToken");
    if (!teacher) throw new ApiError(404, "Teacher profile not found");
    return res.status(200).json(new ApiResponse(200, teacher, "Profile fetched"));
});

export { createTeacher, getAllTeachers, getTeacherById, updateTeacher, deleteTeacher, getMyTeacherProfile };
