export interface AdminUserRow {
  username: string;
  status: string;
  usedText: string;
  dataLimitText: string;
  expireText: string;
  onlineText: string;
  onlineAt: string | null;
  bindingState: "bound" | "invite_pending" | "pending_binding";
  displayName: string | null;
  inviteCode: string | null;
  inviteUrl: string | null;
  inviteId: number | null;
  subscriptionUrl: string | null;
}

export interface AdminInvitesPayload {
  status: "ok" | "admin_login_required" | "marzban_unavailable" | "forbidden";
  users: AdminUserRow[];
  summary: {
    users: number;
    bound: number;
    invitePending: number;
    pendingBinding: number;
  };
}
