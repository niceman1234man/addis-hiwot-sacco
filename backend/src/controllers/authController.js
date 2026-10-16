import User from "../models/User.js";
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
