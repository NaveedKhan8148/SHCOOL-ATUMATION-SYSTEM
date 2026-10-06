import mongoose, { Schema } from "mongoose";

const academicSessionSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isCurrent: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["UPCOMING", "ACTIVE", "COMPLETED"],
            default: "UPCOMING",
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { timestamps: true }
);

// Unique session name per organization
academicSessionSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const AcademicSession = mongoose.model("AcademicSession", academicSessionSchema);
