#!/usr/bin/env sh
set -eu

OUTPUT_DIR=".vercel/output/static"

npm run cf:build
npx wrangler pages dev "$OUTPUT_DIR"
