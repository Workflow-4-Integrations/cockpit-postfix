#!/usr/bin/env bash
set -euo pipefail

DOMAINS_FILE="/etc/postfix/virtual_mailbox_domains"

if [[ ! -f "$DOMAINS_FILE" ]]; then
  exit 0
fi

grep -Ev '^\s*($|#)' "$DOMAINS_FILE" | sed 's/[[:space:]]*$//'
