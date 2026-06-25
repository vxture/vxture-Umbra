/**
 * Shared session-user helpers used across portals so the discriminators stay
 * in one place.
 */

/**
 * Whether a session user represents an organization (team) account rather than
 * a personal one. `orgId` is the primary signal; `userType === "organization"`
 * is a legacy/fallback discriminator. Kept here so the website and console
 * account menus agree.
 */
export function isOrganizationUser(user: { userType?: string; orgId?: string }): boolean {
  return user.userType === "organization" || Boolean(user.orgId);
}
