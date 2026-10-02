import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
};

const cookieOptions = {
    httpOnly: true,
    secure: true,
};

// POST /api/v1/users/register
// Requires the caller to be an authenticated ADMIN (enforced by route middleware).
// Creates a user scoped to the same organization as the ADMIN.
const registerUser = asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    if ([email, password, role].some((f) => !f?.trim())) {
        throw new ApiError(400, "email, password and role are required");
    }

    // Scope to the ADMIN's organization
    const organizationId = req.user.organizationId;

    const existing = await User.findOne({ organizationId, email: email.toLowerCase().trim() });
    if (existing) throw new ApiError(409, "User with this email already exists in this organization");

    const user = await User.create({ organizationId, email, password, role });
    const created = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(201)
        .json(new ApiResponse(201, created, "User registered successfully"));
});

// POST /api/v1/users/login
// Requires organizationId so users from different orgs can share the same email.
const loginUser = asyncHandler(async (req, res) => {
    const { email, password, organizationId } = req.body;
    if (!email || !password || !organizationId) {
        throw new ApiError(400, "email, password and organizationId are required");
    }

    const user = await User.findOne({
        organizationId: organizationId.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
    });
    if (!user) throw new ApiError(404, "User not found");

    if (user.status === "INACTIVE") {
        throw new ApiError(403, "Your account is inactive. Contact your administrator.");
    }

    const isValid = await user.isPasswordCorrect(password);
    if (!isValid) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedIn = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user: loggedIn, accessToken, refreshToken }, "Login successful"));
});

// POST /api/v1/users/logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true });

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// POST /api/v1/users/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incomingToken) throw new ApiError(401, "Unauthorized request");

    const decoded = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    if (!user || incomingToken !== user.refreshToken) throw new ApiError(401, "Invalid or expired refresh token");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
});

// POST /api/v1/users/change-password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isValid = await user.isPasswordCorrect(oldPassword);
    if (!isValid) throw new ApiError(400, "Incorrect old password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// GET /api/v1/users/current-user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched"));
});

// PATCH /api/v1/users/status/:id  (admin only — same org)
const updateUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!["ACTIVE", "INACTIVE"].includes(status)) throw new ApiError(400, "Invalid status value");

    const user = await User.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId },
        { $set: { status } },
        { new: true }
    ).select("-password -refreshToken");

    if (!user) throw new ApiError(404, "User not found");

    return res.status(200).json(new ApiResponse(200, user, "User status updated"));
});

// DELETE /api/v1/users/:id  (admin only — same org)
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findOneAndDelete({
        _id: req.params.id,
        organizationId: req.user.organizationId,
    });
    if (!user) throw new ApiError(404, "User not found");

    return res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});

// GET /api/v1/users/ (admin only — scoped to own org)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ organizationId: req.user.organizationId }).select("-password -refreshToken");
    return res.status(200).json(new ApiResponse(200, users, "Users fetched"));
});

// GET /api/v1/users/by-role/:role
const getUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.params;
    const { status, search, page = 1, limit = 50 } = req.query;

    const VALID_ROLES = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];
    if (!VALID_ROLES.includes(role.toUpperCase())) {
        throw new ApiError(
            400,
            `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`
        );
    }

    const filter = { organizationId: req.user.organizationId, role: role.toUpperCase() };

    if (status) {
        if (!["ACTIVE", "INACTIVE"].includes(status.toUpperCase())) {
            throw new ApiError(400, `Invalid status "${status}". Must be ACTIVE or INACTIVE`);
        }
        filter.status = status.toUpperCase();
    }

    if (search?.trim()) {
        filter.email = { $regex: search.trim(), $options: "i" };
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
        User.find(filter)
            .select("-password -refreshToken")
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 }),
        User.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                pagination: {
                    total,
                    page:       pageNum,
                    limit:      limitNum,
                    totalPages: Math.ceil(total / limitNum),
                    hasNext:    pageNum < Math.ceil(total / limitNum),
                    hasPrev:    pageNum > 1,
                },
                filters: { role: role.toUpperCase(), status: status?.toUpperCase() || null, search: search || null },
            },
            `Users with role "${role.toUpperCase()}" fetched successfully`
        )
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserStatus,
    deleteUser,
    getAllUsers,
    getUsersByRole,
};
