#!/usr/bin/env bash
set -euo pipefail

MAP_FILE="/etc/postfix/virtual_mailbox_maps"

if [[ ! -f "$MAP_FILE" ]]; then
  exit 0
fi

grep -Ev '^\s*($|#)' "$MAP_FILE" | awk '{print $1}'
