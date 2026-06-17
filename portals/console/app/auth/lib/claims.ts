/**
 * Map verified OIDC token payloads onto the stored session shapes. Identity
 * claims come primarily from the access_token (richer tenant context, standard
 * section 7); sid/auth come from the id_token.
 */
import type { JWTPayload } from "jose";
import type { IdentityClaims, TokenBundle } from "./session-store";
import type { TokenSet } from "./oidc";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown): boolean {
  return v === true;
}

export function toIdentityClaims(idClaims: JWTPayload, accessClaims: JWTPayload): IdentityClaims {
  const sid = str(idClaims.sid) || str(accessClaims.sid);
  return {
    sub: str(accessClaims.sub) || str(idClaims.sub),
    sid,
    email: str(accessClaims.email),
    email_verified: bool(accessClaims.email_verified),
    phone: str(accessClaims.phone),
    account_status: str(accessClaims.account_status),
    active_tenant: str(accessClaims.active_tenant),
    active_tenant_type: str(accessClaims.active_tenant_type),
    active_tenant_role: str(accessClaims.active_tenant_role),
    active_tenant_status: str(accessClaims.active_tenant_status),
    exp: typeof accessClaims.exp === "number" ? accessClaims.exp : 0,
  };
}

export function toTokenBundle(tokens: TokenSet, idClaims: JWTPayload): TokenBundle {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_exp: nowSec + (Number.isFinite(tokens.expires_in) ? tokens.expires_in : 900),
    id_claims: idClaims as Record<string, unknown>,
  };
}
