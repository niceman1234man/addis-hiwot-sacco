import { Router } from "express";
import { createRepayment } from "../controllers/repaymentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.post("/", authenticate, allowRoles("admin", "accountant", "cashier"), createRepayment);
export default routes;