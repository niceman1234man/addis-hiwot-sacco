import { cloneElement, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Loader from "../components/common/Loader.jsx";
import { getAdminSession } from "../api/authApi.js";

export default function RoleRoutes({ roles, children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then(({ user: sessionUser }) => {
        if (active) {
          setUser(sessionUser);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("unauthenticated");
      });
    return () => { active = false; };
  }, []);

  if (status === "loading") return <Loader label="Checking your staff access…" />;
  if (status === "unauthenticated") return <Navigate to="/sign-in" replace />;
  if (!roles.includes(user?.role)) return <Navigate to="/admin" replace />;
  return cloneElement(children, { user });
}