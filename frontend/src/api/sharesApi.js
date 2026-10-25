import { axiosInstance } from "./axiosInstance.js";

export const sharesApi = {
  purchase: (data) => axiosInstance.post("/shares/purchase", data),
  list: (params = "") => axiosInstance.get(`/shares${params}`),
};
