#!/usr/bin/env bash
set -euo pipefail

TYPE=${1:-patch}

if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: pnpm release [patch|minor|major]"
  echo "  patch  — bug fixes (0.2.4 -> 0.2.5)"
  echo "  minor  — new features (0.2.4 -> 0.3.0)"
  echo "  major  — breaking changes (0.2.4 -> 1.0.0)"
  exit 1
fi

echo "--- typecheck"
pnpm typecheck

echo "--- test"
pnpm test

echo "--- build"
pnpm build

echo "--- bump version ($TYPE)"
npm version "$TYPE" -m "chore(release): %s"

echo "--- push"
git push --follow-tags

echo "--- publish"
npm publish --access public

echo "Released $(node -p "require('./package.json').version")"
