/**
 * Default account avatar: an inline silhouette shown whenever the session has no
 * `picture` (no custom or third-party-imported avatar) - the common case. The
 * platform deliberately does not serve a default avatar (its /avatar endpoint
 * 404s without a custom image), so each app carries its own. It must be inline
 * (not <img src=...>) so the silhouette inherits the host page's `currentColor`
 * and can be themed by login state. See vxture docs/design/identity-avatar.md.
 */
export function DefaultAvatar() {
  return (
    <svg
      className="vx-default-avatar"
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M819.2 729.088V757.76c0 33.792-27.648 61.44-61.44 61.44H266.24c-33.792 0-61.44-27.648-61.44-61.44v-28.672c0-74.752 87.04-119.808 168.96-155.648 3.072-1.024 5.12-2.048 8.192-4.096 6.144-3.072 13.312-3.072 19.456 1.024C434.176 591.872 472.064 604.16 512 604.16c39.936 0 77.824-12.288 110.592-32.768 6.144-4.096 13.312-4.096 19.456-1.024 3.072 1.024 5.12 2.048 8.192 4.096 81.92 34.816 168.96 79.872 168.96 154.624z" />
      <path d="M359.424 373.76a168.96 152.576 90 1 0 305.152 0 168.96 152.576 90 1 0-305.152 0Z" />
    </svg>
  );
}
