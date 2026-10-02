import { Router } from "express";
import {
    createParent,
    getAllParents,
    getParentById,
    updateParent,
    deleteParent,
    linkStudentToParent,
    getStudentsOfParent,
    getMyParentProfile,   
} from "../controllers/parent.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/me").get(getMyParentProfile);    
router.route("/").post(createParent).get(getAllParents);
router.route("/link-student").post(linkStudentToParent);
router.route("/:id").get(getParentById).patch(updateParent).delete(deleteParent);
router.route("/:id/students").get(getStudentsOfParent);

export default router;
