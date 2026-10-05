import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserStatus,
    deleteUser,
    getAllUsers,
    getUsersByRole
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { forgotPassword, resetPassword } from "../controllers/forgotPassword.controller.js";

const router = Router();

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// ── Public: password reset (no auth needed) ───────────────────────────────────
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);

// Secured
router.route("/register").post(verifyJWT,registerUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);

// Admin only
router.route("/").get(verifyJWT, getAllUsers);
router.route("/:id/status").patch(verifyJWT, updateUserStatus);
router.route("/:id").delete(verifyJWT, deleteUser);
router.route("/by-role/:role").get(verifyJWT, getUsersByRole);
router.route("/:id/status").patch(verifyJWT, updateUserStatus);
export default router;
