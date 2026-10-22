export function validateRequest(validator) {
  return function requestValidationMiddleware(request, response, next) {
    const result = validator(request.body);
    if (!result || result.valid !== false) return next();
    return response.status(400).json({
      message: result.message || "The request is invalid.",
      ...(result.errors ? { errors: result.errors } : {}),
    });
  };
}