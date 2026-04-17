#!/usr/bin/env bash
set -euo pipefail

if postqueue -j >/dev/null 2>&1; then
  postqueue -j | python3 -c '
import json
import sys

def normalize_recipients(recipients):
    normalized = []
    for recipient in recipients:
        if isinstance(recipient, dict):
            normalized.append(recipient.get("address", ""))
        else:
            normalized.append(str(recipient))
    return normalized

items = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        continue
    items.append({
        "id": entry.get("queue_id", ""),
        "sender": entry.get("sender", ""),
        "size": entry.get("message_size", ""),
        "recipients": normalize_recipients(entry.get("recipients", [])),
    })

print(json.dumps(items))
'
else
  mailq | python3 -c '
import json
import re
import sys

items = []
current = None
entry_re = re.compile(r"^([A-Za-z0-9]+[*!]?)\s+(\d+)\s+.+\s+(\S+@\S+)$")

for line in sys.stdin:
    line = line.rstrip("\n")
    match = entry_re.match(line)
    if match:
        if current is not None:
            items.append(current)
        current = {
            "id": match.group(1),
            "size": match.group(2),
            "sender": match.group(3),
            "recipients": [],
        }
        continue

    if current is None:
        continue

    stripped = line.strip()
    if not stripped or stripped.startswith("("):
        continue
    if "@" in stripped:
        current["recipients"].append(stripped.split()[0])

if current is not None:
    items.append(current)

print(json.dumps(items))
'
fi
