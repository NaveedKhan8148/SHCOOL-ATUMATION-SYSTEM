import mongoose, { Schema } from "mongoose";

const feesSchema = new Schema(
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
        feeType: {
            type: String,
            enum: ["Tuition", "Lab", "Library" ,"Exam","Sports","Transport"],
            required: true,
        },
        amount: {
            type: mongoose.Types.Decimal128,
            required: true,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Paid", "Pending", "Overdue"],
            default: "Pending",
        },
        paidDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export const Fees = mongoose.model("Fees", feesSchema);
