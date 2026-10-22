import { axiosInstance } from "./axiosInstance.js";

export const transactionsApi = {
  list: (params = "") => axiosInstance.get(`/transactions${params}`),
  create: (data) => axiosInstance.post("/transactions", data),
};