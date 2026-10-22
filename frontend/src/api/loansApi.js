import { axiosInstance } from "./axiosInstance.js";

export const loansApi = {
  create: (data) => axiosInstance.post("/loans", data),
  approve: (id, data = {}) => axiosInstance.patch(`/loans/${encodeURIComponent(id)}/approve`, data),
  disburse: (id, data) => axiosInstance.post(`/loans/${encodeURIComponent(id)}/disburse`, data),
  list: (params = "") => axiosInstance.get(`/loans${params}`),
};