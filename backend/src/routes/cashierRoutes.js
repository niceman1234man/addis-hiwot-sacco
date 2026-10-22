import { Router } from "express";
import { closeCashSession, getCurrentCashSession, openCashSession } from "../controllers/cashierController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.use(authenticate, allowRoles("admin", "cashier"));
routes.get("/sessions/current", getCurrentCashSession);
routes.post("/sessions/open", openCashSession);
routes.post("/sessions/close", closeCashSession);
export default routes;