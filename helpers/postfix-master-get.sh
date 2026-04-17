#!/usr/bin/env bash
set -euo pipefail

MASTER_FILE="/etc/postfix/master.cf"
if [[ ! -f "$MASTER_FILE" ]]; then
  echo "[]"
  exit 0
fi

python3 - "$MASTER_FILE" <<'PY'
import json
import sys

path = sys.argv[1]
items = []

with open(path, "r", encoding="utf-8", errors="ignore") as handle:
    for raw in handle:
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith(" ") or line.startswith("\t"):
            continue
        parts = line.split()
        if len(parts) < 8:
            continue
        service, typ, private, unpriv, chroot, wakeup, maxproc = parts[:7]
        command = " ".join(parts[7:])
        items.append({
            "service": service,
            "type": typ,
            "private": private,
            "unpriv": unpriv,
            "chroot": chroot,
            "wakeup": wakeup,
            "maxproc": maxproc,
            "command": command,
        })

print(json.dumps(items))
PY
