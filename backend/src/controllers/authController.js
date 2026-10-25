import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import {
  clearAdminSessionCookie,
  endAdminSession,
  startAdminSession,
} from "../services/adminSessions.js";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "../services/passwords.js";
import { sendPasswordResetEmail } from "../services/passwordResetEmail.js";
import { runFinancialTransaction } from "../services/financialTransactions.js";
import { createPasswordResetToken, hashPasswordResetToken } from "../services/passwordResetTokens.js";

export async function signInAdmin(request, response) {
  const email =
    typeof request.body?.email === "string"
      ? request.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof request.body?.password === "string" ? request.body.password : "";
  if (!email || password.length > MAX_PASSWORD_LENGTH) {
    clearAdminSessionCookie(response);
    return response.status(401).json({ message: "Email or password is incorrect." });
  }

  try {
    const user = await User.findOne({ email }).select("+passwordHash +passwordSalt");
    const passwordMatches = await verifyPassword(password, user);
    if (!user || !passwordMatches || user.status !== "active") {
      clearAdminSessionCookie(response);
      return response.status(401).json({ message: "Email or password is incorrect." });
    }

    await startAdminSession(user, response);
    return response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Unable to sign in to the staff portal:", error.message);
    return response.status(503).json({
      message: "Sign-in is temporarily unavailable. Please try again.",
    });
  }
}

export async function signOutAdmin(request, response) {
  try {
    await endAdminSession(request.adminUser, response);
    return response.status(204).end();
  } catch (error) {
    console.error("Unable to sign out of the staff portal:", error.message);
    return response.status(500).json({ message: "Sign-out could not be completed." });
  }
}

export async function changeAdminPassword(request, response) {
  const currentPassword =
    typeof request.body?.currentPassword === "string"
      ? request.body.currentPassword
      : "";
  const newPassword =
    typeof request.body?.newPassword === "string" ? request.body.newPassword : "";
  if (
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > MAX_PASSWORD_LENGTH
  ) {
    return response.status(400).json({
      message: `Choose a password between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    });
  }
  if (!(await verifyPassword(currentPassword, request.adminUser))) {
    return response.status(400).json({ message: "The current password is incorrect." });
  }

  try {
    const credentials = await hashPassword(newPassword);
    request.adminUser.passwordHash = credentials.passwordHash;
    request.adminUser.passwordSalt = credentials.passwordSalt;
    await startAdminSession(request.adminUser, response);
    return response.json({ message: "Password updated." });
  } catch (error) {
    console.error("Unable to update a staff password:", error.message);
    return response.status(500).json({
      message: "The password could not be updated. Please try again.",
    });
  }
}

const genericResetMessage = "If an active staff account matches that email, a password reset link will be sent shortly.";

export async function requestPasswordReset(request, response) {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.json({ message: genericResetMessage });
  }
  try {
    const user = await User.findOne({ email, status: "active" });
    if (user) {
      const reset = createPasswordResetToken();
      user.passwordResetTokenHash = reset.tokenHash;
      user.passwordResetExpiresAt = reset.expiresAt;
      await user.save();
      try {
        await sendPasswordResetEmail({ email: user.email, name: user.name, token: reset.token });
      } catch (emailError) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();
        console.error("Unable to send a password reset email:", emailError.message);
      }
    }
    return response.json({ message: genericResetMessage });
  } catch (error) {
    console.error("Unable to process a password reset request:", error.message);
    return response.json({ message: genericResetMessage });
  }
}

export async function resetAdminPassword(request, response) {
  const token = typeof request.body?.token === "string" ? request.body.token : "";
  const newPassword = typeof request.body?.newPassword === "string" ? request.body.newPassword : "";
  if (!/^[\da-f]{64}$/i.test(token)) return response.status(400).json({ message: "This password reset link is invalid or has expired." });
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    return response.status(400).json({ message: `Choose a password between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
  }
  try {
    const tokenHash = hashPasswordResetToken(token);
    const credentials = await hashPassword(newPassword);
    const user = await runFinancialTransaction(async (session) => {
      const resetUser = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() }, status: "active" })
        .select("+passwordResetTokenHash +passwordResetExpiresAt +passwordHash +passwordSalt +sessionTokenHash +sessionExpiresAt")
        .session(session);
      if (!resetUser) return null;
      resetUser.passwordHash = credentials.passwordHash;
      resetUser.passwordSalt = credentials.passwordSalt;
      resetUser.passwordResetTokenHash = null;
      resetUser.passwordResetExpiresAt = null;
      resetUser.sessionTokenHash = null;
      resetUser.sessionExpiresAt = null;
      await resetUser.save({ session });
      await AuditLog.create([{
        actor: resetUser._id,
        actorRole: resetUser.role,
        action: "auth.password.reset",
        resourceType: "User",
        resourceId: resetUser._id,
        outcome: "success",
        details: { method: "email_token" },
      }], { session });
      return resetUser;
    });
    if (!user) return response.status(400).json({ message: "This password reset link is invalid or has expired." });
    clearAdminSessionCookie(response);
    return response.json({ message: "Password reset successfully. Sign in with your new password." });
  } catch (error) {
    console.error("Unable to reset staff password:", error.message);
    return response.status(500).json({ message: "The password could not be reset. Please request a new link." });
  }
}
