#!/usr/bin/env bash
#
# Guardia sui dati strutturati di tutto il sito.
#
# Nasce dall'errore Search Console del 22 apr 2026 su
# gestionali-personalizzati-aziende.html: "Tipo di oggetto non valido per
# campo itemReviewed". Era un blocco microdata <div itemscope
# itemtype="schema.org/AggregateRating"> con itemReviewed passato come
# stringa — Google lo interpretava come Thing generico e scartava lo
# snippet di recensioni. Rimosso in fe0b914.
#
# Le stelline sono comunque vietate su questo sito: non ci sono recensioni
# verificate da terze parti a supporto, e dal 2023 Google ignora
# l'aggregateRating self-serving. Questo test blocca la reintroduzione.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/sito-web"

fail() {
  printf 'FAIL: %s\n' "$1"
  exit 1
}

[[ -d "$SITE" ]] || fail "cartella sito-web assente"

# 1. Nessun markup di recensioni/rating in microdata o RDFa. Il testo
#    editoriale che *nomina* AggregateRating (es. l'elenco dei controlli in
#    scansione-seo-prestashop.html) è legittimo: qui si cercano solo attributi.
hits="$(grep -rl 'schema\.org/\(AggregateRating\|Review\|Rating\)\|itemprop=["'"'"']\(itemReviewed\|ratingValue\|reviewCount\|bestRating\)' --include='*.html' "$SITE" || true)"
[[ -z "$hits" ]] || fail "markup di rating/recensioni reintrodotto in:"$'\n'"$hits"

# 2. Nessun microdata: il sito usa esclusivamente JSON-LD.
hits="$(grep -rl 'itemscope\|itemprop=' --include='*.html' "$SITE" || true)"
[[ -z "$hits" ]] || fail "microdata reintrodotti (il sito usa solo JSON-LD) in:"$'\n'"$hits"

# 3. Ogni blocco JSON-LD deve essere JSON valido e avere i campi minimi
#    richiesti da Google per il tipo dichiarato.
python3 - "$SITE" <<'PY' || exit 1
import glob, json, os, re, sys

site = sys.argv[1]
block = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.S | re.I,
)

# Campi obbligatori per i tipi che generano rich result su Google.
REQUIRED = {
    "Article": ["headline", "datePublished", "author"],
    "BlogPosting": ["headline", "datePublished", "author"],
    "NewsArticle": ["headline", "datePublished", "author"],
    "Service": ["name"],
    "Product": ["name"],
    "SoftwareApplication": ["name"],
    "MobileApplication": ["name"],
    "Organization": ["name"],
    "Person": ["name"],
    "LocalBusiness": ["name", "address"],
    "ProfessionalService": ["name", "address"],
    "HowTo": ["name", "step"],
    "Question": ["name", "acceptedAnswer"],
    "Answer": ["text"],
    # ListItem è trattato a parte: in un carousel il nome sta nell'entità
    # annidata sotto "item", non sul ListItem stesso.
    "ListItem": ["position"],
}

errors = []
pages = blocks = 0

for path in sorted(glob.glob(os.path.join(site, "**", "*.html"), recursive=True)):
    rel = os.path.relpath(path, site)
    html = open(path, encoding="utf-8", errors="replace").read()
    found = block.findall(html)
    if found:
        pages += 1

    for i, raw in enumerate(found, 1):
        blocks += 1
        try:
            data = json.loads(raw)
        except Exception as exc:
            errors.append(f"{rel}: blocco JSON-LD #{i} non è JSON valido ({exc})")
            continue

        def walk(node, where="$"):
            if isinstance(node, dict):
                declared = node.get("@type")
                for t in declared if isinstance(declared, list) else [declared]:
                    for field in REQUIRED.get(t, []):
                        if field not in node:
                            errors.append(f"{rel}: {t} senza '{field}' ({where})")
                    if t in ("AggregateRating", "Rating", "Review"):
                        errors.append(f"{rel}: {t} in JSON-LD ({where}) — vietato")
                # Un ListItem deve portare un nome proprio oppure un'entità
                # annidata che ce l'abbia: senza, Google lo scarta.
                if declared == "ListItem" and "name" not in node:
                    item = node.get("item")
                    if not (isinstance(item, dict) and item.get("name")):
                        errors.append(f"{rel}: ListItem senza 'name' né item.name ({where})")
                for banned in ("aggregateRating", "review", "itemReviewed"):
                    if banned in node:
                        errors.append(f"{rel}: campo '{banned}' in JSON-LD ({where}) — vietato")
                for key, value in node.items():
                    walk(value, f"{where}.{key}")
            elif isinstance(node, list):
                for j, value in enumerate(node):
                    walk(value, f"{where}[{j}]")

        walk(data)

for e in errors:
    print(f"FAIL: {e}")
if errors:
    sys.exit(1)

print(f"OK: {blocks} blocchi JSON-LD validi su {pages} pagine")
PY

printf 'OK: dati strutturati puliti\n'
