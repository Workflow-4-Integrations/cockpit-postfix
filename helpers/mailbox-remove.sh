#!/usr/bin/env bash
set -euo pipefail

MAILBOX_MAP="/etc/postfix/virtual_mailbox_maps"
DOVECOT_USERS="/etc/dovecot/users"
VMAIL_ROOT="/var/vmail"

EMAIL="${1:-}"
PURGE="${2:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email> [--purge]" >&2
  exit 2
fi
if [[ ! "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "Invalid email: $EMAIL" >&2
  exit 2
fi

if [[ -f "$MAILBOX_MAP" ]]; then
  tmp_map="$(mktemp)"
  trap 'rm -f "$tmp_map" "${tmp_users:-}"' EXIT
  awk -v email="$EMAIL" '$1 != email' "$MAILBOX_MAP" > "$tmp_map"
  mv "$tmp_map" "$MAILBOX_MAP"
  postmap "$MAILBOX_MAP"
fi

if [[ -f "$DOVECOT_USERS" ]]; then
  tmp_users="$(mktemp)"
  awk -F: -v email="$EMAIL" '$1 != email' "$DOVECOT_USERS" > "$tmp_users"
  mv "$tmp_users" "$DOVECOT_USERS"
fi

if [[ "$PURGE" == "--purge" ]]; then
  local_part="${EMAIL%@*}"
  domain_part="${EMAIL#*@}"
  rm -rf "${VMAIL_ROOT}/${domain_part}/${local_part}"
fi

echo "OK"
