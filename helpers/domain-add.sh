#!/usr/bin/env bash
set -euo pipefail

DOMAINS_FILE="/etc/postfix/virtual_mailbox_domains"

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain>" >&2
  exit 2
fi
if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Invalid domain: $DOMAIN" >&2
  exit 2
fi

touch "$DOMAINS_FILE"
if grep -Fqx "$DOMAIN" "$DOMAINS_FILE"; then
  echo "Domain already exists: $DOMAIN" >&2
  exit 1
fi

echo "$DOMAIN" >> "$DOMAINS_FILE"
postmap "$DOMAINS_FILE"
echo "OK"
