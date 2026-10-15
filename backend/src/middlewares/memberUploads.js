import multer from "multer";

const megabyte = 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 3,
    fileSize: 10 * megabyte,
    fields: 16,
    fieldNameSize: 100,
    fieldSize: 1400 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Use a JPG, PNG, GIF, WebP, or PDF file."));
    }
    return callback(null, true);
  },
}).fields([
  { name: "nationalIdFront", maxCount: 1 },
  { name: "nationalIdBack", maxCount: 1 },
  { name: "personalPhoto", maxCount: 1 },
]);

export function parseMemberUploads(request, response, next) {
  upload(request, response, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({
        message: "Each national ID file must be 10MB or smaller. Personal photos must be 5MB or smaller.",
      });
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE") {
      return response.status(400).json({
        message: "Each document field can contain only one file.",
      });
    }
    return response.status(400).json({
      message: error.message || "The uploaded files could not be read.",
    });
  });
}
