import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./authRoutes.js";
import accountingRoutes from "./accountingRoutes.js";
import cashierRoutes from "./cashierRoutes.js";
import loanRoutes from "./loanRoutes.js";
import memberRoutes from "./memberRoutes.js";
import repaymentRoutes from "./repaymentRoutes.js";
import reportRoutes from "./reportRoutes.js";
import savingsRoutes from "./savingsRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import userRoutes from "./userRoutes.js";

const routes = Router();
routes.use("/auth", authRoutes);
routes.use("/users", userRoutes);
routes.use("/members", memberRoutes);
routes.use("/savings", savingsRoutes);
routes.use("/loans", loanRoutes);
routes.use("/repayments", repaymentRoutes);
routes.use("/transactions", transactionRoutes);
routes.use("/accounting", accountingRoutes);
routes.use("/cashier", cashierRoutes);
routes.use("/reports", reportRoutes);
routes.get("/health", (_request, response) => {
	const databaseState = mongoose.connection.readyState;
	response.json({
		status: "ok",
		database:
			databaseState === 1
				? "connected"
				: process.env.MONGODB_URI
					? "disconnected"
					: "not_configured",
	});
});

export default routes;
