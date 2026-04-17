#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--reload" ]]; then
  postfix check
  postfix reload
  echo "OK"
  exit 0
fi

postfix check
echo "OK"
