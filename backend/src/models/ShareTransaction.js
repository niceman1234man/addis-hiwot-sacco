import mongoose from "mongoose";

const shareTransactionSchema = new mongoose.Schema({
	reference: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
	member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
	transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", required: true, unique: true },
	journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry", required: true },
	amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
	currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
	paymentMethod: { type: String, enum: ["cash", "bank_transfer", "mobile_money"], required: true },
	shareUnits: { type: Number, min: 0, validate: Number.isSafeInteger, default: null },
	sharePriceMinor: { type: Number, min: 1, validate: Number.isSafeInteger, default: null },
	createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, strict: "throw" });

shareTransactionSchema.index({ member: 1, createdAt: -1 });
export default mongoose.models.ShareTransaction || mongoose.model("ShareTransaction", shareTransactionSchema);