#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:-}"
MAP_FILE="/etc/postfix/virtual_mailbox_maps"

quota_for_user() {
  local user="$1"
  local out used total
  out="$(doveadm quota get -u "$user" 2>/dev/null || true)"
  used="$(echo "$out" | awk '/STORAGE|storage/ {print $2; exit}')"
  total="$(echo "$out" | awk '/STORAGE|storage/ {print $3; exit}')"
  if [[ -z "$used" || ! "$used" =~ ^[0-9]+$ ]]; then
    used=0
  fi
  if [[ -z "$total" || ! "$total" =~ ^[0-9]+$ ]]; then
    total=0
  fi
  python3 - <<PY
import json
print(json.dumps({
  "email": ${user@Q},
  "used": int(${used}),
  "total": int(${total}),
}))
PY
}

if [[ -n "$EMAIL" ]]; then
  quota_for_user "$EMAIL"
  exit 0
fi

if [[ ! -f "$MAP_FILE" ]]; then
  echo "[]"
  exit 0
fi

python3 - "$MAP_FILE" <<'PY'
import json
import sys

mailboxes = []
with open(sys.argv[1], "r", encoding="utf-8", errors="ignore") as handle:
    for raw in handle:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if not parts:
          continue
        mailbox = parts[0]
        mailboxes.append({"email": mailbox, "used": 0, "total": 0})

print(json.dumps(mailboxes))
PY
