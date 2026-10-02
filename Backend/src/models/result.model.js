import mongoose, { Schema } from "mongoose";

const resultSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        classId: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        marks: {
            type: Number,
            required: true,
            min: 0,
        },
        grade: {
            type: String,
            required: true,
            trim: true,
        },
        semester: {
            type: String,
            required: true,
            trim: true, // e.g. "Fall-2024"
        },
    },
    { timestamps: true }
);

// Prevent duplicate result entry for same student, class, subject, semester
resultSchema.index({ studentId: 1, classId: 1, subject: 1, semester: 1 }, { unique: true });

export const Result = mongoose.model("Result", resultSchema);
