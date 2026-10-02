import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
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
        date: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Present", "Absent", "Late"],
            required: true,
        },
    },
    { timestamps: true }
);

// Prevent duplicate attendance records for same student on same day in same class
attendanceSchema.index({ studentId: 1, classId: 1, date: 1 }, { unique: true });


export const Attendance = mongoose.model("Attendance", attendanceSchema);
