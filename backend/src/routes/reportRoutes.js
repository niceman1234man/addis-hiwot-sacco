import { Router } from "express";
import { financialReport } from "../controllers/reportController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.get("/financial", authenticate, allowRoles("admin", "manager", "accountant"), financialReport);
export default routes;