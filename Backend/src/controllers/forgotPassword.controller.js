import crypto from "crypto";
import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

// ─── Helper: generate a secure random token and its hash ──────────────────────
const generateResetToken = () => {
    const rawToken = crypto.randomBytes(32).toString("hex");          // sent to user
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex"); // stored in DB
    return { rawToken, hashedToken };
};

// ─── POST /api/v1/users/forgot-password ───────────────────────────────────────
// Public route — no JWT required.
// Body: { email, organizationId }
const forgotPassword = asyncHandler(async (req, res) => {
    const { email, organizationId } = req.body;

    if (!email?.trim() || !organizationId?.trim()) {
        throw new ApiError(400, "Email and Organization ID are required");
    }

    // Find the user inside this organization
    const user = await User.findOne({
        email: email.toLowerCase().trim(),
        organizationId: organizationId.trim(),
    });

    // Always respond OK even if user not found — prevents email enumeration attacks
    if (!user) {
        return res.status(200).json(
            new ApiResponse(200, {}, "If that email exists in our system, a reset link has been sent.")
        );
    }

    if (user.status === "INACTIVE") {
        throw new ApiError(403, "This account is inactive. Please contact your administrator.");
    }

    // Generate token
    const { rawToken, hashedToken } = generateResetToken();

    // Store hashed token + 1-hour expiry
    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // Build reset link pointing to the frontend
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&orgId=${organizationId}`;

    // Send email
    try {
        await sendPasswordResetEmail(user.email, resetLink, user.email);
    } catch (emailErr) {
        // Roll back token if email fails
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save({ validateBeforeSave: false });
        console.error("Email send error:", emailErr.message);
        throw new ApiError(500, "Failed to send reset email. Please try again later.");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Password reset link has been sent to your email.")
    );
});

// ─── POST /api/v1/users/reset-password ────────────────────────────────────────
// Public route — no JWT required.
// Body: { token, organizationId, newPassword }
const resetPassword = asyncHandler(async (req, res) => {
    const { token, organizationId, newPassword } = req.body;

    if (!token?.trim() || !organizationId?.trim() || !newPassword?.trim()) {
        throw new ApiError(400, "Token, Organization ID, and new password are required");
    }

    if (newPassword.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters");
    }

    // Hash the incoming raw token to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const user = await User.findOne({
        organizationId: organizationId.trim(),
        passwordResetToken: hashedToken,
        passwordResetExpiry: { $gt: new Date() }, // must not be expired
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired reset token. Please request a new one.");
    }

    // Set the new password — pre-save hook will hash it
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.refreshToken = null; // invalidate all existing sessions
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password has been reset successfully. You can now log in.")
    );
});

export { forgotPassword, resetPassword };
