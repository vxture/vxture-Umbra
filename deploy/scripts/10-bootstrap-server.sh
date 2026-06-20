#!/usr/bin/env bash
# Server bootstrap - run as root on a fresh (or existing) server.
# Installs Docker, creates admin user, copies SSH keys.
# Safe to re-run: each step checks state before acting.
# NOTE: root SSH is intentionally left enabled - disable manually after verifying stone login works.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/00-log.sh"

if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  echo ""
  echo "  Usage: bash deploy/server.sh init"
  echo ""
  echo "  Bootstraps a new server: installs Docker and docker compose,"
  echo "  creates admin user (default: stone), copies SSH keys from"
  echo "  root, configures UFW firewall (22, 80, 443), and sets up"
  echo "  /srv/umbra directory structure."
  echo ""
  echo "  Must run as root. Safe to re-run."
  echo ""
  echo "  Run: sudo bash deploy/server.sh init"
  echo ""
  exit 0
fi

log_banner "Umbra - Server Init"

if [[ "$EUID" -ne 0 ]]; then
  log_error "Must run as root"
  exit 1
fi

ADMIN_USER="${ADMIN_USER:-stone}"

# -- System packages -----------------------------------------------------------
log_step "Checking required packages..."

apt-get update -qq
PKGS=()
command -v curl    &>/dev/null || PKGS+=(curl)
command -v openssl &>/dev/null || PKGS+=(openssl)
command -v dig     &>/dev/null || PKGS+=(dnsutils)
command -v python3 &>/dev/null || PKGS+=(python3)
command -v git     &>/dev/null || PKGS+=(git)
command -v rsync   &>/dev/null || PKGS+=(rsync)

if [[ ${#PKGS[@]} -gt 0 ]]; then
  apt-get install -y "${PKGS[@]}" -qq
  log_ok "Installed: ${PKGS[*]}"
else
  log_ok "All required packages already present"
fi

# -- Docker --------------------------------------------------------------------
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

# -- Admin user ----------------------------------------------------------------
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

# -- SSH authorized_keys -------------------------------------------------------
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
  log_ok "SSH authorized_keys copied from root -> $ADMIN_USER"
else
  log_warn "No /root/.ssh/authorized_keys found"
  log_warn "Add your public key manually: /home/$ADMIN_USER/.ssh/authorized_keys"
fi

# -- Directory ownership -------------------------------------------------------
log_step "Setting up /srv/umbra ..."

# Pre-create the top-level dirs so the chown below covers them, and so the
# first CI rsync (which writes the deploy subset to /srv/umbra/deploy) and the
# subsequent deploy.sh run (which fills runtime/data/backup) both succeed.
# etc/ is the persistent home for the operator .env (deploy/ is disposable).
mkdir -p /srv/umbra/etc /srv/umbra/deploy /srv/umbra/runtime /srv/umbra/data /srv/umbra/backup

# Always chown recursively - safe to repeat; fixes root-owned files from
# any previous accidental root invocation of deploy scripts.
chown -R "$ADMIN_USER:$ADMIN_USER" /srv/umbra
log_ok "/srv/umbra owned by $ADMIN_USER (etc + deploy + runtime + data + backup)"

# -- Firewall ------------------------------------------------------------------
log_step "Configuring firewall..."

if command -v ufw &>/dev/null; then
  ufw allow 22/tcp  &>/dev/null || true
  ufw allow 80/tcp  &>/dev/null || true
  ufw allow 443/tcp &>/dev/null || true
  log_ok "UFW rules added: 22, 80, 443"
else
  log_info "UFW not installed - skipping firewall config"
fi

# -- Done ----------------------------------------------------------------------
echo ""
log_banner "Server Init Complete"
log_ok "Admin user : $ADMIN_USER  (sudo + docker)"
log_ok "Docker     : $(docker --version | cut -d' ' -f3 | tr -d ',')"
log_ok "Root dir   : /srv/umbra (owned by $ADMIN_USER)"
echo ""
log_info "No git clone is used. CI rsyncs the deploy subset (deploy/, configs/,"
log_info "docker-compose.yml) to /srv/umbra/deploy on the next release, then runs"
log_info "deploy.sh all over SSH. Before that first release:"
log_info "  create /srv/umbra/etc/.env with real secrets (copy from old server)"
log_info "  ensure DNS for the domains points at this host (or set CERTBOT_SKIP=true)"
echo ""
log_info "After confirming $ADMIN_USER SSH login works, optionally harden SSH:"
log_info "  sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl reload sshd"
