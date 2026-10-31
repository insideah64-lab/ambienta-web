#!/usr/bin/env bash
set -euo pipefail
# Stage V3 from the unchanged V2 source plus the audited, limited overlay.
# V1/V2 source trees are not edited; V3 builds into its own static directory.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
mkdir -p apps/web-v3
rsync -a --delete --exclude=node_modules --exclude=dist apps/web/ apps/web-v3/
cp -a v3/overrides/. apps/web-v3/
(
  cd apps/web-v3
  npm ci --no-fund --no-audit
  npm run build
)
mkdir -p dist/v3
cp -a apps/web-v3/dist/. dist/v3/
test -s dist/v3/index.html
test -n "$(find dist/v3/assets -name '*.js' -print -quit)"
echo "PASS: isolated AMBIENTA V3 bundle built at dist/v3/"
