import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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

memberApplicationSchema.pre("validate", function validateNationalIdDocuments() {
  if (!this.nationalIdFront && !this.nationalIdBack) {
    this.invalidate("nationalIdFront", "Upload at least one national ID document.");
  }
});

const MemberApplication = mongoose.model(
  "MemberApplication",
  memberApplicationSchema,
);

export default MemberApplication;
