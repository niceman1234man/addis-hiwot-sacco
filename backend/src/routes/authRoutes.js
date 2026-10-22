import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  changeAdminPassword,
  signInAdmin,
  signOutAdmin,
} from "../controllers/authController.js";
import { getAdminSession } from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const authRoutes = Router();

authRoutes.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  signInAdmin,
);
authRoutes.get("/session", authenticate, getAdminSession);
authRoutes.delete("/logout", authenticate, signOutAdmin);
authRoutes.patch("/password", authenticate, changeAdminPassword);

export default authRoutes;
