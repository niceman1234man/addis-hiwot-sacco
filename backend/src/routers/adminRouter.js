import { Router } from "express";
import {
  archiveAdminUser,
  getAdminSession,
  inviteAdminUser,
  listAdminUsers,
  restoreAdminUser,
  updateAdminUser,
} from "../controllers/adminController.js";
import {
  requireAdminAccount,
  requireAdminRole,
} from "../middlewares/requireAdmin.js";

const adminRouter = Router();

adminRouter.get("/session", requireAdminAccount, getAdminSession);
adminRouter.use("/users", requireAdminAccount, requireAdminRole);
adminRouter.get("/users", listAdminUsers);
adminRouter.post("/users", inviteAdminUser);
adminRouter.patch("/users/:id", updateAdminUser);
adminRouter.delete("/users/:id", archiveAdminUser);
adminRouter.post("/users/:id/restore", restoreAdminUser);

export default adminRouter;
