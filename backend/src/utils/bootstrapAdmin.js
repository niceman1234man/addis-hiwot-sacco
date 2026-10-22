import "dotenv/config";
import { createInterface } from "node:readline/promises";
import mongoose from "mongoose";
import User from "../models/User.js";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../services/passwords.js";

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal to enter the password.");
  }

  return new Promise((resolve, reject) => {
    let password = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function finish(error) {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Password entry cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (password) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        password += character;
        process.stdout.write("*");
      }
    }

    process.stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Set the MONGODB_URI environment variable before bootstrapping an admin.");
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const name = (await readline.question("First admin name: ")).trim();
  const email = (await readline.question("First admin email: ")).trim().toLowerCase();
  readline.close();
  const password = await readHidden("Password (minimum 12 characters): ");
  const passwordConfirmation = await readHidden("Confirm password: ");

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a name and a valid email address.");
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    password !== passwordConfirmation
  ) {
    throw new Error(
      `Passwords must match and contain between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email }).select("+passwordHash +passwordSalt");
  const existingAdmin = await User.exists({ role: "admin", status: "active" });
  if (existingAdmin && !(user?.role === "admin" && user.status === "active")) {
    throw new Error("An active admin account already exists. Manage accounts in /admin.");
  }

  const credentials = await hashPassword(password);
  if (user) {
    user.name = name;
    user.role = "admin";
    user.status = "active";
    user.archivedAt = null;
    user.archivedBy = null;
    user.sessionTokenHash = null;
    user.sessionExpiresAt = null;
    user.passwordHash = credentials.passwordHash;
    user.passwordSalt = credentials.passwordSalt;
  } else {
    await User.create({
      name,
      email,
      role: "admin",
      status: "active",
      ...credentials,
    });
  }
  if (user) await user.save();

  console.log(`Admin account ready for ${email}. Sign in at /sign-in.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
