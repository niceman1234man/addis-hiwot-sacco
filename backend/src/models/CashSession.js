import mongoose from "mongoose";

const cashMovementSchema = new mongoose.Schema({
	transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
	type: { type: String, enum: ["cash_in", "cash_out", "adjustment"], required: true },
	amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
	reference: { type: String, trim: true, maxlength: 40, default: "" },
	note: { type: String, trim: true, maxlength: 250, default: "" },
	recordedAt: { type: Date, default: Date.now },
}, { _id: false });

const cashSessionSchema = new mongoose.Schema(
	{
		sessionNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
		cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		branchCode: { type: String, trim: true, uppercase: true, maxlength: 32, default: "MAIN" },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		status: { type: String, enum: ["open", "closed", "reconciled", "disputed"], default: "open", index: true },
		openedAt: { type: Date, default: Date.now, required: true },
		openingFloatMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
		movements: { type: [cashMovementSchema], default: [] },
		expectedClosingMinor: { type: Number, min: 0, validate: Number.isSafeInteger, default: null },
		countedClosingMinor: { type: Number, min: 0, validate: Number.isSafeInteger, default: null },
		varianceMinor: { type: Number, validate: Number.isSafeInteger, default: null },
		closedAt: { type: Date, default: null },
		closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		reconciledAt: { type: Date, default: null },
		closingNotes: { type: String, trim: true, maxlength: 1000, default: "" },
	},
	{ timestamps: true, strict: "throw" },
);

cashSessionSchema.index({ cashier: 1, status: 1 });
cashSessionSchema.index({ openedAt: -1 });
cashSessionSchema.index(
	{ cashier: 1, branchCode: 1 },
	{ unique: true, partialFilterExpression: { status: "open" } },
);
cashSessionSchema.pre("validate", function validateClose() {
	if (this.status !== "open" && (!this.closedAt || !this.closedBy || this.countedClosingMinor == null)) {
		this.invalidate("closedAt", "Closed cash sessions require a closing user, timestamp, and counted amount.");
	}
	if (this.countedClosingMinor != null && this.expectedClosingMinor != null) {
		this.varianceMinor = this.countedClosingMinor - this.expectedClosingMinor;
	}
});

export default mongoose.models.CashSession || mongoose.model("CashSession", cashSessionSchema);