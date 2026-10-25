import mongoose from "mongoose";
import MemberApplication from "../models/Member.js";
import AuditLog from "../models/AuditLog.js";
import {
  cloudinaryConfigured,
  deleteMemberDocument,
  storeMemberDocument,
} from "../services/memberDocuments.js";
import {
  getMemberDocumentDownloadUrl,
} from "../services/memberDocuments.js";

const maxPhotoSize = 5 * 1024 * 1024;
const mimeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const memberStatuses = new Set(["pending", "approved", "rejected"]);
const memberGenders = new Set(["female", "male", "other", "prefer_not_to_say"]);
const memberDocumentFields = new Set(["nationalIdFront", "nationalIdBack", "personalPhoto", "signature"]);

class InvalidMemberUploadError extends Error {}

function matchesFileType(buffer, contentType) {
  if (contentType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === "image/gif") return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  if (contentType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (contentType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

function validateUploadedFile(file, label) {
  if (!file) return null;
  if (!matchesFileType(file.buffer, file.mimetype)) {
    throw new InvalidMemberUploadError(`${label} must be a valid JPG, PNG, GIF, WebP, or PDF file.`);
  }
  return { buffer: file.buffer, contentType: file.mimetype, extension: mimeExtensions[file.mimetype] };
}

function parseSignature(value) {
  if (!value) return null;
  if (typeof value !== "string" || value.length > 1_400_000) throw new InvalidMemberUploadError("The signature image is too large.");
  const match = value.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new InvalidMemberUploadError("The signature could not be read. Please draw it again.");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength > 1024 * 1024 || buffer.byteLength === 0 || !matchesFileType(buffer, "image/png")) {
    throw new InvalidMemberUploadError("The signature image is invalid or too large.");
  }
  return { buffer, contentType: "image/png", extension: "png" };
}

function uploadedFile(request, fieldName) {
  return request.files?.[fieldName]?.[0] ?? null;
}

function publicMember(member) {
  return {
    id: String(member._id ?? member.id), firstName: member.firstName, middleName: member.middleName,
    lastName: member.lastName, gender: member.gender, phoneNumber1: member.phoneNumber1,
    phoneNumber2: member.phoneNumber2, email: member.email, addressInformation: member.addressInformation,
    status: member.status, createdAt: member.createdAt, updatedAt: member.updatedAt,
    documents: {
      nationalIdFront: Boolean(member.nationalIdFront), nationalIdBack: Boolean(member.nationalIdBack),
      personalPhoto: Boolean(member.personalPhoto), signature: Boolean(member.signature),
    },
  };
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function createApplication(request, response) {
  if (mongoose.connection.readyState !== 1) return response.status(503).json({ message: "Applications are temporarily unavailable because the database is not connected." });
  if (!cloudinaryConfigured) return response.status(503).json({ message: "Applications are temporarily unavailable because document storage is not configured." });

  const nationalIdFront = uploadedFile(request, "nationalIdFront");
  const nationalIdBack = uploadedFile(request, "nationalIdBack");
  const personalPhoto = uploadedFile(request, "personalPhoto");
  if (!nationalIdFront && !nationalIdBack) return response.status(400).json({ message: "Upload at least one national ID document (front or back)." });
  if (personalPhoto && personalPhoto.size > maxPhotoSize) return response.status(413).json({ message: "The personal photo must be 5MB or smaller." });

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
      const attachment = await storeMemberDocument(file.buffer, { memberId, documentType, contentType: file.contentType, extension: file.extension });
      storedAttachments.push(attachment);
      attachments[documentType] = attachment;
    }
    const application = await MemberApplication.create({
      _id: memberId, firstName: request.body.firstName, middleName: request.body.middleName,
      lastName: request.body.lastName, gender: request.body.gender, phoneNumber1: request.body.phoneNumber1,
      phoneNumber2: request.body.phoneNumber2, email: request.body.email,
      addressInformation: { currentCityRegion: request.body.currentCityRegion, subCityZone: request.body.subCityZone, woreda: request.body.woreda },
      nationalIdFront: attachments.nationalIdFront, nationalIdBack: attachments.nationalIdBack,
      personalPhoto: attachments.personalPhoto, signature: attachments.signature, status: "pending",
    });
    return response.status(201).json({ message: "Your membership application has been received.", applicationId: application.id });
  } catch (error) {
    const cleanupResults = await Promise.allSettled(storedAttachments.map(deleteMemberDocument));
    cleanupResults.forEach((result) => { if (result.status === "rejected") console.error("Unable to remove an incomplete member document:", result.reason?.message); });
    if (error instanceof InvalidMemberUploadError) return response.status(400).json({ message: error.message });
    if (error instanceof mongoose.Error.ValidationError) return response.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(" ") });
    console.error("Unable to save membership application:", error.message);
    return response.status(500).json({ message: "We could not save your application. Please try again." });
  }
}

export async function listMembers(_request, response) {
  try {
    const members = await MemberApplication.find().sort({ createdAt: -1 }).lean();
    return response.json({ members: members.map(publicMember) });
  } catch (error) {
    console.error("Unable to load member applications:", error.message);
    return response.status(500).json({ message: "Member applications could not be loaded. Please try again." });
  }
}

export async function exportMembers(_request, response) {
  try {
    const members = await MemberApplication.find().sort({ createdAt: -1 }).lean();
    const columns = [["First name", "firstName"], ["Middle name", "middleName"], ["Last name", "lastName"], ["Gender", "gender"], ["Primary phone", "phoneNumber1"], ["Secondary phone", "phoneNumber2"], ["Email", "email"], ["City/region", "addressInformation.currentCityRegion"], ["Sub-city/zone", "addressInformation.subCityZone"], ["Woreda", "addressInformation.woreda"], ["Status", "status"], ["Applied", "createdAt"], ["Last updated", "updatedAt"]];
    const rows = [columns.map(([label]) => csvCell(label)).join(","), ...members.map((member) => columns.map(([, field]) => {
      const value = field.split(".").reduce((current, key) => current?.[key], member);
      return csvCell(value instanceof Date ? value.toISOString() : value);
    }).join(","))];
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="addis-hiwot-members-${new Date().toISOString().slice(0, 10)}.csv"`);
    response.setHeader("Cache-Control", "private, no-store");
    return response.send(`\uFEFF${rows.join("\r\n")}\r\n`);
  } catch (error) {
    console.error("Unable to export member applications:", error.message);
    return response.status(500).json({ message: "The member report could not be created. Please try again." });
  }
}

export async function updateMember(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid member ID." });
  const member = await MemberApplication.findById(request.params.id);
  if (!member) return response.status(404).json({ message: "Member not found." });
  const body = request.body ?? {};
  for (const field of ["firstName", "middleName", "lastName", "phoneNumber1", "phoneNumber2", "email"]) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string") return response.status(400).json({ message: `Enter a valid ${field}.` });
    member[field] = body[field].trim();
  }
  if (body.gender !== undefined) {
    if (!memberGenders.has(body.gender)) return response.status(400).json({ message: "Choose a valid gender option." });
    member.gender = body.gender;
  }
  if (body.status !== undefined) {
    if (!memberStatuses.has(body.status)) return response.status(400).json({ message: "Choose pending, approved, or rejected status." });
    const previousStatus = member.status;
    member.status = body.status;
    if (body.status === "approved") {
      member.approvedAt = new Date();
      member.approvedBy = request.adminUser._id;
      member.membershipStatus = "active";
      member.memberSince ??= member.approvedAt;
    } else if (body.status === "rejected") {
      member.approvedAt = null;
      member.approvedBy = null;
      member.membershipStatus = "rejected";
    } else {
      member.approvedAt = null;
      member.approvedBy = null;
      member.membershipStatus = "applicant";
    }
    member.$locals.previousStatus = previousStatus;
  }
  if (body.addressInformation !== undefined) {
    if (!body.addressInformation || typeof body.addressInformation !== "object" || Array.isArray(body.addressInformation)) return response.status(400).json({ message: "Enter valid address information." });
    for (const field of ["currentCityRegion", "subCityZone", "woreda"]) {
      if (body.addressInformation[field] === undefined) continue;
      if (typeof body.addressInformation[field] !== "string") return response.status(400).json({ message: "Enter valid address information." });
      member.addressInformation[field] = body.addressInformation[field].trim();
    }
  }
  try {
    await member.save();
    if (body.status !== undefined) {
      await AuditLog.create({
        actor: request.adminUser._id,
        actorRole: request.adminUser.role,
        action: `member.application.${body.status}`,
        resourceType: "Member",
        resourceId: member._id,
        outcome: "success",
        details: { fromStatus: member.$locals.previousStatus, toStatus: member.status, memberNumber: member.memberNumber || null },
      });
    }
    return response.json({ member: publicMember(member), message: "Member updated." });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return response.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(" ") });
    console.error("Unable to update member:", error.message);
    return response.status(500).json({ message: "The member could not be updated. Please try again." });
  }
}

export async function viewMemberDocument(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid member ID." });
  const { documentType } = request.params;
  if (!memberDocumentFields.has(documentType)) return response.status(404).json({ message: "Member document not found." });
  try {
    const member = await MemberApplication.findById(request.params.id).select(`+${documentType}`);
    if (!member) return response.status(404).json({ message: "Member not found." });
    const attachment = member[documentType];
    if (!attachment) return response.status(404).json({ message: "Member document not found." });
    const downloadUrl = getMemberDocumentDownloadUrl(attachment);
    const cloudinaryResponse = await fetch(downloadUrl, { signal: AbortSignal.timeout(15000) });
    if (!cloudinaryResponse.ok) return response.status(502).json({ message: "The member document could not be retrieved." });
    const documentBuffer = Buffer.from(await cloudinaryResponse.arrayBuffer());
    if (documentBuffer.byteLength !== attachment.size) return response.status(502).json({ message: "The member document could not be verified." });
    response.setHeader("Content-Type", attachment.contentType);
    response.setHeader("Content-Length", documentBuffer.byteLength);
    response.setHeader("Content-Disposition", `inline; filename="member-${member.id}-${documentType}"`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-store");
    return response.send(documentBuffer);
  } catch (error) {
    console.error("Unable to retrieve member document:", error.message);
    return response.status(502).json({ message: "The member document could not be retrieved. Please try again." });
  }
}

export async function deleteMember(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Invalid member ID." });
  const member = await MemberApplication.findById(request.params.id);
  if (!member) return response.status(404).json({ message: "Member not found." });
  const attachments = [member.nationalIdFront, member.nationalIdBack, member.personalPhoto, member.signature].filter(Boolean);
  const results = await Promise.allSettled(attachments.map(deleteMemberDocument));
  if (results.some((result) => result.status === "rejected")) {
    results.forEach((result) => { if (result.status === "rejected") console.error("Unable to delete a member document:", result.reason?.message); });
    return response.status(502).json({ message: "Some member documents could not be deleted. The member record was kept; please retry." });
  }
  try {
    await member.deleteOne();
    return response.json({ message: "Member and associated documents deleted." });
  } catch (error) {
    console.error("Unable to delete member:", error.message);
    return response.status(500).json({ message: "The member could not be deleted. Please try again." });
  }
}