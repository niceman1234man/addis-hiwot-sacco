import { Router } from "express";
import { createAccount, createExpense, createJournal, decideExpense, listAccounts, listExpenses, listJournals, listSystemAccountMappings, payExpense, updateAccount, updateSystemAccountMapping } from "../controllers/accountingController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const routes = Router();
routes.use(authenticate);
routes.get("/accounts", allowRoles("admin", "accountant"), listAccounts);
routes.post("/accounts", allowRoles("admin"), createAccount);
routes.patch("/accounts/:id", allowRoles("admin"), updateAccount);
routes.get("/system-mappings", allowRoles("admin"), listSystemAccountMappings);
routes.put("/system-mappings/:key", allowRoles("admin"), updateSystemAccountMapping);
routes.post("/journals", allowRoles("admin", "accountant"), createJournal);
routes.get("/journals", allowRoles("admin", "accountant"), listJournals);
routes.get("/expenses", allowRoles("admin", "accountant", "manager", "cashier"), listExpenses);
routes.post("/expenses", allowRoles("admin", "accountant"), createExpense);
routes.post("/expenses/:id/pay", allowRoles("admin", "accountant", "cashier"), payExpense);
routes.post("/expenses/:id/decision", allowRoles("admin", "manager"), decideExpense);
export default routes;