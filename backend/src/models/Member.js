import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      maxlength: 255,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ["raw"],
    },
    deliveryType: {
      type: String,
      required: true,
      enum: ["authenticated"],
    },
    contentType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 10 * 1024 * 1024,
    },
  },
  { _id: false },
);

const addressInformationSchema = new mongoose.Schema(
  {
    currentCityRegion: {
      type: String,
      required: [true, "Current city or region is required."],
      trim: true,
      maxlength: 100,
    },
    subCityZone: {
      type: String,
      required: [true, "Sub city or zone is required."],
      trim: true,
      maxlength: 100,
    },
    woreda: {
      type: String,
      required: [true, "Woreda is required."],
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false },
);

const memberApplicationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
      maxlength: 80,
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    lastName: {
      type: String,
      required: [true, "Last name is required."],
      trim: true,
      maxlength: 80,
    },
    gender: {
      type: String,
      required: [true, "Gender is required."],
      enum: ["female", "male", "other", "prefer_not_to_say"],
    },
    phoneNumber1: {
      type: String,
      required: [true, "Phone number 1 is required."],
      trim: true,
      maxlength: 32,
    },
    phoneNumber2: {
      type: String,
      trim: true,
      maxlength: 32,
      default: "",
    },
    addressInformation: {
      type: addressInformationSchema,
      required: [true, "Address information is required."],
    },
    nationalIdFront: {
      type: attachmentSchema,
      default: undefined,
    },
    nationalIdBack: {
      type: attachmentSchema,
      default: undefined,
    },
    personalPhoto: {
      type: attachmentSchema,
      default: undefined,
    },
    signature: {
      type: attachmentSchema,
      default: undefined,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 32,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
      validate: {
        validator: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Enter a valid email address.",
      },
    },
    memberNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      default: undefined,
    },
    dateOfBirth: { type: Date, default: null },
    nationality: { type: String, trim: true, maxlength: 80, default: "Ethiopian" },
    occupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    membershipStatus: {
      type: String,
      enum: ["applicant", "active", "suspended", "exited", "rejected"],
      default: "applicant",
      index: true,
    },
    memberSince: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    exitedAt: { type: Date, default: null },
    exitReason: { type: String, trim: true, maxlength: 500, default: "" },
    nationalId: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: 240,
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

memberApplicationSchema.pre("validate", function validateNationalIdDocuments() {
  if (!this.nationalIdFront && !this.nationalIdBack) {
    this.invalidate("nationalIdFront", "Upload at least one national ID document.");
  }
});

memberApplicationSchema.pre("validate", function validateMembershipState() {
  if (this.status === "approved" && this.membershipStatus === "applicant") {
    this.membershipStatus = "active";
    this.memberSince ??= this.approvedAt ?? new Date();
  }
  if (this.membershipStatus === "active" && !this.memberSince) {
    this.invalidate("memberSince", "Active members must have a membership start date.");
  }
  if (this.membershipStatus === "exited" && !this.exitedAt) this.exitedAt = new Date();
});

memberApplicationSchema.index({ memberNumber: 1 }, { unique: true, sparse: true });
memberApplicationSchema.index({ status: 1, createdAt: -1 });
memberApplicationSchema.index({ membershipStatus: 1, createdAt: -1 });

const MemberApplication = mongoose.model(
  "Member",
  memberApplicationSchema,
  "memberapplications",
);

export default MemberApplication;
