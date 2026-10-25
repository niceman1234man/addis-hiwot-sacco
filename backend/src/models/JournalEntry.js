import mongoose from "mongoose";

const journalLineSchema = new mongoose.Schema({
	account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
	description: { type: String, trim: true, maxlength: 250, default: "" },
	debitMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
	creditMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
	member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
	loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", default: null },
}, { _id: false });

const journalEntrySchema = new mongoose.Schema(
	{
		entryNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
		date: { type: Date, required: true, index: true },
		description: { type: String, required: true, trim: true, maxlength: 500 },
		currency: { type: String, default: "ETB", uppercase: true, minlength: 3, maxlength: 3, required: true },
		lines: { type: [journalLineSchema], required: true, validate: [(lines) => lines.length >= 2, "A journal entry requires at least two lines."] },
		status: { type: String, enum: ["draft", "posted", "reversed"], default: "draft", index: true },
		sourceType: { type: String, enum: ["manual", "transaction", "repayment", "expense", "share_purchase", "adjustment"], default: "manual" },
		sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		postedAt: { type: Date, default: null },
		reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry", default: null },
		reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
		reversedAt: { type: Date, default: null },
	},
	{ timestamps: true, strict: "throw" },
);

journalEntrySchema.pre("validate", function validateJournal() {
	let debit = 0;
	let credit = 0;
	for (const line of this.lines) {
		if (line.debitMinor > 0 && line.creditMinor > 0) this.invalidate("lines", "A journal line cannot be both debit and credit.");
		if (line.debitMinor === 0 && line.creditMinor === 0) this.invalidate("lines", "Each journal line must contain a debit or credit.");
		debit += line.debitMinor;
		credit += line.creditMinor;
	}
	if (this.status === "posted" && (debit === 0 || debit !== credit)) this.invalidate("lines", "Posted journal entries must balance and be greater than zero.");
	if (this.status === "posted" && (!this.postedBy || !this.postedAt)) this.invalidate("postedAt", "Posted entries require a posting user and timestamp.");
});
journalEntrySchema.index({ date: -1, status: 1 });
export default mongoose.models.JournalEntry || mongoose.model("JournalEntry", journalEntrySchema);