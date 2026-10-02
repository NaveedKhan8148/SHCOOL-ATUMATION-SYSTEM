import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts an organization name into a URL-friendly slug.
 * e.g. "Greenwood Academy" → "greenwood-academy"
 */
const generateSlug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

/**
 * Ensures the slug is unique; appends a numeric suffix if needed.
 */
const uniqueSlug = async (base) => {
    let slug = base;
    let counter = 1;
    while (await Organization.findOne({ organizationId: slug })) {
        slug = `${base}-${counter++}`;
    }
    return slug;
};

// ── POST /api/v1/organizations/register ──────────────────────────────────────
/**
 * Registers a brand-new organization AND creates its first ADMIN user in one
 * atomic-ish operation. No existing session is required (public endpoint).
 *
 * Body:
 *   orgName        – display name of the organization  (required)
 *   orgEmail       – contact email for the organization (required)
 *   orgPhone       – phone number                       (optional)
 *   orgAddress     – postal address                     (optional)
 *   adminEmail     – login email for the first admin    (required)
 *   adminPassword  – password for the first admin       (required)
 */
const registerOrganization = asyncHandler(async (req, res) => {
    const {
        orgName,
        orgEmail,
        orgPhone,
        orgAddress,
        adminEmail,
        adminPassword,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!orgName?.trim() || !orgEmail?.trim() || !adminEmail?.trim() || !adminPassword?.trim()) {
        throw new ApiError(
            400,
            "orgName, orgEmail, adminEmail and adminPassword are required"
        );
    }

    // ── Check org email is not already taken ──────────────────────────────────
    const existingOrg = await Organization.findOne({ email: orgEmail.toLowerCase().trim() });
    if (existingOrg) {
        throw new ApiError(409, "An organization with this email already exists");
    }

    // ── Generate unique organizationId slug ───────────────────────────────────
    const baseSlug = generateSlug(orgName);
    const organizationId = await uniqueSlug(baseSlug);

    // ── Create the Organization document first ────────────────────────────────
    const org = await Organization.create({
        name: orgName.trim(),
        email: orgEmail.toLowerCase().trim(),
        phone: orgPhone?.trim() || undefined,
        address: orgAddress?.trim() || undefined,
        organizationId,
    });

    // ── Create the first ADMIN user scoped to this org ────────────────────────
    // Check if admin email already used inside this org (should be clean, but guard)
    const existingAdmin = await User.findOne({
        organizationId,
        email: adminEmail.toLowerCase().trim(),
    });
    if (existingAdmin) {
        // Rollback org creation
        await Organization.findByIdAndDelete(org._id);
        throw new ApiError(
            409,
            "A user with this admin email already exists in this organization"
        );
    }

    const adminUser = await User.create({
        organizationId,
        email: adminEmail.toLowerCase().trim(),
        password: adminPassword,
        role: "ADMIN",
    });

    // ── Link admin user back to org ───────────────────────────────────────────
    org.adminUserId = adminUser._id;
    await org.save();

    // ── Return success ────────────────────────────────────────────────────────
    const safeAdmin = await User.findById(adminUser._id).select("-password -refreshToken");

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                organization: {
                    _id: org._id,
                    name: org.name,
                    email: org.email,
                    organizationId: org.organizationId,
                    status: org.status,
                    plan: org.plan,
                    createdAt: org.createdAt,
                },
                adminUser: safeAdmin,
            },
            `Organization "${org.name}" registered successfully! Your organization ID is: ${org.organizationId}`
        )
    );
});

// ── GET /api/v1/organizations/me ──────────────────────────────────────────────
/**
 * Returns the current user's organization details.
 * Requires a valid JWT (verifyJWT middleware).
 */
const getMyOrganization = asyncHandler(async (req, res) => {
    const org = await Organization.findOne({ organizationId: req.user.organizationId });
    if (!org) throw new ApiError(404, "Organization not found");

    return res.status(200).json(new ApiResponse(200, org, "Organization fetched"));
});

// ── PATCH /api/v1/organizations/me ───────────────────────────────────────────
/**
 * Updates editable fields of the current user's organization (ADMIN only).
 */
const updateMyOrganization = asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
        throw new ApiError(403, "Only ADMIN can update organization details");
    }

    const allowed = ["name", "phone", "address", "logoUrl"];
    const updates = {};
    allowed.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const org = await Organization.findOneAndUpdate(
        { organizationId: req.user.organizationId },
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!org) throw new ApiError(404, "Organization not found");

    return res.status(200).json(new ApiResponse(200, org, "Organization updated"));
});

// ── GET /api/v1/organizations  (super-admin / platform-level, optional) ──────
/**
 * Lists all organizations. Intended for a future platform-admin dashboard.
 * Protected by a simple master-key header for now.
 */
const getAllOrganizations = asyncHandler(async (req, res) => {
    const masterKey = req.headers["x-master-key"];
    if (!masterKey || masterKey !== process.env.MASTER_ADMIN_KEY) {
        throw new ApiError(403, "Access denied");
    }

    const { page = 1, limit = 20, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const filter = {};
    if (search?.trim()) {
        filter.$or = [
            { name: { $regex: search.trim(), $options: "i" } },
            { organizationId: { $regex: search.trim(), $options: "i" } },
            { email: { $regex: search.trim(), $options: "i" } },
        ];
    }

    const [orgs, total] = await Promise.all([
        Organization.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
        Organization.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            organizations: orgs,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        }, "Organizations fetched")
    );
});

// ── GET /api/v1/organizations/check/:organizationId ──────────────────────────
/**
 * Public endpoint to check if an organizationId exists (used on the login page
 * so users can verify their org before entering credentials).
 */
const checkOrganization = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const org = await Organization.findOne(
        { organizationId: organizationId.toLowerCase().trim() },
        { name: 1, organizationId: 1, status: 1, logoUrl: 1 }
    );

    if (!org) throw new ApiError(404, "Organization not found");
    if (org.status !== "ACTIVE") {
        throw new ApiError(403, `Organization is ${org.status.toLowerCase()}`);
    }

    return res.status(200).json(new ApiResponse(200, org, "Organization found"));
});

export {
    registerOrganization,
    getMyOrganization,
    updateMyOrganization,
    getAllOrganizations,
    checkOrganization,
};
