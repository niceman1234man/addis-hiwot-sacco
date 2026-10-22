import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { cloudinaryConfigured } from "./services/memberDocuments.js";

const app = express();
const frontendDist = fileURLToPath(new URL("../../dist/", import.meta.url));

app.disable("x-powered-by");
app.set("trust proxy", 1);
if (!cloudinaryConfigured) {
  console.warn("Cloudinary is not configured. Membership document uploads will remain unavailable.");
}
app.use(express.json({ limit: "32kb" }));

app.use("/api/v1", routes);

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
app.use(errorMiddleware);

export default app;
