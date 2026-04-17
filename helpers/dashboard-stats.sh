#!/usr/bin/env bash
set -euo pipefail

count_file_lines() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo 0
    return
  fi
  grep -Ev '^\s*($|#)' "$file" | wc -l | tr -d ' '
}

queue_count() {
  if postqueue -j >/dev/null 2>&1; then
    postqueue -j | wc -l | tr -d ' '
    return
  fi
  postqueue -p | awk 'END {print $(NF-1)}'
}

postfix_status="$(systemctl is-active postfix 2>/dev/null || true)"
dovecot_status="$(systemctl is-active dovecot 2>/dev/null || true)"
queue_count_value="$(queue_count || echo 0)"
domain_count="$(count_file_lines /etc/postfix/virtual_mailbox_domains)"
mailbox_count="$(count_file_lines /etc/postfix/virtual_mailbox_maps)"
alias_count="$(count_file_lines /etc/postfix/virtual_alias_maps)"
hostname_value="$(hostname 2>/dev/null || true)"
postfix_version="$(postconf -d mail_version 2>/dev/null | awk -F'= ' '{print $2}' || true)"
dovecot_version="$(dovecot --version 2>/dev/null || true)"
recent_log="$(tail -n 10 /var/log/mail.log 2>/dev/null || true)"

python3 - <<PY
import json
print(json.dumps({
  "postfix_status": ${postfix_status@Q},
  "dovecot_status": ${dovecot_status@Q},
  "queue_count": int(${queue_count_value:-0}),
  "domain_count": int(${domain_count:-0}),
  "mailbox_count": int(${mailbox_count:-0}),
  "alias_count": int(${alias_count:-0}),
  "hostname": ${hostname_value@Q},
  "postfix_version": ${postfix_version@Q},
  "dovecot_version": ${dovecot_version@Q},
  "recent_log": ${recent_log@Q},
}))
PY
