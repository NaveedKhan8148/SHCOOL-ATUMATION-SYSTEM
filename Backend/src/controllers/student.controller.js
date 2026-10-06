import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Student } from "../models/student.model.js";
import { User } from "../models/user.model.js";
import { Class } from "../models/class.model.js";
import { AcademicSession } from "../models/academicSession.model.js";

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

// POST /api/v1/students/bulk-promote
const bulkPromoteStudents = asyncHandler(async (req, res) => {
    const { sourceClassId, targetClassId, targetSessionId, promotions } = req.body;
    const organizationId = req.user.organizationId;

    if (!sourceClassId || !targetSessionId || !Array.isArray(promotions) || promotions.length === 0) {
        throw new ApiError(400, "sourceClassId, targetSessionId, and promotions array are required");
    }

    const targetSession = await AcademicSession.findOne({ _id: targetSessionId, organizationId });
    const sourceClass = await Class.findOne({ _id: sourceClassId, organizationId });
    const targetClass = targetClassId ? await Class.findOne({ _id: targetClassId, organizationId }) : null;

    let promotedCount = 0;
    let retainedCount = 0;
    let graduatedCount = 0;

    for (const item of promotions) {
        const { studentId, action, newRollNo, remarks } = item;
        const student = await Student.findOne({ _id: studentId, organizationId }).populate("classId");

        if (!student) continue;

        // Archive current session/class history entry
        const historyEntry = {
            sessionId: student.academicSessionId || null,
            sessionName: targetSession ? targetSession.name : "",
            classId: student.classId?._id || student.classId,
            className: student.classId?.name || sourceClass?.name || "",
            rollNo: student.rollNo,
            status: action || "PROMOTED",
            promotedAt: new Date(),
            remarks: remarks || ""
        };

        student.sessionHistory.push(historyEntry);

        if (action === "GRADUATE") {
            student.status = "GRADUATED";
            student.academicSessionId = targetSessionId;
            graduatedCount++;
        } else if (action === "RETAIN") {
            student.status = "ACTIVE";
            student.academicSessionId = targetSessionId;
            if (newRollNo) student.rollNo = newRollNo;
            retainedCount++;
        } else {
            // Default: PROMOTE
            if (targetClassId) {
                student.classId = targetClassId;
            }
            student.status = "ACTIVE";
            student.academicSessionId = targetSessionId;
            if (newRollNo) student.rollNo = newRollNo;
            promotedCount++;
        }

        await student.save();
    }

    return res.status(200).json(
        new ApiResponse(200, { promotedCount, retainedCount, graduatedCount }, "Bulk promotion processed successfully")
    );
});

// GET /api/v1/students/alumni
const getAlumniStudents = asyncHandler(async (req, res) => {
    const alumni = await Student.find({
        organizationId: req.user.organizationId,
        status: { $in: ["ALUMNI", "GRADUATED"] }
    })
        .populate("userId", "-password -refreshToken")
        .populate("classId", "name")
        .sort({ updatedAt: -1 });

    return res.status(200).json(new ApiResponse(200, alumni, "Alumni students fetched"));
});

export {
    createStudent,
    getAllStudents,
    getStudentById,
    getStudentsByClass,
    updateStudent,
    deleteStudent,
    getMyStudentProfile,
    bulkPromoteStudents,
    getAlumniStudents
};
