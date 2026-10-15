import { clerkClient } from "./clerkClient.js";

export async function createAdminInvitation(user) {
  return clerkClient.invitations.createInvitation({
    emailAddress: user.email,
    redirectUrl: "/sign-up",
    expiresInDays: 7,
    publicMetadata: { adminUserId: user.id },
  });
}

export async function revokeAdminInvitation(invitationId) {
  if (!invitationId) return;
  await clerkClient.invitations.revokeInvitation({ invitationId });
}
