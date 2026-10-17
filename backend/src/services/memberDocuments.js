import { v2 as cloudinary } from "cloudinary";

export const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function ensureConfigured() {
  if (!cloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
}

export function storeMemberDocument(
  buffer,
  { memberId, documentType, contentType, extension },
) {
  ensureConfigured();
  const publicId = `${memberId}-${documentType}.${extension}`;
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "authenticated",
        folder: "addis-hiwot-sacco/member-applications",
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({
          cloudinaryPublicId: result.public_id,
          resourceType: result.resource_type,
          deliveryType: result.type,
          contentType,
          size: result.bytes ?? buffer.byteLength,
        });
      },
    );
    upload.once("error", reject);
    upload.end(buffer);
  });
}

export async function deleteMemberDocument(attachment) {
  if (!attachment?.cloudinaryPublicId) return;
  ensureConfigured();
  const result = await cloudinary.uploader.destroy(attachment.cloudinaryPublicId, {
    resource_type: attachment.resourceType ?? "raw",
    type: attachment.deliveryType ?? "authenticated",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary deletion failed: ${result.result}`);
  }
}

export function getMemberDocumentDownloadUrl(attachment) {
  ensureConfigured();
  if (!attachment?.cloudinaryPublicId) {
    throw new Error("Member document is not available.");
  }
  const format = attachment.contentType === "application/pdf"
    ? "pdf"
    : attachment.contentType.split("/")[1];
  return cloudinary.utils.private_download_url(
    attachment.cloudinaryPublicId,
    format,
    {
      resource_type: attachment.resourceType ?? "raw",
      type: attachment.deliveryType ?? "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 60,
    },
  );
}
