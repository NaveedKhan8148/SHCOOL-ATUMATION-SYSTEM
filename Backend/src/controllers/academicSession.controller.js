import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AcademicSession } from "../models/academicSession.model.js";

// POST /api/v1/academic-sessions
const createAcademicSession = asyncHandler(async (req, res) => {
    const { name, startDate, endDate, isCurrent, status, description } = req.body;
    const organizationId = req.user.organizationId;

    if (!name?.trim() || !startDate || !endDate) {
        throw new ApiError(400, "Name, startDate, and endDate are required");
    }

    const existing = await AcademicSession.findOne({ organizationId, name: name.trim() });
    if (existing) {
        throw new ApiError(409, "An academic session with this name already exists");
    }

    if (isCurrent) {
        await AcademicSession.updateMany(
            { organizationId },
            { $set: { isCurrent: false } }
        );
    }

    const session = await AcademicSession.create({
        organizationId,
        name: name.trim(),
        startDate,
        endDate,
        isCurrent: Boolean(isCurrent),
        status: status || (isCurrent ? "ACTIVE" : "UPCOMING"),
        description: description || ""
    });

    return res.status(201).json(new ApiResponse(201, session, "Academic session created successfully"));
});

// GET /api/v1/academic-sessions
const getAllAcademicSessions = asyncHandler(async (req, res) => {
    const sessions = await AcademicSession.find({ organizationId: req.user.organizationId })
        .sort({ startDate: -1 });

    return res.status(200).json(new ApiResponse(200, sessions, "Academic sessions fetched successfully"));
});

// GET /api/v1/academic-sessions/current
const getCurrentAcademicSession = asyncHandler(async (req, res) => {
    let session = await AcademicSession.findOne({
        organizationId: req.user.organizationId,
        isCurrent: true
    });

    if (!session) {
        // Fallback to most recent ACTIVE or newest session if none explicitly set
        session = await AcademicSession.findOne({ organizationId: req.user.organizationId }).sort({ startDate: -1 });
    }

    return res.status(200).json(new ApiResponse(200, session, "Current academic session fetched"));
});

// PATCH /api/v1/academic-sessions/:id/set-current
const setSessionAsCurrent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const targetSession = await AcademicSession.findOne({ _id: id, organizationId });
    if (!targetSession) {
        throw new ApiError(404, "Academic session not found");
    }

    await AcademicSession.updateMany(
        { organizationId },
        { $set: { isCurrent: false } }
    );

    targetSession.isCurrent = true;
    targetSession.status = "ACTIVE";
    await targetSession.save();

    return res.status(200).json(new ApiResponse(200, targetSession, `Session ${targetSession.name} is now set as current`));
});

// PATCH /api/v1/academic-sessions/:id
const updateAcademicSession = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, startDate, endDate, status, description } = req.body;
    const organizationId = req.user.organizationId;

    const session = await AcademicSession.findOne({ _id: id, organizationId });
    if (!session) {
        throw new ApiError(404, "Academic session not found");
    }

    if (name) session.name = name.trim();
    if (startDate) session.startDate = startDate;
    if (endDate) session.endDate = endDate;
    if (status) session.status = status;
    if (description !== undefined) session.description = description;

    await session.save();

    return res.status(200).json(new ApiResponse(200, session, "Academic session updated successfully"));
});

// DELETE /api/v1/academic-sessions/:id
const deleteAcademicSession = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const session = await AcademicSession.findOneAndDelete({ _id: id, organizationId });
    if (!session) {
        throw new ApiError(404, "Academic session not found");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Academic session deleted successfully"));
});

export {
    createAcademicSession,
    getAllAcademicSessions,
    getCurrentAcademicSession,
    setSessionAsCurrent,
    updateAcademicSession,
    deleteAcademicSession
};
