const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (response.status === 204) return undefined;

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text();
  if (!response.ok) {
    const error = new Error(body?.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return body;
}

function jsonOptions(method, data) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const axiosInstance = {
  get: (path) => request(path),
  post: (path, data, options = {}) => request(path, {
    ...(data instanceof FormData ? { method: "POST", body: data } : jsonOptions("POST", data)),
    ...options,
  }),
  patch: (path, data) => request(path, jsonOptions("PATCH", data)),
  delete: (path) => request(path, { method: "DELETE" }),
  blob: async (path) => {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.message || "The request could not be completed.");
      error.status = response.status;
      throw error;
    }
    return response.blob();
  },
};

export async function downloadCsv(path, filename) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  const url = URL.createObjectURL(await response.blob());
  const download = document.createElement("a");
  download.href = url;
  download.download = filename;
  document.body.appendChild(download);
  download.click();
  download.remove();
  URL.revokeObjectURL(url);
}