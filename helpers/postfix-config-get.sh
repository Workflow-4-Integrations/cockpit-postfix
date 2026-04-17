#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---non-default}"

if [[ "$MODE" == "--default" ]]; then
  PARAM="${2:-}"
  if [[ -z "$PARAM" ]]; then
    echo "Usage: $0 --default <param>" >&2
    exit 2
  fi
  postconf -d "$PARAM" | python3 -c 'import json,sys; line=sys.stdin.read().strip(); value=""; 
if "=" in line: value=line.split("=",1)[1].strip(); print(json.dumps({"param":line.split("=",1)[0].strip() if "=" in line else "", "value":value}))'
  exit 0
fi

if [[ "$MODE" != "--all" && "$MODE" != "--non-default" ]]; then
  echo "Usage: $0 [--all|--non-default]" >&2
  exit 2
fi

if [[ "$MODE" == "--all" ]]; then
  CURRENT_OUTPUT="$(postconf)"
else
  CURRENT_OUTPUT="$(postconf -n)"
fi
DEFAULT_OUTPUT="$(postconf -d)"

CURRENT_FILE="$(mktemp)"
DEFAULT_FILE="$(mktemp)"
trap 'rm -f "$CURRENT_FILE" "$DEFAULT_FILE"' EXIT

printf '%s\n' "$CURRENT_OUTPUT" > "$CURRENT_FILE"
printf '%s\n' "$DEFAULT_OUTPUT" > "$DEFAULT_FILE"

python3 - "$MODE" "$CURRENT_FILE" "$DEFAULT_FILE" <<'PY'
import json
import sys

mode = sys.argv[1]
current_file = sys.argv[2]
default_file = sys.argv[3]

def parse(path):
    data = {}
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or "=" not in line:
                continue
            key, value = line.split("=", 1)
            data[key.strip()] = value.strip()
    return data

print(json.dumps({
    "mode": "all" if mode == "--all" else "non-default",
    "params": parse(current_file),
    "defaults": parse(default_file),
}))
PY
