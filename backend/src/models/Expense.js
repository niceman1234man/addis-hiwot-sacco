import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
	{
		expenseNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
		category: { type: String, required: true, trim: true, maxlength: 80, index: true },
		description: { type: String, required: true, trim: true, maxlength: 1000 },
		amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		incurredAt: { type: Date, required: true, index: true },
		vendorName: { type: String, trim: true, maxlength: 160, default: "" },
		vendorReference: { type: String, trim: true, maxlength: 100, default: "" },
		paymentMethod: { type: String, enum: ["cash", "bank_transfer", "mobile_money", "other"], required: true },
		status: { type: String, enum: ["draft", "submitted", "approved", "rejected", "paid", "void"], default: "draft", index: true },
		receiptDocument: { type: String, trim: true, maxlength: 500, default: "" },
		requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		approvedAt: { type: Date, default: null },
		paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		paidAt: { type: Date, default: null },
		account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
		journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry", default: null },
		notes: { type: String, trim: true, maxlength: 1000, default: "" },
	},
	{ timestamps: true, strict: "throw" },
);

expenseSchema.pre("validate", function validateApproval() {
	if (this.status === "approved" && (!this.approvedBy || !this.approvedAt)) this.invalidate("approvedAt", "Approved expenses require an approver and timestamp.");
	if (this.status === "paid" && (!this.paidBy || !this.paidAt)) this.invalidate("paidAt", "Paid expenses require a payer and timestamp.");
});

export default mongoose.models.Expense || mongoose.model("Expense", expenseSchema);