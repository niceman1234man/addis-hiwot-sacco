import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
	{
		recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
		member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null, index: true },
		channel: { type: String, enum: ["in_app", "email", "sms"], default: "in_app", required: true },
		type: { type: String, required: true, trim: true, maxlength: 80, index: true },
		title: { type: String, required: true, trim: true, maxlength: 160 },
		message: { type: String, required: true, trim: true, maxlength: 2000 },
		status: { type: String, enum: ["queued", "sent", "failed", "read"], default: "queued", index: true },
		data: { type: mongoose.Schema.Types.Mixed, default: {} },
		scheduledAt: { type: Date, default: Date.now },
		sentAt: { type: Date, default: null },
		readAt: { type: Date, default: null },
		failureReason: { type: String, trim: true, maxlength: 500, default: "" },
		expiresAt: { type: Date, default: null },
	},
	{ timestamps: true, strict: "throw" },
);

notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ member: 1, status: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);