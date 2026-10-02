import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Student } from "../models/student.model.js";
import { User } from "../models/user.model.js";

// POST /api/v1/students/
const createStudent = asyncHandler(async (req, res) => {
    const { email, password, rollNo, status, studentName, address, dateOfJoining, classId } = req.body;
    const organizationId = req.user.organizationId;

    if ([email, password, rollNo, studentName, dateOfJoining, classId].some((f) => !f?.toString().trim())) {
        throw new ApiError(400, "All required fields must be provided");
    }

    const existingUser = await User.findOne({ organizationId, email: email.toLowerCase().trim() });
    if (existingUser) throw new ApiError(409, "Email already registered in this organization");

    const user = await User.create({ organizationId, email, password, role: "STUDENT" });

    const student = await Student.create({
        organizationId,
        userId: user._id,
        rollNo,
        studentName,
        status,
        address,
        dateOfJoining,
        classId,
    });

    return res.status(201).json(new ApiResponse(201, student, "Student created successfully"));
});

// GET /api/v1/students/
const getAllStudents = asyncHandler(async (req, res) => {
    const students = await Student.find({ organizationId: req.user.organizationId })
        .populate("userId", "-password -refreshToken")
        .populate("classId", "name");
    return res.status(200).json(new ApiResponse(200, students, "Students fetched"));
});

// GET /api/v1/students/:id
const getStudentById = asyncHandler(async (req, res) => {
    const student = await Student.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
        .populate("userId", "-password -refreshToken")
        .populate("classId", "name");
    if (!student) throw new ApiError(404, "Student not found");
    return res.status(200).json(new ApiResponse(200, student, "Student fetched"));
});

// GET /api/v1/students/class/:classId
const getStudentsByClass = asyncHandler(async (req, res) => {
    const students = await Student.find({ organizationId: req.user.organizationId, classId: req.params.classId })
        .populate("userId", "-password -refreshToken")
        .populate("classId", "name");
    return res.status(200).json(new ApiResponse(200, students, "Students fetched for class"));
});

// PATCH /api/v1/students/:id
const updateStudent = asyncHandler(async (req, res) => {
    const { rollNo, status, studentName, address, dateOfJoining, classId } = req.body;

    const student = await Student.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { rollNo, status, studentName, address, dateOfJoining, classId } },
        { new: true, runValidators: true }
    );

    if (!student) throw new ApiError(404, "Student not found");
    return res.status(200).json(new ApiResponse(200, student, "Student updated successfully"));
});

// DELETE /api/v1/students/:id
const deleteStudent = asyncHandler(async (req, res) => {
    const student = await Student.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!student) throw new ApiError(404, "Student not found");

    await User.findByIdAndDelete(student.userId);
    await Student.findByIdAndDelete(req.params.id);

    return res.status(200).json(new ApiResponse(200, {}, "Student deleted successfully"));
});

// GET /api/v1/students/me
const getMyStudentProfile = asyncHandler(async (req, res) => {
    const student = await Student.findOne({ userId: req.user._id })
        .populate("userId", "-password -refreshToken")
        .populate("classId", "name");
    if (!student) throw new ApiError(404, "Student profile not found");
    return res.status(200).json(new ApiResponse(200, student, "Profile fetched"));
});

export { createStudent, getAllStudents, getStudentById, getStudentsByClass, updateStudent, deleteStudent, getMyStudentProfile };
