async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function getApiHealth() {
  return readResponse(await fetch("/api/health"));
}

export async function createMemberApplication(application) {
  return readResponse(
    await fetch("/api/applications", {
      method: "POST",
      body: application,
    }),
  );
}

export async function getAdminSession() {
  return readResponse(await fetch("/api/admin/session"));
}

export async function signInAdmin(credentials) {
  return readResponse(
    await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    }),
  );
}

export async function signOutAdmin() {
  const response = await fetch("/api/admin/session", { method: "DELETE" });
  if (response.status === 204) return;
  await readResponse(response);
}

export async function changeAdminPassword(passwords) {
  return readResponse(
    await fetch("/api/admin/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwords),
    }),
  );
}

export async function getAdminUsers() {
  return readResponse(await fetch("/api/admin/users"));
}

export async function exportAdminUsersCsv() {
  const response = await fetch("/api/admin/users/export.csv");
  if (!response.ok) await readResponse(response);

  const csv = await response.blob();
  const url = URL.createObjectURL(csv);
  const download = document.createElement("a");
  download.href = url;
  download.download = "addis-hiwot-staff.csv";
  document.body.appendChild(download);
  download.click();
  download.remove();
  URL.revokeObjectURL(url);
}

export async function createAdminUser(user) {
  return readResponse(
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    }),
  );
}

export async function updateAdminUser(id, changes) {
  return readResponse(
    await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }),
  );
}

export async function archiveAdminUser(id) {
  return readResponse(
    await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  );
}

export async function restoreAdminUser(id) {
  return readResponse(
    await fetch(`/api/admin/users/${encodeURIComponent(id)}/restore`, {
      method: "POST",
    }),
  );
}

export async function getAdminMembers() {
  return readResponse(await fetch("/api/admin/members"));
}

export async function updateAdminMember(id, changes) {
  return readResponse(
    await fetch(`/api/admin/members/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }),
  );
}

export async function deleteAdminMember(id) {
  return readResponse(
    await fetch(`/api/admin/members/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  );
}

export async function getAdminMemberDocument(id, documentType) {
  const response = await fetch(
    `/api/admin/members/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentType)}`,
  );
  if (!response.ok) await readResponse(response);
  return response.blob();
}

export async function exportAdminMembersCsv() {
  const response = await fetch("/api/admin/members/export.csv");
  if (!response.ok) await readResponse(response);

  const csv = await response.blob();
  const url = URL.createObjectURL(csv);
  const download = document.createElement("a");
  download.href = url;
  download.download = "addis-hiwot-members.csv";
  document.body.appendChild(download);
  download.click();
  download.remove();
  URL.revokeObjectURL(url);
}
