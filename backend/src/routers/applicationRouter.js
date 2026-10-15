import { Router } from "express";
import mongoose from "mongoose";
import { createApplication } from "../controllers/applicationController.js";
import { parseMemberUploads } from "../middlewares/memberUploads.js";
import { cloudinaryConfigured } from "../services/memberDocuments.js";

const applicationRouter = Router();

applicationRouter.post("/", (request, response, next) => {
  if (mongoose.connection.readyState !== 1) {
    return response.status(503).json({
      message: "Applications are temporarily unavailable because the database is not connected.",
    });
  }
  if (!cloudinaryConfigured) {
    return response.status(503).json({
      message: "Applications are temporarily unavailable because document storage is not configured.",
    });
  }
  return next();
}, parseMemberUploads, createApplication);

export default applicationRouter;
