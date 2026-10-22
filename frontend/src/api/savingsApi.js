import { axiosInstance } from "./axiosInstance.js";

export const savingsApi = {
  create: (data) => axiosInstance.post("/savings", data),
  deposit: (data) => axiosInstance.post("/savings/deposit", data),
  withdraw: (data) => axiosInstance.post("/savings/withdraw", data),
  list: (params = "") => axiosInstance.get(`/savings${params}`),
};