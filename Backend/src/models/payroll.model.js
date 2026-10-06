import mongoose, { Schema } from "mongoose";

const payrollItemSchema = new Schema({
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const payrollSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        payslipNo: {
            type: String,
            required: true,
            trim: true,
        },
        teacherId: {
            type: Schema.Types.ObjectId,
            ref: "Teacher",
            required: true,
        },
        month: {
            type: String,
            required: true,
            trim: true, // e.g. "October 2025"
        },
        basicSalary: {
            type: Number,
            required: true,
            min: 0,
        },
        allowances: [payrollItemSchema],
        totalAllowance: {
            type: Number,
            default: 0,
        },
        deductions: [payrollItemSchema],
        totalDeduction: {
            type: Number,
            default: 0,
        },
        netSalary: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "DISBURSED"],
            default: "PENDING",
        },
        disbursedDate: {
            type: Date,
            default: null,
        },
        paymentMethod: {
            type: String,
            enum: ["CASH", "BANK_TRANSFER", "CHEQUE"],
            default: "BANK_TRANSFER",
        },
        remarks: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

payrollSchema.index({ organizationId: 1, payslipNo: 1 }, { unique: true });

export const Payroll = mongoose.model("Payroll", payrollSchema);
