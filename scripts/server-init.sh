#!/usr/bin/env bash
# Server bootstrap — run ONCE as root on a fresh server.
# Installs Docker, creates admin user, hardens SSH.
# For cleanup/reset of an existing deployment: bash scripts/post-deploy.sh --reset
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/log.sh"

log_banner "Umbra — Server Init"

if [[ "$EUID" -ne 0 ]]; then
  log_error "Must run as root"
  exit 1
fi

ADMIN_USER="${ADMIN_USER:-stone}"

# ── System packages ───────────────────────────────────────────────────────────
log_step "Installing required packages..."

apt-get update -qq
PKGS=()
command -v curl    &>/dev/null || PKGS+=(curl)
command -v openssl &>/dev/null || PKGS+=(openssl)
command -v dig     &>/dev/null || PKGS+=(dnsutils)
command -v python3 &>/dev/null || PKGS+=(python3)
command -v git     &>/dev/null || PKGS+=(git)
dpkg -s apache2-utils &>/dev/null 2>&1 || PKGS+=(apache2-utils)

if [[ ${#PKGS[@]} -gt 0 ]]; then
  apt-get install -y "${PKGS[@]}" -qq
  log_ok "Installed: ${PKGS[*]}"
else
  log_ok "All required packages already present"
fi

# ── Docker ────────────────────────────────────────────────────────────────────
log_step "Checking Docker..."

if ! command -v docker &>/dev/null; then
  log_info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  log_ok "Docker installed: $(docker --version)"
else
  log_ok "Docker: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin -qq
  log_ok "docker compose plugin installed"
else
  log_ok "docker compose v2: $(docker compose version --short)"
fi

# ── Admin user ────────────────────────────────────────────────────────────────
log_step "Setting up admin user: $ADMIN_USER ..."

if id "$ADMIN_USER" &>/dev/null; then
  log_info "User $ADMIN_USER already exists — skipping creation"
else
  useradd -m -s /bin/bash "$ADMIN_USER"
  log_ok "User created: $ADMIN_USER"
fi

usermod -aG sudo   "$ADMIN_USER"
usermod -aG docker "$ADMIN_USER"
log_ok "$ADMIN_USER added to: sudo, docker"

if [[ -f /root/.ssh/authorized_keys ]]; then
  mkdir -p "/home/$ADMIN_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$ADMIN_USER/.ssh/authorized_keys"
  chown -R "$ADMIN_USER:$ADMIN_USER" "/home/$ADMIN_USER/.ssh"
  chmod 700 "/home/$ADMIN_USER/.ssh"
  chmod 600 "/home/$ADMIN_USER/.ssh/authorized_keys"
  log_ok "SSH authorized_keys copied from root → $ADMIN_USER"
else
  log_warn "No /root/.ssh/authorized_keys — add your public key manually to /home/$ADMIN_USER/.ssh/authorized_keys"
fi

# ── Directory ownership ───────────────────────────────────────────────────────
log_step "Setting up /srv/vxture ..."
mkdir -p /srv/vxture/repo
chown -R "$ADMIN_USER:$ADMIN_USER" /srv/vxture
log_ok "/srv/vxture owned by $ADMIN_USER"

# ── Harden SSH ────────────────────────────────────────────────────────────────
log_step "Hardening SSH..."

SSHD_CONF="/etc/ssh/sshd_config"
if grep -q "^PermitRootLogin yes" "$SSHD_CONF" 2>/dev/null; then
  sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' "$SSHD_CONF"
  log_ok "PermitRootLogin → no"
elif ! grep -q "^PermitRootLogin" "$SSHD_CONF" 2>/dev/null; then
  echo "PermitRootLogin no" >> "$SSHD_CONF"
  log_ok "PermitRootLogin no — added"
else
  log_info "SSH: $(grep '^PermitRootLogin' "$SSHD_CONF")"
fi

systemctl reload sshd
log_ok "sshd reloaded"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
log_banner "Server Init Complete"
log_ok "Admin user : $ADMIN_USER  (sudo + docker)"
log_ok "Root SSH   : disabled"
log_ok "Docker     : $(docker --version | cut -d' ' -f3 | tr -d ',')"
log_ok "Data dir   : /srv/vxture (owned by $ADMIN_USER)"
echo ""
log_info "Next steps (SSH in as $ADMIN_USER):"
log_info "  git clone https://github.com/vxture/umbra.git /srv/vxture/repo/umbra"
log_info "  cd /srv/vxture/repo/umbra"
log_info "  cp .env.example .env && nano .env"
log_info "  bash scripts/deploy-all.sh"
log_info "  bash scripts/post-deploy.sh"
