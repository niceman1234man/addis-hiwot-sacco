import { Router } from "express";
import { createSavingsAccount, deposit, listEligibleMembers, listSavings, withdraw } from "../controllers/savingsController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.use(authenticate, allowRoles("admin", "accountant", "cashier"));
routes.get("/eligible-members", listEligibleMembers);
routes.get("/", listSavings);
routes.post("/", createSavingsAccount);
routes.post("/deposit", deposit);
routes.post("/withdraw", withdraw);
export default routes;