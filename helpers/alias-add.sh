#!/usr/bin/env bash
set -euo pipefail

ALIAS_FILE="/etc/postfix/virtual_alias_maps"
SOURCE="${1:-}"
DESTINATION="${2:-}"

if [[ -z "$SOURCE" || -z "$DESTINATION" ]]; then
  echo "Usage: $0 <source> <destination>" >&2
  exit 2
fi
if [[ ! "$SOURCE" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "Invalid alias source: $SOURCE" >&2
  exit 2
fi

touch "$ALIAS_FILE"
if awk -v source="$SOURCE" '$1 == source { found = 1 } END { exit found ? 0 : 1 }' "$ALIAS_FILE"; then
  echo "Alias already exists: $SOURCE" >&2
  exit 1
fi

printf '%s\t%s\n' "$SOURCE" "$DESTINATION" >> "$ALIAS_FILE"
postmap "$ALIAS_FILE"
echo "OK"
