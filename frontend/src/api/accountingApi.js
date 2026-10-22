import { axiosInstance } from "./axiosInstance.js";

export const accountingApi = {
  accounts: (params = "") => axiosInstance.get(`/accounting/accounts${params}`),
  createAccount: (data) => axiosInstance.post("/accounting/accounts", data),
  createJournal: (data) => axiosInstance.post("/accounting/journals", data),
  expenses: (params = "") => axiosInstance.get(`/accounting/expenses${params}`),
  createExpense: (data) => axiosInstance.post("/accounting/expenses", data),
  decideExpense: (id, data) => axiosInstance.post(`/accounting/expenses/${encodeURIComponent(id)}/decision`, data),
  payExpense: (id) => axiosInstance.post(`/accounting/expenses/${encodeURIComponent(id)}/pay`, {}),
};
