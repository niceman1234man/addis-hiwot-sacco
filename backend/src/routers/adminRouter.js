import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  changeAdminPassword,
  signInAdmin,
  signOutAdmin,
} from "../controllers/authController.js";
import {
  archiveAdminUser,
  deleteMember,
  exportAdminUsers,
  exportMembers,
  getAdminSession,
  createAdminUser,
  listMembers,
  listAdminUsers,
  restoreAdminUser,
  viewMemberDocument,
  updateMember,
  updateAdminUser,
} from "../controllers/adminController.js";
import {
  requireAdminAccount,
  requireAdminRole,
} from "../middlewares/requireAdmin.js";

const adminRouter = Router();

adminRouter.post(
  "/session",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  signInAdmin,
);
adminRouter.get("/session", requireAdminAccount, getAdminSession);
adminRouter.delete("/session", requireAdminAccount, signOutAdmin);
adminRouter.patch("/password", requireAdminAccount, changeAdminPassword);
adminRouter.use("/users", requireAdminAccount, requireAdminRole);
adminRouter.get("/users/export.csv", exportAdminUsers);
adminRouter.get("/users", listAdminUsers);
adminRouter.post("/users", createAdminUser);
adminRouter.patch("/users/:id", updateAdminUser);
adminRouter.delete("/users/:id", archiveAdminUser);
adminRouter.post("/users/:id/restore", restoreAdminUser);
adminRouter.use("/members", requireAdminAccount, requireAdminRole);
adminRouter.get("/members/export.csv", exportMembers);
adminRouter.get("/members", listMembers);
adminRouter.get("/members/:id/documents/:documentType", viewMemberDocument);
adminRouter.patch("/members/:id", updateMember);
adminRouter.delete("/members/:id", deleteMember);

export default adminRouter;
