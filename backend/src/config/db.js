import mongoose from "mongoose";

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    console.warn(
      "MONGODB_URI is not configured. The API will start, but database-backed features cannot be used.",
    );
    return false;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB.");
  return true;
}
