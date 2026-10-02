import mongoose, { Schema } from "mongoose";

const timetableSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        classId: {
            type: Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },
        teacherId: {
            type: Schema.Types.ObjectId,
            ref: "Teacher",
            required: true,
        },
        dayOfWeek: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            required: true,
        },
        timeSlot: {
            type: String,
            required: true,
            trim: true, // e.g. "08:00-09:00"
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        roomLocation: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

// Prevent double-booking a class at the same day/time slot
timetableSchema.index({ classId: 1, dayOfWeek: 1, timeSlot: 1 }, { unique: true });

// Prevent double-booking a teacher at the same day/time slot
timetableSchema.index({ teacherId: 1, dayOfWeek: 1, timeSlot: 1 }, { unique: true });

export const Timetable = mongoose.model("Timetable", timetableSchema);
