#!/usr/bin/env bash
set -euo pipefail

MAILBOX_MAP="/etc/postfix/virtual_mailbox_maps"
DOVECOT_USERS="/etc/dovecot/users"

MODE="add"
if [[ "${1:-}" == "--reset" ]]; then
  MODE="reset"
  shift
fi

EMAIL="${1:-}"
PASSWORD="${2:-}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Usage: $0 [--reset] <email> <password>" >&2
  exit 2
fi
if [[ ! "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "Invalid email: $EMAIL" >&2
  exit 2
fi

touch "$MAILBOX_MAP" "$DOVECOT_USERS"
password_hash="$(doveadm pw -s SHA512-CRYPT -p "$PASSWORD")"

local_part="${EMAIL%@*}"
domain_part="${EMAIL#*@}"
mailbox_path="${domain_part}/${local_part}/"

if [[ "$MODE" == "add" ]] && ! awk -v email="$EMAIL" '$1 == email { found = 1 } END { exit found ? 0 : 1 }' "$MAILBOX_MAP"; then
  printf '%s\t%s\n' "$EMAIL" "$mailbox_path" >> "$MAILBOX_MAP"
fi

tmp_users="$(mktemp)"
trap 'rm -f "$tmp_users"' EXIT

awk -F: -v email="$EMAIL" '$1 != email' "$DOVECOT_USERS" > "$tmp_users"
printf '%s:%s::::::\n' "$EMAIL" "$password_hash" >> "$tmp_users"
mv "$tmp_users" "$DOVECOT_USERS"

postmap "$MAILBOX_MAP"
echo "OK"
