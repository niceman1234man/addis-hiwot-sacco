import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ user, allowedRoles, loading = false, children }) {
  if (loading) return <p role="status">Checking access…</p>;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/admin" replace />;
  return children ?? <Outlet />;
}