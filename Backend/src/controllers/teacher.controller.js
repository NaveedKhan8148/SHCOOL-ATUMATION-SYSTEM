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

    const cleanEmail = email.toLowerCase().trim();
    const cleanCnic = cnicNumber.trim();

    // Pre-validate both CNIC and Email against the organization
    const [existingUser, existingTeacher] = await Promise.all([
        User.findOne({ organizationId, email: cleanEmail }),
        Teacher.findOne({ organizationId, cnicNumber: cleanCnic })
    ]);

    const errors = [];
    if (existingTeacher) {
        errors.push({
            field: "cnicNumber",
            message: "This CNIC number is already registered. Please use a different CNIC number."
        });
    }
    if (existingUser) {
        errors.push({
            field: "email",
            message: "This email address is already registered. Please use a different email address."
        });
    }

    if (errors.length > 0) {
        const msg = errors.map(e => e.message).join(" ");
        throw new ApiError(409, msg, errors);
    }

    let user;
    try {
        user = await User.create({ organizationId, email: cleanEmail, password, role: "TEACHER" });
    } catch (err) {
        if (err.code === 11000 || err.name === "MongoServerError") {
            const isEmail = err.keyPattern?.email || err.keyValue?.email;
            if (isEmail) {
                throw new ApiError(409, "This email address is already registered. Please use a different email address.", [
                    { field: "email", message: "This email address is already registered. Please use a different email address." }
                ]);
            }
        }
        throw err;
    }

    let teacher;
    try {
        teacher = await Teacher.create({
            organizationId,
            userId: user._id,
            name: name.trim(),
            cnicNumber: cleanCnic,
            contactNumber: contactNumber.trim(),
            subject: subject.trim(),
            dateOfJoining,
            address: address ? address.trim() : "",
        });
    } catch (err) {
        // Rollback user creation to avoid orphaned user documents if teacher creation fails
        if (user?._id) {
            await User.findByIdAndDelete(user._id).catch(() => {});
        }

        if (err.code === 11000 || err.name === "MongoServerError") {
            const isCnic = err.keyPattern?.cnicNumber || err.keyValue?.cnicNumber;
            if (isCnic) {
                throw new ApiError(409, "This CNIC number is already registered. Please use a different CNIC number.", [
                    { field: "cnicNumber", message: "This CNIC number is already registered. Please use a different CNIC number." }
                ]);
            }
        }
        throw err;
    }

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
    const { name, cnicNumber, contactNumber, subject, dateOfJoining, address, status, email, password } = req.body;
    const organizationId = req.user.organizationId;
    const teacherId = req.params.id;

    const teacher = await Teacher.findOne({ _id: teacherId, organizationId });
    if (!teacher) throw new ApiError(404, "Teacher not found");

    const cleanCnic = cnicNumber ? cnicNumber.trim() : null;
    const cleanEmail = email ? email.toLowerCase().trim() : null;

    const errors = [];

    // Pre-validate CNIC excluding current teacher
    if (cleanCnic && cleanCnic !== teacher.cnicNumber) {
        const existingCnicTeacher = await Teacher.findOne({
            organizationId,
            cnicNumber: cleanCnic,
            _id: { $ne: teacherId }
        });
        if (existingCnicTeacher) {
            errors.push({
                field: "cnicNumber",
                message: "This CNIC number is already registered. Please use a different CNIC number."
            });
        }
    }

    // Pre-validate Email excluding current teacher's user
    if (cleanEmail && teacher.userId) {
        const existingEmailUser = await User.findOne({
            organizationId,
            email: cleanEmail,
            _id: { $ne: teacher.userId }
        });
        if (existingEmailUser) {
            errors.push({
                field: "email",
                message: "This email address is already registered. Please use a different email address."
            });
        }
    }

    if (errors.length > 0) {
        const msg = errors.map(e => e.message).join(" ");
        throw new ApiError(409, msg, errors);
    }

    // Update User if email, status, or password changed
    if (teacher.userId) {
        try {
            if (password && password.trim() !== '') {
                const user = await User.findById(teacher.userId);
                if (user) {
                    if (cleanEmail) user.email = cleanEmail;
                    if (status) user.status = status;
                    user.password = password.trim();
                    await user.save();
                }
            } else {
                const userUpdate = {};
                if (cleanEmail) userUpdate.email = cleanEmail;
                if (status) userUpdate.status = status;
                if (Object.keys(userUpdate).length > 0) {
                    await User.findByIdAndUpdate(teacher.userId, { $set: userUpdate });
                }
            }
        } catch (err) {
            if (err.code === 11000 || err.name === "MongoServerError") {
                const isEmail = err.keyPattern?.email || err.keyValue?.email;
                if (isEmail) {
                    throw new ApiError(409, "This email address is already registered. Please use a different email address.", [
                        { field: "email", message: "This email address is already registered. Please use a different email address." }
                    ]);
                }
            }
            throw err;
        }
    }

    const teacherUpdate = {};
    if (name !== undefined) teacherUpdate.name = name;
    if (cleanCnic) teacherUpdate.cnicNumber = cleanCnic;
    if (contactNumber !== undefined) teacherUpdate.contactNumber = contactNumber;
    if (subject !== undefined) teacherUpdate.subject = subject;
    if (dateOfJoining !== undefined) teacherUpdate.dateOfJoining = dateOfJoining;
    if (address !== undefined) teacherUpdate.address = address;
    if (status !== undefined) teacherUpdate.status = status;

    let updatedTeacher;
    try {
        updatedTeacher = await Teacher.findOneAndUpdate(
            { _id: teacherId, organizationId },
            { $set: teacherUpdate },
            { new: true, runValidators: true }
        ).populate("userId", "-password -refreshToken");
    } catch (err) {
        if (err.code === 11000 || err.name === "MongoServerError") {
            const isCnic = err.keyPattern?.cnicNumber || err.keyValue?.cnicNumber;
            if (isCnic) {
                throw new ApiError(409, "This CNIC number is already registered. Please use a different CNIC number.", [
                    { field: "cnicNumber", message: "This CNIC number is already registered. Please use a different CNIC number." }
                ]);
            }
        }
        throw err;
    }

    return res.status(200).json(new ApiResponse(200, updatedTeacher, "Teacher updated successfully"));
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
