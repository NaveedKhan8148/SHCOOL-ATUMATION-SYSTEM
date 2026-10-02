import mongoose, { Schema } from "mongoose";

const organizationSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        logoUrl: {
            type: String,
            trim: true,
        },
        organizationId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            // Human-readable slug, e.g. "greenwood-academy"
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
            default: "ACTIVE",
        },
        adminUserId: {
            // Reference to the first ADMIN User created for this org
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        plan: {
            type: String,
            enum: ["FREE", "BASIC", "PRO", "ENTERPRISE"],
            default: "FREE",
        },
    },
    { timestamps: true }
);

export const Organization = mongoose.model("Organization", organizationSchema);
