import "dotenv/config";
import { createClerkClient } from "@clerk/backend";

export const clerkAuthConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY,
);

export const clerkClient = clerkAuthConfigured
  ? createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    })
  : null;
