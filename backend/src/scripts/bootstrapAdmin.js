import "dotenv/config";
import { createInterface } from "node:readline/promises";
import mongoose from "mongoose";
import User from "../models/User.js";
import { createAdminInvitation } from "../services/adminInvitations.js";

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Set the MONGODB_URI Replit Secret before bootstrapping an admin.");
  }
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Managed sign-in is not configured for this project.");
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const name = (await readline.question("First admin name: ")).trim();
  const email = (await readline.question("First admin email: ")).trim().toLowerCase();
  readline.close();

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a name and a valid email address.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const existingAdmin = await User.exists({
    role: "admin",
    status: { $in: ["active", "invited"] },
  });
  if (existingAdmin) {
    throw new Error("An admin account already exists. Manage additional accounts in /admin.");
  }

  const user = await User.create({
    name,
    email,
    role: "admin",
    status: "invited",
  });

  try {
    await createAdminInvitation(user);
  } catch (error) {
    await User.deleteOne({ _id: user._id, status: "invited" });
    throw new Error(`The first admin invitation could not be sent: ${error.message}`);
  }

  console.log(`An invitation was sent to ${email}. Accept it to activate the first admin account.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
