import { Router } from "express";
import {
    createWorkflow,
    getAllWorkflows,
    getMyWorkflows,
    getWorkflowsByStudent,
    getWorkflowById,
    approveWorkflow,
    rejectWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflowStats,
} from "../controllers/approvalWorkflow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// ⚠️ specific routes MUST come before /:id
router.route("/stats").get(getWorkflowStats);
router.route("/my").get(getMyWorkflows);
router.route("/student/:studentId").get(getWorkflowsByStudent);

// Main CRUD
router.route("/").get(getAllWorkflows).post(createWorkflow);
router.route("/:id").get(getWorkflowById).patch(updateWorkflow).delete(deleteWorkflow);

// Approve / Reject
router.route("/:id/approve").patch(approveWorkflow);
router.route("/:id/reject").patch(rejectWorkflow);

export default router;
