#!/usr/bin/env bash
set -euo pipefail

REMOTE="djs.ar"        # SSH host alias from ~/.ssh/config
TARGET="/home/monsqcgn/djs.ar"

rsync -avz --delete \
  --exclude=".git" \
  --exclude=".gitignore" \
  --exclude="firebase-debug.log" \
  --exclude="deploy.sh" \
  ./ "$REMOTE:$TARGET/"
