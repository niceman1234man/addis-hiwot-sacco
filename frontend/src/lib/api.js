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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(application),
    }),
  );
}
