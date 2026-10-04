import mongoose, { Schema } from "mongoose";

const classSchema = new Schema(
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
            trim: true, // e.g. "CS-101"
        },
        classTeacherId: {
            type: Schema.Types.ObjectId,
            ref: "Teacher",
            required: false,
            default: null,
        },
        section:{
            type: String,
            trim: true, // e.g. "A", "B", "C"
        },
        academicYear: {
            type: String,
            required: false,
            trim: true, // e.g. "2023-2024"
        },

    },
    { timestamps: true }
);

// Class name unique per organization
classSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Class = mongoose.model("Class", classSchema);
