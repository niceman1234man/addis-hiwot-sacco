import { Router } from "express";
import { createTransaction, listTransactions } from "../controllers/transactionController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.use(authenticate, allowRoles("admin", "manager", "accountant", "cashier"));
routes.get("/", listTransactions);
routes.post("/", createTransaction);
export default routes;