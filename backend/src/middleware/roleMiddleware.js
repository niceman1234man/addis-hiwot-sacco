export function allowRoles(...allowedRoles) {
  return function roleMiddleware(request, response, next) {
    if (!request.adminUser || !allowedRoles.includes(request.adminUser.role)) {
      return response.status(403).json({ message: "You do not have permission to access this resource." });
    }
    return next();
  };
}
