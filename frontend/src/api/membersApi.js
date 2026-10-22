import { axiosInstance as api, downloadCsv } from "./axiosInstance.js";

export const createMemberApplication = (application) => api.post("/members", application);
export const getAdminMembers = () => api.get("/members");
export const updateAdminMember = (id, changes) => api.patch(`/members/${encodeURIComponent(id)}`, changes);
export const deleteAdminMember = (id) => api.delete(`/members/${encodeURIComponent(id)}`);
export const getAdminMemberDocument = (id, documentType) => api.blob(`/members/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentType)}`);
export const exportAdminMembersCsv = () => downloadCsv("/members/export.csv", "addis-hiwot-members.csv");
