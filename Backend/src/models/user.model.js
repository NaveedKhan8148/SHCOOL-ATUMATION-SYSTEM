import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        organizationId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
        },
        refreshToken: {
            type: String,
        },
        passwordResetToken: {
            type: String,
            default: null,
        },
        passwordResetExpiry: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Unique email per organization (not globally unique)
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, role: this.role, organizationId: this.organizationId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id, organizationId: this.organizationId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

export const User = mongoose.model("User", userSchema);
