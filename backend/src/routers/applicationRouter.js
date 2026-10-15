import { Router } from "express";
import mongoose from "mongoose";
import { createApplication } from "../controllers/applicationController.js";
import { parseMemberUploads } from "../middlewares/memberUploads.js";

const applicationRouter = Router();

applicationRouter.post("/", (request, response, next) => {
  if (mongoose.connection.readyState !== 1) {
    return response.status(503).json({
      message: "Applications are temporarily unavailable because the database is not connected.",
    });
  }
  return next();
}, parseMemberUploads, createApplication);

export default applicationRouter;
