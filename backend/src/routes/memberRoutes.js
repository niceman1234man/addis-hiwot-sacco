import { Router } from "express";
import mongoose from "mongoose";
import {
  createApplication,
  deleteMember,
  exportMembers,
  listMembers,
  updateMember,
  viewMemberDocument,
} from "../controllers/memberController.js";
import { parseMemberUploads } from "../middleware/memberUploads.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { cloudinaryConfigured } from "../services/memberDocuments.js";

const memberRoutes = Router();

memberRoutes.post("/", (request, response, next) => {
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

memberRoutes.use(authenticate, allowRoles("admin"));
memberRoutes.get("/export.csv", exportMembers);
memberRoutes.get("/", listMembers);
memberRoutes.get("/:id/documents/:documentType", viewMemberDocument);
memberRoutes.patch("/:id", updateMember);
memberRoutes.delete("/:id", deleteMember);

export default memberRoutes;
