import mongoose from "mongoose";
import MemberApplication from "../models/MemberApplication.js";
import {
  cloudinaryConfigured,
  deleteMemberDocument,
  storeMemberDocument,
} from "../services/memberDocuments.js";

const maxPhotoSize = 5 * 1024 * 1024;
const mimeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

class InvalidMemberUploadError extends Error {}

function matchesFileType(buffer, contentType) {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (contentType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (contentType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  return false;
}

function validateUploadedFile(file, label) {
  if (!file) return null;
  if (!matchesFileType(file.buffer, file.mimetype)) {
    throw new InvalidMemberUploadError(`${label} must be a valid JPG, PNG, GIF, WebP, or PDF file.`);
  }
  return {
    buffer: file.buffer,
    contentType: file.mimetype,
    extension: mimeExtensions[file.mimetype],
  };
}

function parseSignature(value) {
  if (!value) return null;
  if (typeof value !== "string" || value.length > 1_400_000) {
    throw new InvalidMemberUploadError("The signature image is too large.");
  }
  const match = value.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new InvalidMemberUploadError("The signature could not be read. Please draw it again.");

  const buffer = Buffer.from(match[1], "base64");
  if (
    buffer.byteLength > 1024 * 1024 ||
    buffer.byteLength === 0 ||
    !matchesFileType(buffer, "image/png")
  ) {
    throw new InvalidMemberUploadError("The signature image is invalid or too large.");
  }
  return {
    buffer,
    contentType: "image/png",
    extension: "png",
  };
}

function uploadedFile(request, fieldName) {
  return request.files?.[fieldName]?.[0] ?? null;
}

export async function createApplication(request, response) {
  if (mongoose.connection.readyState !== 1) {
    return response.status(503).json({
      message: "Applications are temporarily unavailable because the database is not connected.",
    });
  }
  if (!cloudinaryConfigured) {
    return response.status(503).json({
      message: "Applications are temporarily unavailable because document storage is not configured.",
    });
  }

  const nationalIdFront = uploadedFile(request, "nationalIdFront");
  const nationalIdBack = uploadedFile(request, "nationalIdBack");
  const personalPhoto = uploadedFile(request, "personalPhoto");

  if (!nationalIdFront && !nationalIdBack) {
    return response.status(400).json({
      message: "Upload at least one national ID document (front or back).",
    });
  }
  if (personalPhoto && personalPhoto.size > maxPhotoSize) {
    return response.status(413).json({
      message: "The personal photo must be 5MB or smaller.",
    });
  }

  const memberId = new mongoose.Types.ObjectId();
  const storedAttachments = [];

  try {
    const filesToStore = {
      nationalIdFront: validateUploadedFile(nationalIdFront, "National ID front"),
      nationalIdBack: validateUploadedFile(nationalIdBack, "National ID back"),
      personalPhoto: validateUploadedFile(personalPhoto, "Personal photo"),
      signature: parseSignature(request.body.signature),
    };

    const attachments = {};
    for (const [documentType, file] of Object.entries(filesToStore)) {
      if (!file) continue;
      const attachment = await storeMemberDocument(file.buffer, {
        memberId,
        documentType,
        contentType: file.contentType,
        extension: file.extension,
      });
      storedAttachments.push(attachment);
      attachments[documentType] = attachment;
    }

    const application = await MemberApplication.create({
      _id: memberId,
      firstName: request.body.firstName,
      middleName: request.body.middleName,
      lastName: request.body.lastName,
      gender: request.body.gender,
      phoneNumber1: request.body.phoneNumber1,
      phoneNumber2: request.body.phoneNumber2,
      email: request.body.email,
      addressInformation: {
        currentCityRegion: request.body.currentCityRegion,
        subCityZone: request.body.subCityZone,
        woreda: request.body.woreda,
      },
      nationalIdFront: attachments.nationalIdFront,
      nationalIdBack: attachments.nationalIdBack,
      personalPhoto: attachments.personalPhoto,
      signature: attachments.signature,
      status: "pending",
    });

    return response.status(201).json({
      message: "Your membership application has been received.",
      applicationId: application.id,
    });
  } catch (error) {
    const cleanupResults = await Promise.allSettled(
      storedAttachments.map(deleteMemberDocument),
    );
    cleanupResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Unable to remove an incomplete member document:", result.reason?.message);
      }
    });
    if (error instanceof InvalidMemberUploadError) {
      return response.status(400).json({ message: error.message });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return response.status(400).json({
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(" "),
      });
    }

    console.error("Unable to save membership application:", error.message);
    return response.status(500).json({
      message: "We could not save your application. Please try again.",
    });
  }
}
