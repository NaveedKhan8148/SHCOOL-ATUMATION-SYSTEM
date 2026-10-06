import mongoose, { Schema } from "mongoose";

const feeHeadSchema = new Schema({
    headName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const concessionSchema = new Schema({
    concessionType: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const feesSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        voucherNo: {
            type: String,
            required: true,
            trim: true,
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        academicSessionId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicSession",
            required: false,
        },
        feeMonth: {
            type: String,
            required: true,
            trim: true, // e.g. "October 2025"
        },
        feeHeads: [feeHeadSchema],
        subTotal: {
            type: Number,
            required: true,
            default: 0,
        },
        concessions: [concessionSchema],
        totalConcession: {
            type: Number,
            default: 0,
        },
        netPayable: {
            type: Number,
            required: true,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["PAID", "PENDING", "OVERDUE", "PARTIAL"],
            default: "PENDING",
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        paidDate: {
            type: Date,
            default: null,
        },
        paymentMethod: {
            type: String,
            enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "OTHER"],
            default: "CASH",
        },
        receivedBy: {
            type: String,
            default: "",
        },
        remarks: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// Voucher number unique per organization
feesSchema.index({ organizationId: 1, voucherNo: 1 }, { unique: true });

export const Fees = mongoose.model("Fees", feesSchema);
