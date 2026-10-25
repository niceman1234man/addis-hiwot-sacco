import { Router } from "express";
import { financialReport, ledgerReport } from "../controllers/reportController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.get("/financial", authenticate, allowRoles("admin", "manager", "accountant"), financialReport);
routes.get("/ledger", authenticate, allowRoles("admin", "manager", "accountant"), ledgerReport);
export default routes;