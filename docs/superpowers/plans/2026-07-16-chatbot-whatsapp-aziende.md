# Chatbot WhatsApp Aziende Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pubblicare una landing SEO ad alta conversione per `chatbot whatsapp aziende`, con contatto esclusivamente tramite WhatsApp e senza prezzi.

**Architecture:** La pagina resta statica e segue l'architettura del sito: un HTML semantico con dati strutturati, un foglio CSS isolato con prefisso `wa-` e un piccolo script vanilla per animazioni progressive e FAQ. Sitemap, menu centrale e pagine cluster forniscono scoperta e collegamenti interni.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, JSON-LD, Bootstrap esistente, Vercel static hosting.

## Global Constraints

- Non mostrare prezzi, fasce di prezzo o promesse numeriche non verificabili.
- Ogni CTA commerciale deve aprire WhatsApp al numero `+39 351 624 8936` con un messaggio contestuale precompilato.
- Keyword primaria: `chatbot whatsapp aziende`.
- Non usare testimonianze, rating, clienti o statistiche inventate.
- Animazioni disabilitate o ridotte con `prefers-reduced-motion`.

---

### Task 1: Test SEO preventivo

**Files:**
- Create: `tests/check-chatbot-whatsapp-page.sh`

**Interfaces:**
- Consumes: file statici sotto `sito-web/`.
- Produces: controllo eseguibile che fallisce se pagina, SEO, CTA, sitemap o link cluster non rispettano i vincoli.

- [ ] **Step 1: Creare il controllo fallente**

Lo script deve verificare: presenza pagina, un solo H1, canonical esatto, keyword primaria, tre blocchi JSON-LD, almeno quattro link `wa.me/393516248936`, assenza di simboli/prezzi in euro, presenza in sitemap e menu, almeno tre link interni in ingresso e file CSS/JS dedicati.

- [ ] **Step 2: Eseguire il controllo**

Run: `bash tests/check-chatbot-whatsapp-page.sh`

Expected: `FAIL: pagina chatbot WhatsApp assente`.

### Task 2: Landing semantica e visuale

**Files:**
- Create: `sito-web/chatbot-whatsapp-aziende.html`
- Create: `sito-web/assets/css/chatbot-whatsapp-aziende.css`
- Create: `sito-web/assets/js/chatbot-whatsapp-aziende.js`

**Interfaces:**
- Consumes: `navbar-fix.css`, `assets/js/popup-loader.js`, `cookie-consent.js`, `whatsapp-float.js`.
- Produces: pagina indicizzabile `/chatbot-whatsapp-aziende.html` e asset isolati con classi `wa-*`.

- [ ] **Step 1: Creare l'HTML**

Inserire title, description, canonical, Open Graph, Twitter, schema `Service`, `BreadcrumbList`, `FAQPage`, hero, centrale conversazioni, problema, flusso, capacità, casi d'uso, metodo, FAQ e CTA finale. Usare il messaggio WhatsApp codificato `Ciao Andrea, vorrei capire come automatizzare le richieste che ricevo su WhatsApp nella mia azienda.`

- [ ] **Step 2: Creare il CSS responsive**

Implementare i token Ink, Paper, Signal green, Amber, Coral e Slate; focus visibile; griglie responsive; centrale conversazioni; target tattili da 44px; media query sotto 760px e `prefers-reduced-motion`.

- [ ] **Step 3: Creare il JavaScript progressivo**

Usare `IntersectionObserver` per aggiungere `is-visible` agli elementi `[data-reveal]` e aggiornare lo stato dei quattro nodi della centrale conversazioni senza rimuovere contenuti dal DOM. Se il movimento è ridotto, mostrare subito tutti gli elementi.

- [ ] **Step 4: Eseguire il controllo parziale**

Run: `bash tests/check-chatbot-whatsapp-page.sh`

Expected: fallimento limitato a sitemap, menu o link interni in ingresso.

### Task 3: Cluster SEO e scoperta

**Files:**
- Modify: `sito-web/sitemap.xml`
- Modify: `sito-web/popup-menu.html`
- Modify: `sito-web/agente-immobiliare-ai.html`
- Modify: `sito-web/sviluppo-python.html`
- Modify: `sito-web/crm.html`

**Interfaces:**
- Consumes: URL canonico della Task 2.
- Produces: pagina scoperta da crawler, navigazione e tre pagine affini.

- [ ] **Step 1: Aggiornare sitemap e menu**

Aggiungere URL con `lastmod` `2026-07-16`, `changefreq` `weekly`, priorità `0.90`, e link menu `💬 Chatbot WhatsApp Aziende` nella categoria Development & Automation.

- [ ] **Step 2: Aggiungere tre link contestuali**

Inserire un collegamento descrittivo alla landing nelle sezioni già dedicate ad AI/chatbot/CRM di `agente-immobiliare-ai.html`, `sviluppo-python.html` e `crm.html`, senza alterare CTA o copy non collegato.

- [ ] **Step 3: Eseguire tutti i controlli statici**

Run: `bash tests/check-chatbot-whatsapp-page.sh`

Expected: `PASS: landing chatbot WhatsApp completa`.

### Task 4: Verifica browser e pubblicazione

**Files:**
- Modify: solo i file delle Task 1-3 se la verifica rivela difetti.

**Interfaces:**
- Consumes: landing completa e cluster aggiornato.
- Produces: pagina verificata e disponibile su produzione.

- [ ] **Step 1: Avviare il server locale**

Run: `cd sito-web && python3 -m http.server 8000`

Expected: server disponibile su `http://localhost:8000`.

- [ ] **Step 2: Verificare desktop e mobile**

Aprire `http://localhost:8000/chatbot-whatsapp-aziende.html`, controllare console, menu, FAQ, CTA WhatsApp, layout a 1440px e 390px, focus da tastiera e assenza di overflow.

- [ ] **Step 3: Validare markup e link**

Run: `bash tests/check-chatbot-whatsapp-page.sh && curl -sI http://localhost:8000/chatbot-whatsapp-aziende.html | head -1`

Expected: PASS e `HTTP/1.0 200 OK`.

- [ ] **Step 4: Commit e push**

Run: `git add -A && git commit -m "seo: aggiungi landing chatbot WhatsApp aziende" && git push origin main`

Expected: branch `main` sincronizzato con `origin/main`.

- [ ] **Step 5: Deploy produzione**

Run: `cd sito-web && vercel --prod --yes`

Expected: deploy completato e alias produzione aggiornato.

- [ ] **Step 6: Verificare produzione**

Run: `curl -sI https://www.andreapiani.com/chatbot-whatsapp-aziende.html | head -1`

Expected: risposta HTTP `200`.
