#!/usr/bin/env bash
set -euo pipefail

DOMAINS_FILE="/etc/postfix/virtual_mailbox_domains"
DOMAIN="${1:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain>" >&2
  exit 2
fi
if [[ ! -f "$DOMAINS_FILE" ]]; then
  echo "Domains file not found: $DOMAINS_FILE" >&2
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

awk -v domain="$DOMAIN" '$1 != domain' "$DOMAINS_FILE" > "$tmp_file"
mv "$tmp_file" "$DOMAINS_FILE"
postmap "$DOMAINS_FILE"
echo "OK"
