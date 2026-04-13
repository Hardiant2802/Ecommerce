#!/usr/bin/env sh
set -eu

PROJECT_NAME="e-commerce"
OUTPUT_DIR=".vercel/output/static"
DEFAULT_BRANCH="Anhhuy895"
BRANCH="${1:-$DEFAULT_BRANCH}"

npm run cf:build
npx wrangler pages deploy "$OUTPUT_DIR" --project-name "$PROJECT_NAME" --branch "$BRANCH"
