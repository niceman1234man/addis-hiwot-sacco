import mongoose from "mongoose";

const memberApplicationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      maxlength: 32,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    nationalId: {
      type: String,
      required: [true, "National ID is required."],
      trim: true,
      maxlength: 80,
    },
    address: {
      type: String,
      required: [true, "Address is required."],
      trim: true,
      maxlength: 240,
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const MemberApplication = mongoose.model(
  "MemberApplication",
  memberApplicationSchema,
);

export default MemberApplication;
