export default class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = statusCode;
    if (details !== undefined) this.details = details;
  }
}