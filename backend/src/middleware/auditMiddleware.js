export function auditMiddleware(request, _response, next) {
  request.auditContext = {
    method: request.method,
    path: request.originalUrl,
    startedAt: new Date(),
  };
  return next();
}