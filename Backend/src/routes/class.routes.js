import { Router } from "express";
import { createClass, getAllClasses, getClassById, updateClass, deleteClass } from "../controllers/class.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createClass).get(getAllClasses);
router.route("/:id").get(getClassById).patch(updateClass).delete(deleteClass);

export default router;
