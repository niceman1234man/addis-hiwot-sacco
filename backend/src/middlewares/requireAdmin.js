import mongoose from "mongoose";
import { getAuth } from "@clerk/express";
import User from "../models/User.js";
import { clerkAuthConfigured, clerkClient } from "../services/clerkClient.js";

function unavailable(response) {
  return response.status(503).json({
    message: "Admin access is unavailable until MongoDB is connected.",
  });
}

async function resolveUser(request) {
  const { userId } = getAuth(request);
  if (!userId) return { status: 401, message: "Sign in to continue." };

  let user = await User.findOne({ clerkUserId: userId });
  if (user?.status === "archived") {
    return { status: 403, message: "This admin account has been archived." };
  }
  if (user?.status === "active") return { user };

  const identity = await clerkClient.users.getUser(userId);
  const adminUserId = identity.publicMetadata?.adminUserId;
  if (typeof adminUserId !== "string") {
    return {
      status: 403,
      message: "This sign-in is not connected to an Addis Hiwot admin account.",
    };
  }

  user = await User.findById(adminUserId);
  if (!user || user.status === "archived") {
    return { status: 403, message: "This admin account is not active." };
  }
  if (user.status !== "invited") {
    return { status: 403, message: "This invitation is no longer active." };
  }

  const primaryEmail = identity.emailAddresses.find(
    (email) => email.id === identity.primaryEmailAddressId,
  );
  if (
    !primaryEmail ||
    primaryEmail.verification?.status !== "verified" ||
    primaryEmail.emailAddress.trim().toLowerCase() !== user.email
  ) {
    return {
      status: 403,
      message: "Verify the invited email address before accessing the admin area.",
    };
  }

  user.clerkUserId = userId;
  user.status = "active";
  user.invitationId = null;
  try {
    await user.save();
  } catch (error) {
    if (error.code !== 11000) throw error;
    user = await User.findOne({ clerkUserId: userId, status: "active" });
    if (!user) throw error;
  }
  return { user };
}

export async function requireAdminAccount(request, response, next) {
  if (!clerkAuthConfigured) {
    return response.status(503).json({
      message: "Admin access is unavailable until Clerk is configured.",
    });
  }
  if (mongoose.connection.readyState !== 1) return unavailable(response);

  try {
    const result = await resolveUser(request);
    if (!result.user) {
      return response.status(result.status).json({ message: result.message });
    }
    request.adminUser = result.user;
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
      message: "Only an administrator can manage staff accounts.",
    });
  }
  return next();
}
