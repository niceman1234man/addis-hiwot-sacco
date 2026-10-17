import mongoose from "mongoose";
import User from "../models/User.js";
import {
  clearAdminSessionCookie,
  getAdminSessionToken,
  hashSessionToken,
} from "../services/adminSessions.js";

export async function requireAdminAccount(request, response, next) {
  response.setHeader("Cache-Control", "no-store");
  if (mongoose.connection.readyState !== 1) {
    return response.status(503).json({
      message: "Admin access is unavailable until MongoDB is connected.",
    });
  }

  const token = getAdminSessionToken(request);
  if (!token) {
    clearAdminSessionCookie(response);
    return response.status(401).json({ message: "Sign in to continue." });
  }

  try {
    const user = await User.findOne({
      sessionTokenHash: hashSessionToken(token),
      sessionExpiresAt: { $gt: new Date() },
      status: "active",
    }).select("+passwordHash +passwordSalt +sessionTokenHash +sessionExpiresAt");
    if (!user) {
      clearAdminSessionCookie(response);
      return response.status(401).json({ message: "Sign in to continue." });
    }
    request.adminUser = user;
    return next();
  } catch (error) {
    console.error("Unable to verify an admin account:", error.message);
    return response.status(503).json({
      message: "The admin account could not be verified. Please try again.",
    });
  }
}

export function requireAdminRole(request, response, next) {
  if (request.adminUser?.role !== "admin") {
    return response.status(403).json({
      message: "Only an administrator can access this resource.",
    });
  }
  return next();
}
