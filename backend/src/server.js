import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import applicationRouter from "./routers/applicationRouter.js";
import adminRouter from "./routers/adminRouter.js";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware.js";
import { clerkAuthConfigured } from "./services/clerkClient.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendDist = fileURLToPath(new URL("../../dist/", import.meta.url));

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
if (clerkAuthConfigured) {
  app.use(
    clerkMiddleware((request) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(request) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
} else {
  console.warn("Clerk is not configured. Staff/admin endpoints will remain unavailable.");
}
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_request, response) => {
  const databaseState = mongoose.connection.readyState;
  response.json({
    status: "ok",
    database:
      databaseState === 1
        ? "connected"
        : process.env.MONGODB_URI
          ? "disconnected"
          : "not_configured",
  });
});

app.use("/api/applications", applicationRouter);
app.use("/api/admin", adminRouter);
app.use(express.static(frontendDist));
app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) {
    return response.status(404).json({ message: "API route not found." });
  }
  if (request.method === "GET" && !request.path.startsWith("/api/")) {
    return response.sendFile(path.join(frontendDist, "index.html"), (error) => {
      if (error) next();
    });
  }
  return next();
});
app.use((error, request, response, _next) => {
  if (request.path.startsWith("/api/")) {
    const status = Number(error.status) || 500;
    return response.status(status).json({
      message:
        status >= 500
          ? "The request could not be completed."
          : "The request body is invalid.",
    });
  }
  return response.status(500).send("The request could not be completed.");
});

async function start() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB.");
  } else {
    console.warn(
      "MONGODB_URI is not configured. The API will start, but database-backed features cannot be used.",
    );
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`SACCO API listening on port ${port}.`);
  });
}

start().catch((error) => {
  console.error("Could not start the SACCO API:", error.message);
  process.exit(1);
});
