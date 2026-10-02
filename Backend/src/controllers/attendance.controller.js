import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Attendance } from "../models/attendance.model.js";

// POST /api/v1/attendance/
const markAttendance = asyncHandler(async (req, res) => {
    const { studentId, classId, date, status } = req.body;
    const organizationId = req.user.organizationId;

    if (!studentId || !classId || !date || !status) {
        throw new ApiError(400, "studentId, classId, date and status are required");
    }

    const existing = await Attendance.findOne({ studentId, classId, date: new Date(date) });
    if (existing) throw new ApiError(409, "Attendance already marked for this student on this date");

    const attendance = await Attendance.create({ organizationId, studentId, classId, date, status });

    return res.status(201).json(new ApiResponse(201, attendance, "Attendance marked successfully"));
});

// POST /api/v1/attendance/bulk
const markBulkAttendance = asyncHandler(async (req, res) => {
    const { records } = req.body;
    const organizationId = req.user.organizationId;

    if (!Array.isArray(records) || records.length === 0) {
        throw new ApiError(400, "records array is required");
    }

    const recordsWithOrg = records.map((r) => ({ ...r, organizationId }));
    const inserted = await Attendance.insertMany(recordsWithOrg, { ordered: false });

    return res.status(201).json(new ApiResponse(201, inserted, "Bulk attendance marked successfully"));
});

// GET /api/v1/attendance/student/:studentId
const getAttendanceByStudent = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const filter = { organizationId: req.user.organizationId, studentId: req.params.studentId };

    if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = new Date(from);
        if (to) filter.date.$lte = new Date(to);
    }

    const records = await Attendance.find(filter)
        .populate("classId", "name")
        .sort({ date: -1 });

    return res.status(200).json(new ApiResponse(200, records, "Attendance fetched"));
});

// GET /api/v1/attendance/class/:classId?date=YYYY-MM-DD
const getAttendanceByClassAndDate = asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) throw new ApiError(400, "date query param is required");

    const records = await Attendance.find({
        organizationId: req.user.organizationId,
        classId: req.params.classId,
        date: new Date(date),
    }).populate("studentId", "studentName rollNo");

    return res.status(200).json(new ApiResponse(200, records, "Class attendance fetched"));
});

// PATCH /api/v1/attendance/:id
const updateAttendance = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) throw new ApiError(400, "status is required");

    const record = await Attendance.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { status } },
        { new: true, runValidators: true }
    );

    if (!record) throw new ApiError(404, "Attendance record not found");
    return res.status(200).json(new ApiResponse(200, record, "Attendance updated"));
});

// DELETE /api/v1/attendance/:id
const deleteAttendance = asyncHandler(async (req, res) => {
    const record = await Attendance.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) throw new ApiError(404, "Attendance record not found");
    return res.status(200).json(new ApiResponse(200, {}, "Attendance deleted"));
});

export {
    markAttendance,
    markBulkAttendance,
    getAttendanceByStudent,
    getAttendanceByClassAndDate,
    updateAttendance,
    deleteAttendance,
};
