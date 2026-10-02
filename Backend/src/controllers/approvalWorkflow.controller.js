import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApprovalWorkflow } from "../models/approvalWorkflow.model.js";

// ── Chain logic based on type ─────────────────────────────────────────────────
const getChain = (type) => {
    if (type === "Fee concession") return "Teacher → Admin → Accounts";
    return "Teacher → Admin";
};

// Shared populate helper so all queries return the same shape
const populateWorkflow = (query) =>
    query
        .populate("requesterId", "email role")
        .populate("resolvedBy", "email role")
        .populate({
            path: "studentId",
            select: "studentName rollNo classId",
            populate: { path: "classId", select: "name" },
        });

// POST /api/v1/workflows/
const createWorkflow = asyncHandler(async (req, res) => {
    const { type, description, studentId, remarks } = req.body;
    const organizationId = req.user.organizationId;

    if (!type || !description || !studentId) {
        throw new ApiError(400, "type, description and studentId are required");
    }

    const workflow = await ApprovalWorkflow.create({
        organizationId,
        type,
        description,
        studentId,
        requesterId: req.user._id,
        requesterName: req.user.email,
        chain: getChain(type),
        remarks: remarks || "",
    });

    const populated = await populateWorkflow(ApprovalWorkflow.findById(workflow._id));

    return res
        .status(201)
        .json(new ApiResponse(201, populated, "Workflow request submitted successfully"));
});

// GET /api/v1/workflows/
const getAllWorkflows = asyncHandler(async (req, res) => {
    const { status, type } = req.query;
    const filter = { organizationId: req.user.organizationId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const workflows = await populateWorkflow(
        ApprovalWorkflow.find(filter).sort({ createdAt: -1 })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, workflows, "Workflows fetched"));
});

// GET /api/v1/workflows/my
const getMyWorkflows = asyncHandler(async (req, res) => {
    const workflows = await populateWorkflow(
        ApprovalWorkflow.find({ organizationId: req.user.organizationId, requesterId: req.user._id }).sort({ createdAt: -1 })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, workflows, "Your workflow requests fetched"));
});

// GET /api/v1/workflows/student/:studentId
const getWorkflowsByStudent = asyncHandler(async (req, res) => {
    const workflows = await populateWorkflow(
        ApprovalWorkflow.find({ organizationId: req.user.organizationId, studentId: req.params.studentId }).sort({ createdAt: -1 })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, workflows, "Student workflows fetched"));
});

// GET /api/v1/workflows/:id
const getWorkflowById = asyncHandler(async (req, res) => {
    const workflow = await populateWorkflow(
        ApprovalWorkflow.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
    );
    if (!workflow) throw new ApiError(404, "Workflow not found");

    return res
        .status(200)
        .json(new ApiResponse(200, workflow, "Workflow fetched"));
});

// PATCH /api/v1/workflows/:id/approve
const approveWorkflow = asyncHandler(async (req, res) => {
    const workflow = await ApprovalWorkflow.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!workflow) throw new ApiError(404, "Workflow not found");
    if (workflow.status !== "Pending") {
        throw new ApiError(400, `Workflow is already ${workflow.status}`);
    }

    workflow.status = "Approved";
    workflow.resolvedBy = req.user._id;
    workflow.resolvedAt = new Date();
    workflow.remarks = req.body.remarks || workflow.remarks;
    await workflow.save();

    const populated = await populateWorkflow(ApprovalWorkflow.findById(workflow._id));

    return res
        .status(200)
        .json(new ApiResponse(200, populated, "Workflow approved successfully"));
});

// PATCH /api/v1/workflows/:id/reject
const rejectWorkflow = asyncHandler(async (req, res) => {
    const workflow = await ApprovalWorkflow.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!workflow) throw new ApiError(404, "Workflow not found");
    if (workflow.status !== "Pending") {
        throw new ApiError(400, `Workflow is already ${workflow.status}`);
    }

    workflow.status = "Rejected";
    workflow.resolvedBy = req.user._id;
    workflow.resolvedAt = new Date();
    workflow.remarks = req.body.remarks || workflow.remarks;
    await workflow.save();

    const populated = await populateWorkflow(ApprovalWorkflow.findById(workflow._id));

    return res
        .status(200)
        .json(new ApiResponse(200, populated, "Workflow rejected successfully"));
});

// PATCH /api/v1/workflows/:id
const updateWorkflow = asyncHandler(async (req, res) => {
    const workflow = await ApprovalWorkflow.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!workflow) throw new ApiError(404, "Workflow not found");
    if (workflow.status !== "Pending") {
        throw new ApiError(400, "Only pending workflows can be updated");
    }
    if (workflow.requesterId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own workflow requests");
    }

    const { description, remarks, studentId } = req.body;
    if (description) workflow.description = description;
    if (remarks !== undefined) workflow.remarks = remarks;
    if (studentId) workflow.studentId = studentId;
    await workflow.save();

    const populated = await populateWorkflow(ApprovalWorkflow.findById(workflow._id));

    return res
        .status(200)
        .json(new ApiResponse(200, populated, "Workflow updated successfully"));
});

// DELETE /api/v1/workflows/:id
const deleteWorkflow = asyncHandler(async (req, res) => {
    const workflow = await ApprovalWorkflow.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!workflow) throw new ApiError(404, "Workflow not found");
    if (workflow.requesterId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own workflow requests");
    }
    if (workflow.status !== "Pending") {
        throw new ApiError(400, "Only pending workflows can be deleted");
    }

    await ApprovalWorkflow.findByIdAndDelete(req.params.id);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Workflow deleted successfully"));
});

// GET /api/v1/workflows/stats
const getWorkflowStats = asyncHandler(async (req, res) => {
    const orgFilter = { organizationId: req.user.organizationId };
    const [total, pending, approved, rejected] = await Promise.all([
        ApprovalWorkflow.countDocuments(orgFilter),
        ApprovalWorkflow.countDocuments({ ...orgFilter, status: "Pending" }),
        ApprovalWorkflow.countDocuments({ ...orgFilter, status: "Approved" }),
        ApprovalWorkflow.countDocuments({ ...orgFilter, status: "Rejected" }),
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { total, pending, approved, rejected }, "Stats fetched"));
});

export {
    createWorkflow,
    getAllWorkflows,
    getMyWorkflows,
    getWorkflowsByStudent,
    getWorkflowById,
    approveWorkflow,
    rejectWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflowStats,
};
