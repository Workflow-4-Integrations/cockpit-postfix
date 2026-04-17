#!/usr/bin/env bash
set -euo pipefail

QUEUE_ID="${1:-}"
if [[ -z "$QUEUE_ID" ]]; then
  echo "Usage: $0 <queue-id>" >&2
  exit 2
fi
if [[ ! "$QUEUE_ID" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "Invalid queue id: $QUEUE_ID" >&2
  exit 2
fi

postsuper -h "$QUEUE_ID"
echo "OK"
