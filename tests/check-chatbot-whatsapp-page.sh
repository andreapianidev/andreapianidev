#!/usr/bin/env bash

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGE="$ROOT/sito-web/chatbot-whatsapp-aziende.html"
CSS="$ROOT/sito-web/assets/css/chatbot-whatsapp-aziende.css"
JS="$ROOT/sito-web/assets/js/chatbot-whatsapp-aziende.js"

fail() {
  printf 'FAIL: %s\n' "$1"
  exit 1
}

[[ -f "$PAGE" ]] || fail "pagina chatbot WhatsApp assente"
[[ -f "$CSS" ]] || fail "CSS dedicato assente"
[[ -f "$JS" ]] || fail "JavaScript dedicato assente"

[[ "$(rg -o '<h1([ >])' "$PAGE" | wc -l | tr -d ' ')" = "1" ]] || fail "la pagina deve avere un solo H1"
rg -qi 'chatbot whatsapp (per )?aziende' "$PAGE" || fail "keyword primaria assente"
rg -q '<link rel="canonical" href="https://www.andreapiani.com/chatbot-whatsapp-aziende.html"' "$PAGE" || fail "canonical errato"
[[ "$(rg -o 'type="application/ld\+json"' "$PAGE" | wc -l | tr -d ' ')" -ge 3 ]] || fail "servono almeno tre blocchi JSON-LD"
[[ "$(rg -o 'https://wa.me/393516248936\?text=' "$PAGE" | wc -l | tr -d ' ')" -ge 4 ]] || fail "servono almeno quattro CTA WhatsApp contestuali"

if rg -q '€|&euro;|\bEUR\b|"price"[[:space:]]*:' "$PAGE"; then
  fail "la pagina non deve pubblicare prezzi"
fi

rg -q 'assets/css/chatbot-whatsapp-aziende.css' "$PAGE" || fail "CSS non collegato"
rg -q 'assets/js/chatbot-whatsapp-aziende.js' "$PAGE" || fail "JavaScript non collegato"
rg -q 'https://www.andreapiani.com/chatbot-whatsapp-aziende.html' "$ROOT/sito-web/sitemap.xml" || fail "URL assente dalla sitemap"
rg -q 'href="chatbot-whatsapp-aziende.html"' "$ROOT/sito-web/popup-menu.html" || fail "pagina assente dal menu servizi"

incoming="$(rg -l 'href="chatbot-whatsapp-aziende.html"' \
  "$ROOT/sito-web/agente-immobiliare-ai.html" \
  "$ROOT/sito-web/sviluppo-python.html" \
  "$ROOT/sito-web/crm.html" | wc -l | tr -d ' ')"
[[ "$incoming" -ge 3 ]] || fail "servono tre link interni in ingresso"

printf 'PASS: landing chatbot WhatsApp completa\n'
