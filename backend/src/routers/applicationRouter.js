import { Router } from "express";
import { createApplication } from "../controllers/applicationController.js";

const applicationRouter = Router();

applicationRouter.post("/", createApplication);

export default applicationRouter;
