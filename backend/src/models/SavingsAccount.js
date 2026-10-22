import mongoose from "mongoose";

const savingsAccountSchema = new mongoose.Schema(
	{
		accountNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 32, unique: true },
		member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
		productName: { type: String, required: true, trim: true, maxlength: 100 },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		balanceMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
		availableBalanceMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
		status: { type: String, enum: ["pending", "active", "frozen", "closed"], default: "pending", index: true },
		openedAt: { type: Date, default: null },
		openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		closedAt: { type: Date, default: null },
		closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
	},
	{ timestamps: true, strict: "throw" },
);

savingsAccountSchema.pre("validate", function validateBalance() {
	if (this.availableBalanceMinor > this.balanceMinor) {
		this.invalidate("availableBalanceMinor", "Available balance cannot exceed the ledger balance.");
	}
	if (this.status === "closed" && !this.closedAt) this.closedAt = new Date();
});
savingsAccountSchema.index({ member: 1, status: 1 });
savingsAccountSchema.index({ member: 1, productName: 1 }, { unique: true });

export default mongoose.models.SavingsAccount || mongoose.model("SavingsAccount", savingsAccountSchema);