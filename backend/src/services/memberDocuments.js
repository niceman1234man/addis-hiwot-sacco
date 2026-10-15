import mongoose from "mongoose";

const bucketName = "member_private_documents";

function getBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error("The member document database is not connected.");
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });
}

export function storeMemberDocument(buffer, { memberId, documentType, contentType, extension }) {
  const bucket = getBucket();
  const upload = bucket.openUploadStream(`${memberId}-${documentType}.${extension}`, {
    contentType,
    metadata: {
      memberApplicationId: memberId.toString(),
      documentType,
    },
  });

  return new Promise((resolve, reject) => {
    upload.once("error", async (error) => {
      try {
        await upload.abort();
      } catch {
        // The upload may already have been aborted by the driver.
      }
      reject(error);
    });
    upload.once("finish", () => {
      resolve({
        fileId: upload.id,
        contentType,
        size: buffer.byteLength,
      });
    });
    upload.end(buffer);
  });
}

export async function deleteMemberDocument(fileId) {
  if (!fileId) return;
  const bucket = getBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
}
