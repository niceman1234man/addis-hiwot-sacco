import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
	{
		code: { type: String, required: true, trim: true, uppercase: true, maxlength: 24, unique: true },
		name: { type: String, required: true, trim: true, maxlength: 120 },
		description: { type: String, trim: true, maxlength: 500, default: "" },
		subcategory: { type: String, trim: true, maxlength: 80, default: "" },
		category: { type: String, enum: ["asset", "liability", "equity", "income", "expense"], required: true, index: true },
		accountType: { type: String, enum: ["group", "posting"], default: "posting", required: true, index: true },
		normalBalance: { type: String, enum: ["debit", "credit"], required: true },
		systemKey: { type: String, enum: ["cash", "bank", "mobile_money", "savings", "loan_receivable", "interest_income", "fees_income", "expense"], default: undefined, unique: true, sparse: true },
		parent: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
		allowManualPosting: { type: Boolean, default: true },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		isSystem: { type: Boolean, default: false },
		isActive: { type: Boolean, default: true, index: true },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
	},
	{ timestamps: true, strict: "throw" },
);

accountSchema.index({ parent: 1, code: 1 });
export default mongoose.models.Account || mongoose.model("Account", accountSchema);