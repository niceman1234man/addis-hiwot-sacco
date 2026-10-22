import { Router } from "express";
import {
  archiveAdminUser,
  createAdminUser,
  exportAdminUsers,
  listAdminUsers,
  restoreAdminUser,
  updateAdminUser,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const userRoutes = Router();
userRoutes.use(authenticate, allowRoles("admin"));
userRoutes.get("/export.csv", exportAdminUsers);
userRoutes.get("/", listAdminUsers);
userRoutes.post("/", createAdminUser);
userRoutes.patch("/:id", updateAdminUser);
userRoutes.delete("/:id", archiveAdminUser);
userRoutes.post("/:id/restore", restoreAdminUser);

export default userRoutes;
