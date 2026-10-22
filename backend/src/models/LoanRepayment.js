import mongoose from "mongoose";

const loanRepaymentSchema = new mongoose.Schema(
	{
		reference: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
		loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true, index: true },
		member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
		transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
		principalPaidMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
		interestPaidMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
		penaltyPaidMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
		paymentMethod: { type: String, enum: ["cash", "bank_transfer", "mobile_money", "deduction", "other"], required: true },
		receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		paidAt: { type: Date, default: Date.now, required: true },
		notes: { type: String, trim: true, maxlength: 500, default: "" },
		reversedAt: { type: Date, default: null },
		reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		reversalReason: { type: String, trim: true, maxlength: 500, default: "" },
	},
	{ timestamps: true, strict: "throw" },
);

loanRepaymentSchema.pre("validate", function validateAllocation() {
	if (this.amountMinor !== this.principalPaidMinor + this.interestPaidMinor + this.penaltyPaidMinor) {
		this.invalidate("amountMinor", "Repayment amount must equal principal, interest, and penalty allocations.");
	}
});

export default mongoose.models.LoanRepayment || mongoose.model("LoanRepayment", loanRepaymentSchema);