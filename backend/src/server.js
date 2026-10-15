import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import applicationRouter from "./routers/applicationRouter.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendDist = fileURLToPath(new URL("../../dist/", import.meta.url));

app.disable("x-powered-by");
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
app.use(express.static(frontendDist));
app.use((request, response, next) => {
  if (request.method === "GET" && !request.path.startsWith("/api/")) {
    return response.sendFile(path.join(frontendDist, "index.html"), (error) => {
      if (error) next();
    });
  }
  return next();
});

async function start() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB.");
  } else {
    console.warn(
      "MONGODB_URI is not configured. The API will start, but applications cannot be saved.",
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
