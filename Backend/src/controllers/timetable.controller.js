import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Timetable } from "../models/timetable.model.js";

// POST /api/v1/timetable/
const createTimetableEntry = asyncHandler(async (req, res) => {
    const { classId, teacherId, dayOfWeek, timeSlot, subject, roomLocation } = req.body;
    const organizationId = req.user.organizationId;

    if (!classId || !teacherId || !dayOfWeek || !timeSlot || !subject || !roomLocation) {
        throw new ApiError(400, "All fields are required");
    }

    // Check class double-booking within same org
    const classConflict = await Timetable.findOne({ organizationId, classId, dayOfWeek, timeSlot });
    if (classConflict) throw new ApiError(409, "Class already has a lesson at this day/time slot");

    // Check teacher double-booking within same org
    const teacherConflict = await Timetable.findOne({ organizationId, teacherId, dayOfWeek, timeSlot });
    if (teacherConflict) throw new ApiError(409, "Teacher already has a lesson at this day/time slot");

    const entry = await Timetable.create({ organizationId, classId, teacherId, dayOfWeek, timeSlot, subject, roomLocation });
    return res.status(201).json(new ApiResponse(201, entry, "Timetable entry created successfully"));
});

// GET /api/v1/timetable/class/:classId
const getTimetableByClass = asyncHandler(async (req, res) => {
    const entries = await Timetable.find({ organizationId: req.user.organizationId, classId: req.params.classId })
        .populate("teacherId", "name subject")
        .sort({ dayOfWeek: 1, timeSlot: 1 });

    return res.status(200).json(new ApiResponse(200, entries, "Timetable fetched for class"));
});

// GET /api/v1/timetable/teacher/:teacherId
const getTimetableByTeacher = asyncHandler(async (req, res) => {
    const entries = await Timetable.find({ organizationId: req.user.organizationId, teacherId: req.params.teacherId })
        .populate("classId", "name")
        .sort({ dayOfWeek: 1, timeSlot: 1 });

    return res.status(200).json(new ApiResponse(200, entries, "Timetable fetched for teacher"));
});

// PATCH /api/v1/timetable/:id
const updateTimetableEntry = asyncHandler(async (req, res) => {
    const { dayOfWeek, timeSlot, subject, roomLocation, teacherId, classId } = req.body;

    const entry = await Timetable.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { dayOfWeek, timeSlot, subject, roomLocation, teacherId, classId } },
        { new: true, runValidators: true }
    );

    if (!entry) throw new ApiError(404, "Timetable entry not found");
    return res.status(200).json(new ApiResponse(200, entry, "Timetable entry updated"));
});

// DELETE /api/v1/timetable/:id
const deleteTimetableEntry = asyncHandler(async (req, res) => {
    const entry = await Timetable.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!entry) throw new ApiError(404, "Timetable entry not found");
    return res.status(200).json(new ApiResponse(200, {}, "Timetable entry deleted"));
});

export {
    createTimetableEntry,
    getTimetableByClass,
    getTimetableByTeacher,
    updateTimetableEntry,
    deleteTimetableEntry,
};
