import { Router } from "express";
import { approveLoan, createLoan, disburseLoan, listLoans } from "../controllers/loanController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.use(authenticate);
routes.get("/", allowRoles("admin", "manager", "accountant"), listLoans);
routes.post("/", allowRoles("admin", "accountant"), createLoan);
routes.patch("/:id/approve", allowRoles("admin", "manager"), approveLoan);
routes.post("/:id/disburse", allowRoles("admin", "accountant"), disburseLoan);
export default routes;