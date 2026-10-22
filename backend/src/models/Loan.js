import mongoose from "mongoose";

const guarantorSchema = new mongoose.Schema({
	member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
	relationship: { type: String, trim: true, maxlength: 80, default: "" },
	guaranteedMinor: { type: Number, min: 0, validate: Number.isSafeInteger, required: true },
	status: { type: String, enum: ["pending", "accepted", "declined", "released"], default: "pending" },
}, { _id: false });

const installmentSchema = new mongoose.Schema({
	dueAt: { type: Date, required: true },
	principalDueMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
	interestDueMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
	principalPaidMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
	interestPaidMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
	status: { type: String, enum: ["upcoming", "due", "partial", "paid", "overdue"], default: "upcoming" },
}, { _id: false });

const loanSchema = new mongoose.Schema(
	{
		loanNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 32, unique: true },
		member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
		savingsAccount: { type: mongoose.Schema.Types.ObjectId, ref: "SavingsAccount", default: null },
		productName: { type: String, required: true, trim: true, maxlength: 100 },
		purpose: { type: String, required: true, trim: true, maxlength: 1000 },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		principalMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
		interestRateBps: { type: Number, required: true, min: 0, max: 10000, validate: Number.isSafeInteger },
		termMonths: { type: Number, required: true, min: 1, max: 600, validate: Number.isSafeInteger },
		repaymentFrequency: { type: String, enum: ["weekly", "biweekly", "monthly"], default: "monthly" },
		outstandingPrincipalMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
		outstandingInterestMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
		status: { type: String, enum: ["draft", "submitted", "under_review", "approved", "rejected", "disbursed", "active", "paid_off", "defaulted", "cancelled"], default: "draft", index: true },
		guarantors: { type: [guarantorSchema], default: [] },
		repaymentSchedule: { type: [installmentSchema], default: [] },
		submittedAt: { type: Date, default: null },
		approvedAt: { type: Date, default: null },
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		rejectionReason: { type: String, trim: true, maxlength: 1000, default: "" },
		disbursedAt: { type: Date, default: null },
		disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		firstDueAt: { type: Date, default: null },
		maturityAt: { type: Date, default: null },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
	},
	{ timestamps: true, strict: "throw" },
);

loanSchema.pre("validate", function validateOutstanding() {
	if (this.outstandingPrincipalMinor > this.principalMinor) {
		this.invalidate("outstandingPrincipalMinor", "Outstanding principal cannot exceed original principal.");
	}
	if (this.status === "approved" && (!this.approvedAt || !this.approvedBy)) {
		this.invalidate("approvedAt", "Approved loans require an approver and approval date.");
	}
});
loanSchema.index({ member: 1, status: 1 });
loanSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Loan || mongoose.model("Loan", loanSchema);