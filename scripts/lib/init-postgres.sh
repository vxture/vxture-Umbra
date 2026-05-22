#!/usr/bin/env bash
# Runs once on first PostgreSQL container start (docker-entrypoint-initdb.d)
# Creates additional databases and users for Vaultwarden and Shlink.
# The marzban database already exists (set via POSTGRES_DB env var).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Vaultwarden
  CREATE USER vaultwarden WITH PASSWORD '${POSTGRES_VAULTWARDEN_PASSWORD}';
  CREATE DATABASE vaultwarden OWNER vaultwarden;
  GRANT ALL PRIVILEGES ON DATABASE vaultwarden TO vaultwarden;

  -- Shlink
  CREATE USER shlink WITH PASSWORD '${POSTGRES_SHLINK_PASSWORD}';
  CREATE DATABASE shlink OWNER shlink;
  GRANT ALL PRIVILEGES ON DATABASE shlink TO shlink;
EOSQL

echo "[init-postgres] Additional databases created: vaultwarden, shlink"
