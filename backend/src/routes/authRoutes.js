import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  changeAdminPassword,
  requestPasswordReset,
  resetAdminPassword,
  signInAdmin,
  signOutAdmin,
} from "../controllers/authController.js";
import { getAdminSession } from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const authRoutes = Router();

const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many password recovery attempts. Please try again later." },
});

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
authRoutes.post("/password/forgot", passwordResetRateLimit, requestPasswordReset);
authRoutes.post("/password/reset", passwordResetRateLimit, resetAdminPassword);

export default authRoutes;
