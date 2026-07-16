#!/usr/bin/env bash

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/sito-web"
PAGES=(
  chatbot-whatsapp-aziende
  consulenza-intelligenza-artificiale
  sviluppo-bot-telegram
  web-scraping
)

fail() {
  printf 'FAIL: %s\n' "$1"
  exit 1
}

for slug in "${PAGES[@]}"; do
  page="$SITE/$slug.html"
  [[ -f "$page" ]] || fail "$slug.html assente"
  [[ "$(rg -o '<h1([ >])' "$page" | wc -l | tr -d ' ')" = "1" ]] || fail "$slug deve avere un solo H1"
  rg -Fq "<link rel=\"canonical\" href=\"https://www.andreapiani.com/$slug.html\"" "$page" || fail "canonical errato per $slug"
  [[ "$(rg -o 'type="application/ld\+json"' "$page" | wc -l | tr -d ' ')" -ge 3 ]] || fail "servono tre JSON-LD per $slug"
  [[ "$(rg -o 'https://wa.me/393516248936\?text=' "$page" | wc -l | tr -d ' ')" -ge 4 ]] || fail "servono quattro CTA WhatsApp per $slug"
  rg -Fq "https://www.andreapiani.com/$slug.html" "$SITE/sitemap.xml" || fail "$slug assente dalla sitemap"
  rg -Fq "href=\"$slug.html\"" "$SITE/popup-menu.html" || fail "$slug assente dal menu"
  if rg -q '€|&euro;|\bEUR\b|"price"[[:space:]]*:' "$page"; then
    fail "$slug non deve mostrare prezzi"
  fi
done

for slug in consulenza-intelligenza-artificiale sviluppo-bot-telegram web-scraping; do
  [[ -f "$SITE/assets/css/$slug.css" ]] || fail "CSS $slug assente"
  [[ -f "$SITE/assets/js/$slug.js" ]] || fail "JavaScript $slug assente"
  rg -Fq "document.documentElement.classList.add('js')" "$SITE/assets/js/$slug.js" || fail "$slug deve attivare le animazioni con progressive enhancement"
  rg -Fq '.js [data-' "$SITE/assets/css/$slug.css" || fail "$slug non deve nascondere contenuti senza JavaScript"
  rg -Fq 'aria-live="polite"' "$SITE/$slug.html" || fail "$slug deve annunciare i risultati interattivi"
  rg -Fq 'aria-pressed=' "$SITE/$slug.html" || fail "$slug deve esporre lo stato dei controlli"
done

SITE="$SITE" python3 - <<'PY' || exit 1
import html
import json
import os
import re
from pathlib import Path

site = Path(os.environ["SITE"])
for slug in ("consulenza-intelligenza-artificiale", "sviluppo-bot-telegram", "web-scraping"):
    source = (site / f"{slug}.html").read_text(encoding="utf-8")
    blocks = re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', source, re.S)
    faq = next(json.loads(block) for block in blocks if json.loads(block).get("@type") == "FAQPage")
    structured = [(item["name"], item["acceptedAnswer"]["text"]) for item in faq["mainEntity"]]
    visible = []
    for question, answer in re.findall(r'<details><summary>(.*?)<span>\+</span></summary><p>(.*?)</p></details>', source, re.S):
        clean = lambda value: " ".join(html.unescape(re.sub(r"<[^>]+>", "", value)).split())
        visible.append((clean(question), clean(answer)))
    if structured != visible:
        raise SystemExit(f"FAIL: FAQ visibili e JSON-LD non coincidono in {slug}")
PY

incoming_ai="$(rg -l 'href="consulenza-intelligenza-artificiale.html"' "$SITE"/*.html | wc -l | tr -d ' ')"
incoming_tg="$(rg -l 'href="sviluppo-bot-telegram.html"' "$SITE"/*.html | wc -l | tr -d ' ')"
incoming_ws="$(rg -l 'href="web-scraping.html"' "$SITE"/*.html | wc -l | tr -d ' ')"
[[ "$incoming_ai" -ge 3 ]] || fail "servono tre link interni verso consulenza AI"
[[ "$incoming_tg" -ge 3 ]] || fail "servono tre link interni verso bot Telegram"
[[ "$incoming_ws" -ge 3 ]] || fail "servono tre link interni verso web scraping"

printf 'PASS: quattro landing Tier 1 complete\n'
