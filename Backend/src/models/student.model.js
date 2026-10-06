import mongoose, { Schema } from "mongoose";

const studentSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        rollNo: {
            type: String,
            required: true,
            trim: true,
        },
        studentName: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        dateOfJoining: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "PROMOTED", "RETAINED", "ALUMNI", "GRADUATED"],
            default: "ACTIVE",
        },
        classId: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },
        academicSessionId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicSession",
            required: false,
        },
        sessionHistory: [
            {
                sessionId: { type: Schema.Types.ObjectId, ref: "AcademicSession" },
                sessionName: { type: String, trim: true },
                classId: { type: Schema.Types.ObjectId, ref: "Class" },
                className: { type: String, trim: true },
                rollNo: { type: String, trim: true },
                status: { type: String, trim: true },
                promotedAt: { type: Date, default: Date.now },
                remarks: { type: String, default: "" }
            }
        ],
    },
    { timestamps: true }
);

// rollNo unique per organization
studentSchema.index({ organizationId: 1, rollNo: 1 }, { unique: true });

export const Student = mongoose.model("Student", studentSchema);
