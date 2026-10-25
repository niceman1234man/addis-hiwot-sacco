import { axiosInstance } from "./axiosInstance.js";

export const savingsApi = {
  create: (data) => axiosInstance.post("/savings", data),
  eligibleMembers: () => axiosInstance.get("/savings/eligible-members"),
  deposit: (data) => axiosInstance.post("/savings/deposit", data),
  withdraw: (data) => axiosInstance.post("/savings/withdraw", data),
  list: (params = "") => axiosInstance.get(`/savings${params}`),
};