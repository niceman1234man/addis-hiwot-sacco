import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
	{
		actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
		actorRole: { type: String, enum: ["admin", "manager", "accountant", "cashier", "staff", "system"], default: "system" },
		action: { type: String, required: true, trim: true, maxlength: 120, index: true },
		resourceType: { type: String, required: true, trim: true, maxlength: 80, index: true },
		resourceId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
		outcome: { type: String, enum: ["success", "failure", "denied"], required: true },
		requestId: { type: String, trim: true, maxlength: 100, default: "" },
		ipAddress: { type: String, trim: true, maxlength: 64, default: "" },
		userAgent: { type: String, trim: true, maxlength: 500, default: "" },
		changes: { type: mongoose.Schema.Types.Mixed, default: null },
		details: { type: mongoose.Schema.Types.Mixed, default: {} },
		occurredAt: { type: Date, default: Date.now, required: true, immutable: true },
	},
	{ timestamps: { createdAt: true, updatedAt: false }, strict: "throw", versionKey: false },
);

auditLogSchema.index({ resourceType: 1, resourceId: 1, occurredAt: -1 });
auditLogSchema.pre("findOneAndUpdate", function preventAuditMutation() {
	throw new Error("Audit log entries are append-only.");
});
auditLogSchema.pre("updateOne", function preventAuditUpdate() {
	throw new Error("Audit log entries are append-only.");
});
auditLogSchema.pre("deleteOne", function preventAuditDelete() {
	throw new Error("Audit log entries are append-only.");
});
auditLogSchema.pre("deleteMany", function preventAuditDeleteMany() {
	throw new Error("Audit log entries are append-only.");
});

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);