import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
	{
		reference: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
		idempotencyKey: { type: String, trim: true, maxlength: 128, default: undefined },
		type: { type: String, enum: ["deposit", "withdrawal", "loan_disbursement", "loan_repayment", "fee", "interest", "expense", "adjustment", "reversal"], required: true, index: true },
		status: { type: String, enum: ["pending", "posted", "failed", "reversed"], default: "pending", index: true },
		member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null, index: true },
		savingsAccount: { type: mongoose.Schema.Types.ObjectId, ref: "SavingsAccount", default: null },
		cashSession: { type: mongoose.Schema.Types.ObjectId, ref: "CashSession", default: null },
		loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", default: null },
		repayment: { type: mongoose.Schema.Types.ObjectId, ref: "LoanRepayment", default: null },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
		direction: { type: String, enum: ["credit", "debit"], required: true },
		paymentMethod: { type: String, enum: ["cash", "bank_transfer", "mobile_money", "deduction", "journal", "other"], required: true },
		description: { type: String, trim: true, maxlength: 500, default: "" },
		createdAt: { type: Date, default: Date.now, immutable: true, index: true },
		relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		approvedAt: { type: Date, default: null },
		postedAt: { type: Date, default: null },
		reversedAt: { type: Date, default: null },
		receiptNumber: { type: String, trim: true, uppercase: true, maxlength: 40, default: null },
		metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
	},
	{ timestamps: true, strict: "throw" },
);

transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
transactionSchema.index({ member: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.pre("validate", function validatePostedTransaction() {
	if (this.status === "posted" && !this.postedAt) this.postedAt = new Date();
	if (this.status === "posted" && !this.receiptNumber) this.receiptNumber = this.reference;
	if (this.status === "reversed" && !this.relatedTransaction) {
		this.invalidate("relatedTransaction", "A reversal must reference the original transaction.");
	}
});

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);