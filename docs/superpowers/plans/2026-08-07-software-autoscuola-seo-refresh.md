# Software Autoscuola SEO Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migliorare la pagina autoscuole per la query principale e per il vocabolario operativo del settore, mantenendo trasparenza commerciale e claim verificabili.

**Architecture:** Il sito resta statico e non introduce nuove dipendenze. I requisiti diventano asserzioni nello script Bash esistente; HTML visibile e JSON-LD vengono poi aggiornati insieme, mentre la sitemap registra soltanto la modifica reale della pagina.

**Tech Stack:** HTML5 statico, JSON-LD Schema.org, Bash, Python 3 per parsing e controlli, Vercel CLI.

## Global Constraints

- Modificare soltanto `sito-web/software-autoscuola.html`, `tests/check-software-autoscuola-page.sh` e il `lastmod` relativo in `sito-web/sitemap.xml`.
- Non creare nuove URL, screenshot fittizi, loghi cliente, recensioni, certificazioni o numeri di mercato.
- Non pubblicare durata del foglio rosa, numero di tentativi pratici o ore obbligatorie senza fonte primaria aggiornata.
- Non dichiarare integrazioni attive con MCTC, Portale dell'Automobilista, PagoPA o SDI; presentarle come flussi da verificare e configurare.
- Mantenere fascia `EUR 1.600-2.500`, formula una tantum, CTA demo, un solo H1 e corrispondenza esatta fra FAQ visibili e FAQ JSON-LD.

---

### Task 1: Trasformare la specifica in test eseguibili

**Files:**
- Modify: `tests/check-software-autoscuola-page.sh`
- Test: `tests/check-software-autoscuola-page.sh`

**Interfaces:**
- Consumes: HTML statico in `sito-web/software-autoscuola.html`.
- Produces: exit code `0` solo quando snippet, prezzo, lessico operativo, prudenza dei claim e JSON-LD rispettano la specifica.

- [ ] **Step 1: Sostituire il controllo commerciale obsoleto e aggiungere le nuove asserzioni**

```bash
[[ "$title" == Software\ Gestionale\ per\ Autoscuole* ]] || fail "title non centrato sulla query primaria"
rg -q '€1\.600[^<]{0,20}€2\.500' "$PAGE" || fail "fascia di prezzo assente"
rg -qi 'una tantum' "$PAGE" || fail "formula una tantum assente"

for term in 'Motorizzazione Civile' 'MCTC' "Portale dell.Automobilista" 'PagoPA' 'fatturazione elettronica' 'SDI' 'CQC' 'CAP' 'recupero punti' 'pratiche auto' 'certificato medico telematico'; do
  rg -qi "$term" "$PAGE" || fail "termine operativo assente: $term"
done

rg -qi 'formati.*procedure.*verificat|compatibilit.*verificat|integrazioni.*verificat' "$PAGE" || fail "manca la cautela sulle integrazioni esterne"
```

- [ ] **Step 2: Validare tutti i JSON-LD e la data di modifica**

```python
blocks = [json.loads(block) for block in re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', source, re.S)]
assert {block.get("@type") for block in blocks} >= {"Service", "SoftwareApplication", "FAQPage", "BreadcrumbList"}
service = next(block for block in blocks if block.get("@type") == "Service")
assert service["dateModified"] == "2026-08-07"
```

- [ ] **Step 3: Eseguire il test e verificare il fallimento atteso**

Run: `bash tests/check-software-autoscuola-page.sh`

Expected: `FAIL: title non centrato sulla query primaria` e exit code diverso da zero, perché la pagina usa ancora il vecchio title.

- [ ] **Step 4: Committare il contratto di test**

```bash
git add tests/check-software-autoscuola-page.sh
git commit -m "test: definisce refresh SEO software autoscuola" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2: Aggiornare snippet, contenuto e dati strutturati

**Files:**
- Modify: `sito-web/software-autoscuola.html`
- Test: `tests/check-software-autoscuola-page.sh`

**Interfaces:**
- Consumes: contratto SEO del Task 1 e struttura/CSS esistenti della pagina.
- Produces: pagina statica con metadata e copy operativo coerenti, senza nuove dipendenze o componenti.

- [ ] **Step 1: Aggiornare metadata social e title**

```html
<meta name="description" content="Software gestionale per autoscuole: registro guide, agenda, foglio rosa, pratiche MCTC e pagamenti. Da €1.600 una tantum. Richiedi oggi la demo.">
<meta property="og:title" content="Software Gestionale per Autoscuole e Scuole Guida">
<meta name="twitter:title" content="Software Gestionale per Autoscuole e Scuole Guida">
<title>Software Gestionale per Autoscuole e Scuole Guida</title>
```

- [ ] **Step 2: Integrare il lessico operativo nella sezione funzionalita**

Ampliare le righe esistenti su anagrafica, modulistica e pagamenti, specificando che Motorizzazione Civile/MCTC, Portale dell'Automobilista, PagoPA, fatturazione elettronica/SDI e certificato medico telematico sono flussi la cui compatibilita viene verificata in analisi. Estendere le categorie a CQC, CAP, recupero punti e pratiche auto solo come configurazioni di progetto.

- [ ] **Step 3: Rendere la prosa SEO utile e prudente**

Sostituire il paragrafo che attribuisce al foglio rosa una durata e tentativi non verificati con una descrizione dello scadenzario priva di numeri normativi. Aggiungere un paragrafo che spiega come l'analisi mappa i passaggi verso servizi esterni senza promettere integrazioni gia attive.

- [ ] **Step 4: Allineare JSON-LD e data di modifica**

Aggiornare `Service.description`, `SoftwareApplication.description`, `featureList` e `dateModified` usando le stesse formulazioni prudenti del contenuto visibile. Non aggiungere recensioni o rating.

- [ ] **Step 5: Eseguire il test e verificare il verde**

Run: `bash tests/check-software-autoscuola-page.sh`

Expected: `PASS: pagina autoscuole aggiornata e verificabile` e exit code `0`.

### Task 3: Aggiornare sitemap e verificare l'intero sito

**Files:**
- Modify: `sito-web/sitemap.xml`
- Test: `tests/check-*.sh`

**Interfaces:**
- Consumes: pagina completata dal Task 2.
- Produces: segnale `lastmod` aggiornato, suite verde e artefatto pronto al deploy.

- [ ] **Step 1: Aggiornare esclusivamente il lastmod della pagina autoscuole**

Nel blocco con `<loc>https://www.andreapiani.com/software-autoscuola.html</loc>`, impostare:

```xml
<lastmod>2026-08-07</lastmod>
```

- [ ] **Step 2: Eseguire tutti i test**

Run: `for test_file in tests/check-*.sh; do bash "$test_file" || exit 1; done`

Expected: tutti gli script terminano con exit code `0`.

- [ ] **Step 3: Controllare diff e file HTML**

Run: `git diff --check && python3 -m json.tool <(python3 -c 'import re; print("{}")') >/dev/null`

Expected: exit code `0`; il parsing JSON-LD completo resta coperto dal test specifico.

- [ ] **Step 4: Servire il sito e verificare HTTP e asset**

Run: `cd sito-web && python3 -m http.server 8000`

In una seconda shell:

```bash
curl -fsS http://127.0.0.1:8000/software-autoscuola.html >/dev/null
curl -fsS http://127.0.0.1:8000/assets/css/autoscuola.css >/dev/null
curl -fsS http://127.0.0.1:8000/assets/js/autoscuola.js >/dev/null
```

Expected: tutte le richieste restituiscono HTTP 200.

- [ ] **Step 5: Verificare visualmente desktop e mobile**

Aprire `http://127.0.0.1:8000/software-autoscuola.html` a viewport desktop e mobile. Controllare hero, tabella prezzo, FAQ, menu, assenza di overflow e leggibilita delle integrazioni aggiunte.

- [ ] **Step 6: Committare il rilascio**

```bash
git add sito-web/software-autoscuola.html sito-web/sitemap.xml
git commit -m "seo: rafforza la pagina software autoscuola" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 4: Pubblicare e verificare la produzione

**Files:**
- Read: `sito-web/.vercel/project.json`
- Read: deployment Vercel e URL live.

**Interfaces:**
- Consumes: commit verificato del Task 3.
- Produces: commit su `origin/main`, deployment production e verifica del dominio canonico.

- [ ] **Step 1: Verificare account e collegamento Vercel**

Run: `cd sito-web && vercel whoami && sed -n '1,80p' .vercel/project.json`

Expected: account autenticato e project ID `prj_USlVh3XlJ7niE8hgJVs2kJzQRJue` nel team `team_RzxBtLZwwUK4Em4UTauWKI7K`.

- [ ] **Step 2: Pubblicare i commit**

Run: `git push origin main`

Expected: `main -> main` senza errori.

- [ ] **Step 3: Eseguire il deploy produzione**

Run: `cd sito-web && vercel --prod --yes`

Expected: deploy completato e alias produzione assegnato a `www.andreapiani.com`.

- [ ] **Step 4: Verificare il deployment e il dominio live**

```bash
cd sito-web
vercel inspect <deployment-url>
curl -fsSL https://www.andreapiani.com/software-autoscuola.html -o /tmp/software-autoscuola-live.html
rg -F '<title>Software Gestionale per Autoscuole e Scuole Guida</title>' /tmp/software-autoscuola-live.html
rg -F 'Motorizzazione Civile' /tmp/software-autoscuola-live.html
```

Expected: deployment `Ready`, risposta HTTP 200 e contenuti aggiornati presenti sul dominio canonico.

- [ ] **Step 5: Confermare stato Git finale**

Run: `git status --short --branch`

Expected: `## main...origin/main` senza file modificati o non tracciati.
