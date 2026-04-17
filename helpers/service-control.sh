#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-}"
SERVICE="${2:-}"

if [[ -z "$ACTION" || -z "$SERVICE" ]]; then
  echo "Usage: $0 <action> <postfix|dovecot>" >&2
  exit 2
fi
if [[ "$SERVICE" != "postfix" && "$SERVICE" != "dovecot" ]]; then
  echo "Unsupported service: $SERVICE" >&2
  exit 2
fi

status_json() {
  active="$(systemctl is-active "$SERVICE" 2>/dev/null || true)"
  enabled="$(systemctl is-enabled "$SERVICE" 2>/dev/null || true)"
  printf '{"active":"%s","enabled":"%s"}\n' "$active" "$enabled"
}

case "$ACTION" in
  status)
    status_json
    ;;
  start|stop|restart|enable|disable)
    systemctl "$ACTION" "$SERVICE"
    status_json
    ;;
  *)
    echo "Unsupported action: $ACTION" >&2
    exit 2
    ;;
esac
