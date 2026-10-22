import { axiosInstance as api } from "./axiosInstance.js";

export const getApiHealth = () => fetch("/api/v1/health").then(async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "The request could not be completed.");
  return body;
});
export const getAdminSession = () => api.get("/auth/session");
export const signInAdmin = (credentials) => api.post("/auth/login", credentials);
export const signOutAdmin = () => api.delete("/auth/logout");
export const changeAdminPassword = (passwords) => api.patch("/auth/password", passwords);
