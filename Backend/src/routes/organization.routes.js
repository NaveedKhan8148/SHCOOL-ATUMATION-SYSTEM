import { Router } from "express";
import {
    registerOrganization,
    getMyOrganization,
    updateMyOrganization,
    getAllOrganizations,
    checkOrganization,
} from "../controllers/organization.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// Register a new organization (first-time setup)
router.route("/register").post(registerOrganization);

// Check if an org ID exists (used on login page)
router.route("/check/:organizationId").get(checkOrganization);

// Platform-level list (protected by master key, not JWT)
router.route("/").get(getAllOrganizations);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.route("/me").get(verifyJWT, getMyOrganization);
router.route("/me").patch(verifyJWT, updateMyOrganization);

export default router;
