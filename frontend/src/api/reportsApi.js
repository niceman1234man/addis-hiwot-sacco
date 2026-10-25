import { axiosInstance } from "./axiosInstance.js";

export const reportsApi = {
  financial: (params = "") => axiosInstance.get(`/reports/financial${params}`),
  ledger: (params = "") => axiosInstance.get(`/reports/ledger${params}`),
};