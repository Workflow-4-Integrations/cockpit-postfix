#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--json" ]]; then
  PAYLOAD="${2:-}"
  if [[ -z "$PAYLOAD" ]]; then
    echo "Usage: $0 --json '{\"param\":\"value\"}'" >&2
    exit 2
  fi
  python3 - "$PAYLOAD" <<'PY'
import json
import subprocess
import sys

payload = json.loads(sys.argv[1])
if not isinstance(payload, dict):
    raise SystemExit("Payload must be a JSON object")

for key, value in payload.items():
    subprocess.run(["postconf", "-e", f"{key}={value}"], check=True)

print("OK")
PY
  exit 0
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 param=value [param=value ...]" >&2
  exit 2
fi

for assignment in "$@"; do
  if [[ "$assignment" != *=* ]]; then
    echo "Invalid assignment: $assignment" >&2
    exit 2
  fi
  postconf -e "$assignment"
done

echo "OK"
