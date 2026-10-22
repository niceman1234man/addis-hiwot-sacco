export function errorMiddleware(error, request, response, _next) {
  if (request.path.startsWith("/api/")) {
    const status = Number(error.status) || 500;
    return response.status(status).json({
      message:
        status >= 500
          ? "The request could not be completed."
          : "The request body is invalid.",
    });
  }
  return response.status(500).send("The request could not be completed.");
}