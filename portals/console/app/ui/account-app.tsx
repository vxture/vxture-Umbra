"use client";

import { AccountGate } from "./account-gate";
import { AppCenter } from "./network-access";

export function AccountApp({ initialInvite }: { initialInvite?: string }) {
  return (
    <AccountGate initialInvite={initialInvite}>
      {(session, setSession) => (
        <AppCenter session={session} setSession={setSession} initialInvite={initialInvite} />
      )}
    </AccountGate>
  );
}
