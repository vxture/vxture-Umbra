#!/usr/bin/env bash
# Server bootstrap — run as root on a fresh (or existing) server.
# Installs Docker, creates admin user, hardens SSH.
# Safe to re-run: each step checks state before acting.
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
log_step "Checking required packages..."

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
  log_ok "Docker already installed: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  log_info "Installing docker compose plugin..."
  apt-get install -y docker-compose-plugin -qq
  log_ok "docker compose plugin installed"
else
  log_ok "docker compose v2: $(docker compose version --short)"
fi

# ── Admin user ────────────────────────────────────────────────────────────────
log_step "Setting up admin user: $ADMIN_USER ..."

if id "$ADMIN_USER" &>/dev/null; then
  log_ok "User $ADMIN_USER already exists"
else
  useradd -m -s /bin/bash "$ADMIN_USER"
  log_ok "User created: $ADMIN_USER"
fi

# Add to groups (idempotent: usermod -aG is a no-op if already in group)
if id -nG "$ADMIN_USER" | grep -qw sudo; then
  log_ok "$ADMIN_USER already in group: sudo"
else
  usermod -aG sudo "$ADMIN_USER"
  log_ok "$ADMIN_USER added to group: sudo"
fi

if id -nG "$ADMIN_USER" | grep -qw docker; then
  log_ok "$ADMIN_USER already in group: docker"
else
  usermod -aG docker "$ADMIN_USER"
  log_ok "$ADMIN_USER added to group: docker"
fi

# ── SSH authorized_keys ───────────────────────────────────────────────────────
SSH_DIR="/home/$ADMIN_USER/.ssh"
AUTH_KEYS="$SSH_DIR/authorized_keys"

if [[ -f "$AUTH_KEYS" ]]; then
  log_ok "SSH authorized_keys already present for $ADMIN_USER"
elif [[ -f /root/.ssh/authorized_keys ]]; then
  mkdir -p "$SSH_DIR"
  cp /root/.ssh/authorized_keys "$AUTH_KEYS"
  chown -R "$ADMIN_USER:$ADMIN_USER" "$SSH_DIR"
  chmod 700 "$SSH_DIR"
  chmod 600 "$AUTH_KEYS"
  log_ok "SSH authorized_keys copied from root → $ADMIN_USER"
else
  log_warn "No /root/.ssh/authorized_keys found"
  log_warn "Add your public key manually: /home/$ADMIN_USER/.ssh/authorized_keys"
fi

# ── Directory ownership ───────────────────────────────────────────────────────
log_step "Setting up /srv/vxture ..."

if [[ -d /srv/vxture ]]; then
  log_ok "/srv/vxture already exists"
else
  mkdir -p /srv/vxture/repo
  log_ok "Created /srv/vxture"
fi

# Always ensure correct ownership (safe to repeat)
chown -R "$ADMIN_USER:$ADMIN_USER" /srv/vxture
log_ok "/srv/vxture owned by $ADMIN_USER"

# ── Harden SSH ────────────────────────────────────────────────────────────────
log_step "Hardening SSH..."

SSHD_CONF="/etc/ssh/sshd_config"

if grep -q "^PermitRootLogin no" "$SSHD_CONF" 2>/dev/null; then
  log_ok "SSH: PermitRootLogin already disabled"
elif grep -q "^PermitRootLogin yes" "$SSHD_CONF" 2>/dev/null; then
  sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' "$SSHD_CONF"
  log_ok "PermitRootLogin → no"
elif ! grep -q "^PermitRootLogin" "$SSHD_CONF" 2>/dev/null; then
  echo "PermitRootLogin no" >> "$SSHD_CONF"
  log_ok "PermitRootLogin no — added"
else
  log_info "SSH: $(grep '^PermitRootLogin' "$SSHD_CONF")"
fi

if systemctl reload sshd 2>/dev/null; then
  log_ok "sshd reloaded"
else
  log_warn "sshd reload failed — is sshd running?"
fi

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
log_info "  bash scripts/deploy-post.sh"
