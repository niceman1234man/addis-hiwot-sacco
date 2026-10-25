import { axiosInstance } from "./axiosInstance.js";

export const accountingApi = {
  accounts: (params = "") => axiosInstance.get(`/accounting/accounts${params}`),
  createAccount: (data) => axiosInstance.post("/accounting/accounts", data),
  updateAccount: (id, data) => axiosInstance.patch(`/accounting/accounts/${encodeURIComponent(id)}`, data),
    systemAccountMappings: () => axiosInstance.get("/accounting/system-mappings"),
    updateSystemAccountMapping: (key, accountId) => axiosInstance.put(`/accounting/system-mappings/${encodeURIComponent(key)}`, { accountId }),
  createJournal: (data) => axiosInstance.post("/accounting/journals", data),
  journals: (params = "") => axiosInstance.get(`/accounting/journals${params}`),
  expenses: (params = "") => axiosInstance.get(`/accounting/expenses${params}`),
  createExpense: (data) => axiosInstance.post("/accounting/expenses", data),
  decideExpense: (id, data) => axiosInstance.post(`/accounting/expenses/${encodeURIComponent(id)}/decision`, data),
  payExpense: (id) => axiosInstance.post(`/accounting/expenses/${encodeURIComponent(id)}/pay`, {}),
};
