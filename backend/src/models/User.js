import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      maxlength: 254,
      unique: true,
    },
    passwordHash: { type: String, select: false },
    passwordSalt: { type: String, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    sessionTokenHash: { type: String, default: null, select: false },
    sessionExpiresAt: { type: Date, default: null, select: false },
    role: {
      type: String,
      enum: ["admin", "manager", "accountant", "cashier", "staff"],
      default: "cashier",
      required: true,
    },
    status: {
      type: String,
      enum: ["invited", "active", "archived"],
      default: "active",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    archivedAt: { type: Date, default: null },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

const User = mongoose.model("User", userSchema);

export default User;
