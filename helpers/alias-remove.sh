#!/usr/bin/env bash
set -euo pipefail

ALIAS_FILE="/etc/postfix/virtual_alias_maps"
SOURCE="${1:-}"

if [[ -z "$SOURCE" ]]; then
  echo "Usage: $0 <source>" >&2
  exit 2
fi

if [[ ! -f "$ALIAS_FILE" ]]; then
  echo "Alias file not found: $ALIAS_FILE" >&2
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

awk -v source="$SOURCE" '$1 != source' "$ALIAS_FILE" > "$tmp_file"
mv "$tmp_file" "$ALIAS_FILE"
postmap "$ALIAS_FILE"
echo "OK"
