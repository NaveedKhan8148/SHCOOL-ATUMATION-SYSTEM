import mongoose, { Schema } from "mongoose";

const teacherSchema = new Schema(
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
        name: {
            type: String,
            required: true,
            trim: true,
        },
        cnicNumber: {
            type: String,
            required: true,
            trim: true,
        },
        contactNumber: {
            type: String,
            required: true,
            trim: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        dateOfJoining: {
            type: Date,
            required: true,
        },
        address: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
        },
    },
    { timestamps: true }
);

// cnicNumber unique per organization
teacherSchema.index({ organizationId: 1, cnicNumber: 1 }, { unique: true });

export const Teacher = mongoose.model("Teacher", teacherSchema);
