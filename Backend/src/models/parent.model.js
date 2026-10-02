import mongoose, { Schema } from "mongoose";

const parentSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        cnicNo: {
            type: String,
            required: true,
            trim: true,
        },
        contactNumber: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

// cnicNo unique per organization
parentSchema.index({ organizationId: 1, cnicNo: 1 }, { unique: true });

export const Parent = mongoose.model("Parent", parentSchema);
