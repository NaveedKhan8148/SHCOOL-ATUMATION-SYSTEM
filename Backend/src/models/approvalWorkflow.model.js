import mongoose, { Schema } from "mongoose";

const approvalWorkflowSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["Fee concession", "Result correction", "Attendance adjustment"],
            required: true,
        },
        requesterId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        requesterName: {
            type: String,
            required: true,
            trim: true,
        },
        // ── Associated student ────────────────────────────────────────────────
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        chain: {
            type: String,
            enum: ["Teacher → Admin", "Teacher → Admin → Accounts"],
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        remarks: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { timestamps: true }
);

export const ApprovalWorkflow = mongoose.model("ApprovalWorkflow", approvalWorkflowSchema);
