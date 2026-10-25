import mongoose from "mongoose";

const systemAccountMappingSchema = new mongoose.Schema({
	key: {
		type: String,
		enum: ["cash", "bank", "mobile_money", "savings", "loan_receivable", "interest_income", "fees_income", "loan_impairment", "expense"],
		required: true,
		unique: true,
	},
	account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
	updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, strict: "throw" });

systemAccountMappingSchema.index({ account: 1 }, { unique: true });
export default mongoose.models.SystemAccountMapping || mongoose.model("SystemAccountMapping", systemAccountMappingSchema);