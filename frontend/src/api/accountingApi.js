import { axiosInstance } from "./axiosInstance.js";

export const accountingApi = {
  accounts: (params = "") => axiosInstance.get(`/accounting/accounts${params}`),
  createAccount: (data) => axiosInstance.post("/accounting/accounts", data),
  createExampleChart: () => axiosInstance.post("/accounting/accounts/example-chart", {}),
  configureExampleMappings: () => axiosInstance.post("/accounting/system-mappings/example-chart", {}),
  updateAccount: (id, data) => axiosInstance.patch(`/accounting/accounts/${encodeURIComponent(id)}`, data),
  deleteAccount: (id) => axiosInstance.delete(`/accounting/accounts/${encodeURIComponent(id)}`),
    systemAccountMappings: () => axiosInstance.get("/accounting/system-mappings"),
    updateSystemAccountMapping: (key, accountId) => axiosInstance.put(`/accounting/system-mappings/${encodeURIComponent(key)}`, { accountId }),
  removeSystemAccountMapping: (key) => axiosInstance.delete(`/accounting/system-mappings/${encodeURIComponent(key)}`),
  createJournal: (data) => axiosInstance.post("/accounting/journals", data),
  journals: (params = "") => axiosInstance.get(`/accounting/journals${params}`),
  expenses: (params = "") => axiosInstance.get(`/accounting/expenses${params}`),
  createExpense: (data) => axiosInstance.post("/accounting/expenses", data),
  decideExpense: (id, data) => axiosInstance.post(`/accounting/expenses/${encodeURIComponent(id)}/decision`, data),
  payExpense: (id) => axiosInstance.post(`/accounting/expenses/${encodeURIComponent(id)}/pay`, {}),
};
