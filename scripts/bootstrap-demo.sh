#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[demo-bootstrap] Starting demo repo checks..."

if [[ ! -f ".env.local" ]]; then
  echo "[demo-bootstrap] ERROR: .env.local not found."
  echo "[demo-bootstrap] Run: cp .env.demo.example .env.local"
  exit 1
fi

if ! rg -q '^VITE_APP_MODE=demo$' .env.local; then
  echo "[demo-bootstrap] ERROR: .env.local must include: VITE_APP_MODE=demo"
  exit 1
fi

echo "[demo-bootstrap] ✅ Demo mode env detected"

logo_candidates=(
  "public/stellar-logo.jpg"
  "public/stellar-dental-spa-logo.jpg"
  "public/stellar-logo.png"
)

logo_found="false"
for logo in "${logo_candidates[@]}"; do
  if [[ -f "$logo" ]]; then
    logo_found="true"
    echo "[demo-bootstrap] ✅ Found logo asset: $logo"
    break
  fi
done

if [[ "$logo_found" != "true" ]]; then
  echo "[demo-bootstrap] WARNING: No expected demo logo found in public/."
  echo "[demo-bootstrap] Add one of: ${logo_candidates[*]}"
fi

forbidden_strings=(
  "Court Street Dental"
  "CSD Team"
)

violation_count=0
for term in "${forbidden_strings[@]}"; do
  if rg -n --glob 'src/**' --fixed-strings "$term" src > /tmp/demo_bootstrap_hits.txt; then
    echo "[demo-bootstrap] WARNING: Found forbidden term: '$term'"
    cat /tmp/demo_bootstrap_hits.txt
    violation_count=$((violation_count + 1))
  fi
done

if [[ "$violation_count" -gt 0 ]]; then
  echo "[demo-bootstrap] ERROR: Remove branding terms above before sharing demo repo."
  exit 1
fi

echo "[demo-bootstrap] ✅ Branding scan passed"
echo "[demo-bootstrap] Done. Next: npm run dev (or deploy with VITE_APP_MODE=demo)."
