#!/usr/bin/env bash
set -euo pipefail

ALIAS_FILE="/etc/postfix/virtual_alias_maps"

if [[ ! -f "$ALIAS_FILE" ]]; then
  exit 0
fi

grep -Ev '^\s*($|#)' "$ALIAS_FILE" | awk '{print $1"\t"$2}'
