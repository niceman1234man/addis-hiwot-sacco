import mongoose from "mongoose";
import User from "../models/User.js";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../services/passwords.js";

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roles = new Set(["admin", "manager", "accountant", "cashier", "staff"]);

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    archivedAt: user.archivedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function handleWriteError(error, response) {
  if (error.code === 11000) {
    response.status(409).json({ message: "An account with this email already exists." });
    return true;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(" ") });
    return true;
  }
  console.error("User account operation failed:", error.message);
  response.status(500).json({ message: "The account could not be saved. Please try again." });
  return true;
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function getAdminSession(request, response) {
  return response.json({ user: publicUser(request.adminUser) });
}

export async function listAdminUsers(_request, response) {
  const users = await User.find().sort({ createdAt: -1, name: 1 });
  return response.json({ users: users.map(publicUser) });
}

export async function exportAdminUsers(_request, response) {
  try {
    const users = await User.find().sort({ createdAt: -1, name: 1 }).lean();
    const columns = [["Name", "name"], ["Email", "email"], ["Role", "role"], ["Status", "status"], ["Created", "createdAt"], ["Updated", "updatedAt"]];
    const rows = [columns.map(([label]) => csvCell(label)).join(","), ...users.map((user) => columns.map(([, field]) => {
      const value = user[field];
      return csvCell(value instanceof Date ? value.toISOString() : value);
    }).join(","))];
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="addis-hiwot-staff-${new Date().toISOString().slice(0, 10)}.csv"`);
    response.setHeader("Cache-Control", "private, no-store");
    return response.send(`\uFEFF${rows.join("\r\n")}\r\n`);
  } catch (error) {
    console.error("Unable to export staff accounts:", error.message);
    return response.status(500).json({ message: "The account report could not be created. Please try again." });
  }
}

export async function createAdminUser(request, response) {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const role = request.body?.role;
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!name || name.length > 120) return response.status(400).json({ message: "Enter a name between 1 and 120 characters." });
  if (!validEmail.test(email) || email.length > 254) return response.status(400).json({ message: "Enter a valid email address." });
  if (!roles.has(role)) return response.status(400).json({ message: "Choose an admin, manager, accountant, or cashier role." });
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return response.status(400).json({ message: `Choose a password between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
  }
  if (role === "admin" && request.adminUser.role !== "admin") return response.status(403).json({ message: "Only an administrator can register another administrator." });

  try {
    const credentials = await hashPassword(password);
    const user = await User.create({ name, email, role, status: "active", ...credentials, createdBy: request.adminUser._id });
    return response.status(201).json({ user: publicUser(user), message: "Account created. The account holder can sign in and change their password." });
  } catch (error) {
    return handleWriteError(error, response);
  }
}

export async function updateAdminUser(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid account ID." });
  const user = await User.findById(request.params.id);
  if (!user) return response.status(404).json({ message: "Account not found." });
  if (user.status === "archived") return response.status(409).json({ message: "Restore this account before editing it." });

  const { name, role } = request.body ?? {};
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return response.status(400).json({ message: "Enter a name between 1 and 120 characters." });
    user.name = name.trim();
  }
  if (role !== undefined) {
    if (!roles.has(role)) return response.status(400).json({ message: "Choose an admin, manager, accountant, or cashier role." });
    if (request.adminUser.id === user.id && role !== "admin") return response.status(400).json({ message: "You cannot change your own administrator role." });
    if (user.role === "admin" && role !== "admin" && user.status === "active") {
      const adminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (adminCount <= 1) return response.status(409).json({ message: "The last active administrator cannot be assigned a non-admin role." });
    }
    user.role = role;
  }

  try {
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        return response.status(400).json({ message: `Choose a password between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
      }
      const credentials = await hashPassword(password);
      user.passwordHash = credentials.passwordHash;
      user.passwordSalt = credentials.passwordSalt;
      if (user.status === "invited") user.status = "active";
      user.sessionTokenHash = null;
      user.sessionExpiresAt = null;
    }
    await user.save();
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return handleWriteError(error, response);
  }
}

export async function archiveAdminUser(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid account ID." });
  const user = await User.findById(request.params.id);
  if (!user) return response.status(404).json({ message: "Account not found." });
  if (request.adminUser.id === user.id) return response.status(400).json({ message: "You cannot archive your own account." });
  if (user.status === "active" && user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin", status: "active" });
    if (adminCount <= 1) return response.status(409).json({ message: "The last active administrator cannot be archived." });
  }
  user.status = "archived";
  user.archivedAt ??= new Date();
  user.archivedBy = request.adminUser._id;
  user.sessionTokenHash = null;
  user.sessionExpiresAt = null;
  try {
    await user.save();
    return response.json({ user: publicUser(user), message: "Account archived. It can be restored later." });
  } catch (error) {
    return handleWriteError(error, response);
  }
}

export async function restoreAdminUser(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid account ID." });
  const user = await User.findById(request.params.id).select("+passwordHash");
  if (!user) return response.status(404).json({ message: "Account not found." });
  if (user.status !== "archived") return response.status(409).json({ message: "Only archived accounts can be restored." });
  try {
    user.status = "active";
    user.sessionTokenHash = null;
    user.sessionExpiresAt = null;
    user.archivedAt = null;
    user.archivedBy = null;
    await user.save();
    return response.json({ user: publicUser(user), message: user.passwordHash ? "Account restored." : "Account restored. Set a password before the user signs in." });
  } catch (error) {
    return handleWriteError(error, response);
  }
}
