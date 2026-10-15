import mongoose from "mongoose";
import MemberApplication from "../models/MemberApplication.js";

export async function createApplication(request, response) {
  if (mongoose.connection.readyState !== 1) {
    return response.status(503).json({
      message: "Applications are temporarily unavailable because the database is not connected.",
    });
  }

  try {
    const application = await MemberApplication.create({
      fullName: request.body.fullName,
      phone: request.body.phone,
      email: request.body.email,
      nationalId: request.body.nationalId,
      address: request.body.address,
      occupation: request.body.occupation,
    });

    return response.status(201).json({
      message: "Your membership application has been received.",
      applicationId: application.id,
    });
  } catch (error) {
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
