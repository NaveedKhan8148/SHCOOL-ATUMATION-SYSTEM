import mongoose, { Schema } from "mongoose";

const studentParentSchema = new Schema(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: "Parent",
            required: true,
        },
        relationship: {
            type: String,
            enum: ["Father", "Mother", "Guardian"],
            required: true,
        },
    },
    { timestamps: true }
);

// A student can't have the same parent linked twice
studentParentSchema.index({ studentId: 1, parentId: 1 }, { unique: true });

export const StudentParent = mongoose.model("StudentParent", studentParentSchema);
