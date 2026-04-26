#!/usr/bin/env bash
# Inject chat-backend.js + analytics.js next to chat-widget.js on every page that uses it.
# Idempotent: skips files where backend/analytics tags already exist.

set -euo pipefail
cd "$(dirname "$0")/sito-web"

BACKEND_TAG='<script src="assets/js/chat-backend.js" defer data-aai-backend="1"></script>'
ANALYTICS_TAG='<script src="assets/js/analytics.js" defer data-aai-analytics="1"></script>'

count=0
for f in *.html; do
  [[ -f "$f" ]] || continue
  grep -q 'chat-widget.js' "$f" || continue
  if grep -q 'data-aai-backend' "$f" && grep -q 'data-aai-analytics' "$f"; then
    continue
  fi
  # Insert chat-backend.js BEFORE the existing chat-widget.js include line (so it parses first)
  if ! grep -q 'data-aai-backend' "$f"; then
    sed -i.bak "s|<script src=\"assets/js/chat-widget.js\"|${BACKEND_TAG}\\
<script src=\"assets/js/chat-widget.js\"|" "$f"
  fi
  # Append analytics.js right after chat-widget.js line (still before </body>)
  if ! grep -q 'data-aai-analytics' "$f"; then
    sed -i.bak "s|<script src=\"assets/js/chat-widget.js\" defer data-aai-js=\"1\"></script>|<script src=\"assets/js/chat-widget.js\" defer data-aai-js=\"1\"></script>\\
${ANALYTICS_TAG}|" "$f"
  fi
  count=$((count + 1))
done

# Also inject analytics.js on pages WITHOUT the chat widget (legal pages excluded by analytics.js itself)
for f in *.html; do
  [[ -f "$f" ]] || continue
  grep -q 'chat-widget.js' "$f" && continue
  grep -q 'data-aai-analytics' "$f" && continue
  case "$f" in
    privacy-policy*|cookie-policy*|PrivacyPolicyPS.html|wtprivacy.html|grazie-guida.html|footer-gdpr.html|google*.html)
      continue ;;
  esac
  # Insert before </body>
  sed -i.bak "s|</body>|${ANALYTICS_TAG}\\
</body>|" "$f"
  count=$((count + 1))
done

echo "Updated $count files. Backups saved as *.bak"
