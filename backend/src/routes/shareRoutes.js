import { Router } from "express";
import { listShareTransactions, purchaseShares } from "../controllers/shareController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.use(authenticate, allowRoles("admin", "accountant", "cashier"));
routes.get("/", listShareTransactions);
routes.post("/purchase", purchaseShares);
export default routes;