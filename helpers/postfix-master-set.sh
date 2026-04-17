#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--json" || -z "${2:-}" ]]; then
  echo "Usage: $0 --json '[...]'" >&2
  exit 2
fi

MASTER_FILE="/etc/postfix/master.cf"
PAYLOAD="$2"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

python3 - "$PAYLOAD" "$TMP_FILE" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
output = sys.argv[2]

if not isinstance(payload, list):
    raise SystemExit("Payload must be a JSON array")

with open(output, "w", encoding="utf-8") as handle:
    handle.write("# Managed by cockpit-postfix\n")
    for item in payload:
        service = str(item.get("service", "")).strip()
        typ = str(item.get("type", "")).strip()
        private = str(item.get("private", "-")).strip() or "-"
        unpriv = str(item.get("unpriv", "-")).strip() or "-"
        chroot = str(item.get("chroot", "-")).strip() or "-"
        wakeup = str(item.get("wakeup", "-")).strip() or "-"
        maxproc = str(item.get("maxproc", "-")).strip() or "-"
        command = str(item.get("command", "")).strip()
        if not service or not typ:
            continue
        handle.write(f"{service} {typ} {private} {unpriv} {chroot} {wakeup} {maxproc} {command}\n")
PY

install -m 0644 "$TMP_FILE" "$MASTER_FILE"
echo "OK"
