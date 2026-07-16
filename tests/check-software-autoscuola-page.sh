#!/usr/bin/env bash

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGE="$ROOT/sito-web/software-autoscuola.html"

fail() {
  printf 'FAIL: %s\n' "$1"
  exit 1
}

[[ -f "$PAGE" ]] || fail "pagina autoscuole assente"

title="$(python3 -c 'import re,sys; print(re.search(r"<title>(.*?)</title>", open(sys.argv[1], encoding="utf-8").read(), re.S).group(1).strip())' "$PAGE")"
description="$(python3 -c 'import re,sys; print(re.search(r"<meta name=\"description\" content=\"([^\"]*)\"", open(sys.argv[1], encoding="utf-8").read()).group(1))' "$PAGE")"

(( ${#title} >= 40 && ${#title} <= 60 )) || fail "title fuori intervallo 40-60 caratteri: ${#title}"
(( ${#description} >= 140 && ${#description} <= 160 )) || fail "description fuori intervallo 140-160 caratteri: ${#description}"
[[ "$(rg -o '<h1([ >])' "$PAGE" | wc -l | tr -d ' ')" = "1" ]] || fail "serve un solo H1"
rg -Fq '<link rel="canonical" href="https://www.andreapiani.com/software-autoscuola.html"' "$PAGE" || fail "canonical assente"
rg -Fq '"@type": "Service"' "$PAGE" || fail "schema Service assente"
rg -Fq '"@type": "FAQPage"' "$PAGE" || fail "schema FAQ assente"
[[ "$(rg -o 'https://wa.me/393516248936' "$PAGE" | wc -l | tr -d ' ')" -ge 4 ]] || fail "servono almeno quattro CTA WhatsApp"

if rg -qi '€|&euro;|\bEUR\b|licenza a vita|una tantum' "$PAGE"; then
  fail "la pagina non deve mostrare prezzi o formule commerciali rigide"
fi
if rg -qi '40 domande|30 min(uti)?|max(imo)? 4 errori' "$PAGE"; then
  fail "modalità esame patente obsolete"
fi
rg -qi '30 (domande|quesiti)' "$PAGE" || fail "numero quesiti aggiornato assente"
rg -qi '20 minuti' "$PAGE" || fail "durata esame aggiornata assente"
rg -qi 'massimo 3 errori' "$PAGE" || fail "soglia errori aggiornata assente"

if rg -qi 'AggregateRating|reviewCount|recensioni verificate|-90%|\+25%|più completo d.Italia|in uso presso autoscuole in tutta Italia' "$PAGE"; then
  fail "claim o recensioni non dimostrati ancora presenti"
fi
if rg -q '—|&mdash;' "$PAGE"; then
  fail "trattino lungo ancora presente"
fi

PAGE="$PAGE" python3 - <<'PY' || exit 1
from pathlib import Path
import html
import json
import os
import re

source = Path(os.environ["PAGE"]).read_text(encoding="utf-8")
blocks = [json.loads(block) for block in re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', source, re.S)]
faq = next(block for block in blocks if block.get("@type") == "FAQPage")
structured = [(item["name"], item["acceptedAnswer"]["text"]) for item in faq["mainEntity"]]
section = source[source.index("<!-- FAQ SEO -->"):source.index("<!-- CTA WhatsApp - Closing -->")]
clean = lambda value: " ".join(html.unescape(re.sub(r"<[^>]+>", "", value)).split())
visible = [(clean(question), clean(answer)) for question, answer in re.findall(r'<h3[^>]*>(.*?)</h3>\s*<p[^>]*>(.*?)</p>', section, re.S)]
if structured != visible:
    raise SystemExit("FAIL: FAQ visibili e JSON-LD non coincidono")
PY

printf 'PASS: pagina autoscuole aggiornata e verificabile\n'
