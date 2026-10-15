async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "The request could not be completed.");
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

export async function getAdminUsers() {
  return readResponse(await fetch("/api/admin/users"));
}

export async function inviteAdminUser(user) {
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
