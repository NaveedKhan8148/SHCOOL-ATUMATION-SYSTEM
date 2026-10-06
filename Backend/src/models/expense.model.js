import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        receiptNo: {
            type: String,
            required: true,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ["UTILITIES", "MAINTENANCE", "STATIONERY", "VENDOR_PAYMENT", "SALARY", "EVENT", "OTHER"],
            default: "OTHER",
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        expenseDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        paymentMethod: {
            type: String,
            enum: ["CASH", "BANK_TRANSFER", "CHEQUE"],
            default: "CASH",
        },
        paidTo: {
            type: String,
            trim: true,
            default: "",
        },
        notes: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

export const Expense = mongoose.model("Expense", expenseSchema);
