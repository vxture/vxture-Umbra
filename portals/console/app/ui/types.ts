export interface VxtureUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  permissions: string[];
  provider: string;
}

export interface AccountBinding {
  username: string;
  displayName: string;
  profileName: string;
  subscriptionUrl: string;
  status: string;
  usedTraffic: number;
  dataLimit: number;
  remainingTraffic: number;
  expire: number | null;
  onlineAt: string | null;
  usedText: string;
  dataLimitText: string;
  remainingText: string;
  expireText: string;
  onlineText: string;
}

export interface SessionPayload {
  status: "anonymous" | "active";
  loginUrl?: string;
  ssoUrl?: string;
  user?: VxtureUser;
  canManageInvites?: boolean;
  account?: AccountBinding | null;
}

export interface AdminUserRow {
  username: string;
  status: string;
  usedText: string;
  dataLimitText: string;
  expireText: string;
  onlineText: string;
  bindingState: "bound" | "invite_pending" | "pending_binding";
  displayName: string | null;
  inviteCode: string | null;
  inviteUrl: string | null;
  inviteId: number | null;
  subscriptionUrl: string | null;
}

export interface AdminInvitesPayload {
  status: string;
  users: AdminUserRow[];
  summary: {
    users: number;
    bound: number;
    invitePending: number;
    pendingBinding: number;
  };
}
