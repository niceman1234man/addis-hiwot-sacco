import { axiosInstance as api, downloadCsv } from "./axiosInstance.js";

export const getAdminUsers = () => api.get("/users");
export const createAdminUser = (user) => api.post("/users", user);
export const updateAdminUser = (id, changes) => api.patch(`/users/${encodeURIComponent(id)}`, changes);
export const archiveAdminUser = (id) => api.delete(`/users/${encodeURIComponent(id)}`);
export const restoreAdminUser = (id) => api.post(`/users/${encodeURIComponent(id)}/restore`);
export const exportAdminUsersCsv = () => downloadCsv("/users/export.csv", "addis-hiwot-staff.csv");
