# Home page redesign — "Sell Like Crazy" (Sabri Suby applicato a PMI italiano)

**Data:** 2026-05-19
**Target file:** `sito-web/index.html` (full rewrite, current 3056 lines Mobirise-based)
**Stato:** approvato verbalmente in chat — implementazione diretta autorizzata

## 1. Strategia (locked)

| Pezzo | Scelta |
|---|---|
| **Dream Buyer** | Imprenditore PMI italiano (artigiano, hotel manager, studio professionale, agenzia) che vuole un gestionale/CRM/app custom per smettere di lavorare manualmente su Excel. Ticket €3k–€15k, decisione razionale-ROI, ciclo breve. |
| **Big Idea / USP** | Anti-canone + Anti-agenzia combinati → "Software italiano fatto a misura. Lo paghi una volta. Parli sempre con me." |
| **Scarcity** | "2 progetti gestionale al mese max" — contatore vivo in topbar, valore servito da `/api/slot-counter.php` (legge `data/slots.json`, fallback hardcoded se file assente) |
| **Garanzie (risk reversal)** | (1) Codice 100% tuo dal giorno 1 — repo Git consegnato dopo acconto. (3) 1 anno bug-fix gratis. (4) Handover documentato gratuito se decidi di cambiare dev. *(skip "30 giorni o non paghi", troppo rischioso su scope variabile)* |
| **Lead magnet** | ROI Calculator interattivo in-page (3 input → € persi/anno + PDF report email-gated). Secondario: "30min call gratis". |

## 2. Aesthetic — "Direct-Response Editoriale Italiano"

Rottura completa col dark theme attuale. **Solo la home cambia**, le pagine servizio interne restano nel loro stile.

- **Background:** carta bianco caldo `#FAF7F2` con noise overlay 4% opacity (`background-image: url(...noise.svg)`)
- **Accent primario:** rosso fuoco `#D62828` (CTA, sigilli, scarcity, sottolineature urgenti)
- **Accent secondario:** giallo highlighter `#FFD60A` (sottolineature valore, evidenziatore SVG)
- **Ink:** nero caldo `#1A1612` (tutto il testo)
- **Muted:** seppia `#8B7355` (subhead, captions)
- **Border:** ink line `#1A1612` 2px (manifesti vintage)

### Typography

```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Spectral:ital,wght@0,400;0,500;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

--font-display: 'Fraunces', Georgia, serif;     /* H1, H2, hero numbers */
--font-body: 'Spectral', Georgia, serif;        /* long-form copy */
--font-mono: 'IBM Plex Mono', monospace;        /* prices, counters, pre-heads */
```

H1 desktop: `clamp(3rem, 9vw, 9rem)`, Fraunces 900, OPSZ axis variable max, line-height 0.95, letter-spacing -0.04em.
H2 desktop: `clamp(2.25rem, 5vw, 4.5rem)`, Fraunces 700.
Body: `1.125rem` Spectral 400, line-height 1.6.

### Motion package

Tutto via CSS dove possibile, JS solo per stagger-on-scroll e cursor custom. Rispetta `prefers-reduced-motion`.

| Effetto | Tecnica |
|---|---|
| Hero text reveal parola-per-parola | CSS animation `fadeUp` con `animation-delay` calcolato in JS al load |
| Highlighter strokes gialli sotto parole chiave | SVG `<path>` con `stroke-dashoffset` animato (`@keyframes drawStroke`) |
| Slot counter pulse | `@keyframes pulse` su puntino rosso |
| Value stack che si impila | IntersectionObserver → aggiunge classe `revealed`, stagger 120ms con `animation-delay: calc(var(--i) * 120ms)` |
| Stamp "GARANTITO" rotation | `transform: rotate(-12deg) scale(0)` → `scale(1)` con bounce cubic-bezier |
| Cursor custom rosso "PRENDI" su CTA | `:hover` su `.cta-godfather` → cursor: none + div `#cursor` che follows mouse via JS |
| Scribble underline decorations | SVG inline con `stroke-dasharray` + IntersectionObserver |
| Counter numeri (€ persi/anno nel calculator) | JS `requestAnimationFrame` count-up 800ms ease-out |

## 3. Struttura sezioni (in ordine)

### 0. Topbar sticky (28-32px alta)
- Sx: `● Andrea Piani — Sviluppo software custom`
- Centro: `📅 Maggio 2026 — 1 slot libero su 2` (live, classe `.scarcity-counter`)
- Dx: `📞 +39 351 624 8936  |  ✉ andreapiani.dev@gmail.com`
- Border-bottom rosso 2px

### 1. Hero — Pattern Interrupt
- Pre-head mono rosso uppercase: *"PER L'IMPRENDITORE ITALIANO CHE STA PERDENDO 15 ORE A SETTIMANA SU EXCEL"*
- H1: *"Il tuo gestionale custom. **Tuo per sempre.** Niente canoni. Niente agenzie. Una sola firma."* → highlighter giallo SVG sotto "Tuo per sempre"
- Subhead Spectral italic
- Primary CTA `→ Vedi se sei nei 2 slot di questo mese` → `#offerta`
- Secondary text-link `Oppure calcola quanto stai perdendo →` → `#calcolatore`
- Foto Andrea B&W cerchio + caption manuscritta

### 2. Dream Buyer Filter — "Questo sito è per te se..."
Due colonne fianco a fianco, rosse vs nere:
- ✅ **Sei nel posto giusto se:** sei un imprenditore/titolare PMI, hai 5-50 dipendenti, paghi canoni SaaS che ti soffocano, gestisci processi critici su Excel, vuoi parlare con UNA persona non con un PM
- ❌ **NON sei nel posto giusto se:** cerchi un'app a 500€, vuoi un'agenzia con 20 PM, vuoi un SaaS template, non hai tempo per 2 call iniziali, non vuoi possedere il codice

### 3. Problem / Agitation (PAS framework)
Headline: *"Ogni mese in cui resti su Excel, il tuo business paga questo conto:"*
Tabella shock con righe in evidenza:
- 60 ore/mese di lavoro manuale × €25/h costo aziendale = **€1.500/mese**
- Errori di trascrizione, doppioni, dati persi = stimato **€500/mese**
- Tempo per generare report a mano (4-6h/mese) = **€100-150/mese**
- **TOTALE: oltre €24.000/anno** che stai pagando ORA, senza accorgertene
Sotto: *"E intanto la concorrenza chiude vendite mentre tu copi-incolli."*

### 4. Big Idea / Solution Unveil
Headline: *"Il modello Solo-Dev: meno bocche da sfamare, meno costi per te."*
Diagramma comparativo 3 colonne:
| Agenzia | SaaS in canone | Andrea (one-man) |
|---|---|---|
| 5-15 persone | Cloud altrui | 1 persona: io |
| Project Manager + commerciale + dev junior | Personalizzazione zero | Parli sempre con me |
| Preventivi €15-50k | €200/mese ∞ = €24k in 10 anni | Una firma, codice tuo |
| 4-8 mesi delivery | Pronto subito, ma non è tuo | 30-60 giorni operativo |
| Codice loro | Codice loro | Codice TUO dal giorno 1 |

Colonna Andrea evidenziata con border rosso + sigillo "100% TUO" rotato.

### 5. Proof Stack — Case Studies
Headline: *"Ecco cosa è successo agli ultimi 3 imprenditori che mi hanno scelto:"*
3 card editorial style (foto B&W, testo Spectral):
- **Hotel boutique 12 stanze (Cervignano)** — da 4h/giorno gestione check-in a 20 min. ROI: 18 mesi. *"Andrea ha capito al primo incontro come lavoriamo davvero." — M.B.*
- **Studio fisioterapia 3 sedi** — da Excel condiviso a gestionale prenotazioni multi-sede. Errori prenotazione: -94%.
- **Agenzia immobiliare** — agente AI integrato + gestione pratiche. Tempo medio compilazione contratto: da 45min a 8min.
Ogni card linka a una pagina servizio o case study reale già esistente nel sito.

### 6. THE GODFATHER OFFER — il pezzo centrale (id="offerta")
Layout sales-letter classico: sfondo carta più scuro `#F0EBE2`, border rosso doppio, padding generoso.

**Headline:** *"Quello che ricevi quando mi affidi il tuo gestionale custom:"*

**Value stack** (lista con prezzi crossati, ogni voce appare in cascata):
1. Analisi processi 1:1 + documento di scope dettagliato ~~€800~~
2. Sviluppo software su misura completo ~~€10.000~~
3. Setup server + prima configurazione + dominio ~~€500~~
4. Formazione 1:1 al tuo team (2h call + registrazione) ~~€400~~
5. Manuale operativo PDF personalizzato ~~€300~~
6. Backup automatici + sistema di ripristino ~~€250~~
7. Codice sorgente proprietario su tuo repo Git **INCALCOLABILE — questo NON ha prezzo**
8. **BONUS 1:** 3 mesi supporto prioritario incluso ~~€900~~
9. **BONUS 2:** 1 anno bug-fix gratuito incluso ~~€1.200~~
10. **BONUS 3:** Handover documentato se decidi di cambiare dev ~~€600~~

**Valore totale: €14.950+**
**Investimento tuo: a partire da €4.900** (preventivo personalizzato, dipende dallo scope)

**Sotto in box rosso sigillato:**
> *"Se preferisci, possiamo dividere in 3 rate. Acconto 40% alla firma, 30% a metà, 30% al collaudo."*

CTA grosso rosso pieno: **"Richiedi il preventivo gratuito ora →"** → `preventivo-app.html`

### 7. Risk Reversal — La Tripla Garanzia
3 sigilli affiancati, ognuno con icona + heading + 2-3 righe spiegazione:

**🔓 GARANZIA "CODICE TUO"**
Dal momento dell'acconto, il repository Git è nelle tue mani. Anche se domani sparisco da Internet, tu hai il sorgente, la documentazione, il manuale. Puoi farti continuare da qualsiasi sviluppatore.

**🛡️ GARANZIA "1 ANNO BUG-FIX"**
Per 12 mesi dalla consegna, qualunque bug nel codice che ho scritto lo sistemo gratis. Senza discussioni, senza fatture extra. Email a me, lo aggiusto.

**🤝 GARANZIA "HANDOVER PULITO"**
Se a un certo punto vuoi cambiare sviluppatore, ti faccio handover documentato gratuito: manuale tecnico + 2 ore di tour video con il nuovo dev. Niente lock-in.

### 8. FAQ — Objection Handling (10 obiezioni reali)
Accordion-style ma SENZA JS pesante (CSS `<details>` native). Obiezioni:
1. Quanto costa davvero un gestionale custom?
2. Quanto tempo serve per averlo operativo?
3. E se sparisci a metà progetto?
4. Posso modificarlo io dopo, se imparo a programmare?
5. Funziona anche da mobile?
6. Già pago un SaaS, perché dovrei migrare?
7. Hai esperienza nel mio settore?
8. Cosa succede se ho bisogno di nuove funzioni tra 2 anni?
9. Mi serve un server mio o usi cloud?
10. Posso parlare con un cliente reale prima di firmare?

Ogni risposta 80-150 parole, taglio Sabri Suby (diretto, no buzzword), include 1-2 CTA inline dove naturale.

### 9. ROI Calculator (id="calcolatore") — lead magnet interattivo
Box editorial con 3 slider/input:
- Ore lavoro manuale/settimana: slider 0-60
- Numero persone che lo fanno: slider 1-15
- Costo orario medio (€): slider 15-50

Output live (count-up animato):
- **€XX.XXX persi all'anno** in numerone Fraunces 6rem rosso
- Breakdown: ore totali/anno × costo, + 25% errori, + tempo report
- Box sotto: "Ti mando il PDF con il dettaglio e la simulazione di risparmio personalizzata"
- Form: nome + email + telefono (opzionale) → POST a `/api/log-event.php` con event `roi_calculator_submit` + payload, e `/api/submit-phone.php` se telefono compilato

Implementazione: vanilla JS, nessuna libreria. Riuso eventuale logica di `price-calculator.html`.

### 10. Final CTA Block — "2 modi per partire"
Sfondo rosso pieno `#D62828`, testo bianco, due card affiancate:

**A. Preventivo dettagliato (consigliato)**
*"Compila il form preventivo. Entro 24h ricevi una proposta scritta con scope, tempi e prezzo. Senza impegno."*
Bottone bianco: `Vai al preventivo →` → `preventivo-app.html`

**B. Call gratuita 30 min**
*"Preferisci parlare? Prenotiamo una call. 30 minuti, gratuita, niente pitch — analizziamo se il tuo caso è gestibile."*
Bottone bianco: `Scrivimi su WhatsApp →` → `https://wa.me/393516248936`

Sotto entrambe: scarcity counter ripetuto: *"📅 Maggio 2026 — 1 slot libero su 2"*

### 11. Footer minimal
Una riga: logo + © + privacy + cookie + sitemap. Niente clutter, niente social grid, niente newsletter. Sales letter style.

## 4. Tech notes

- **File toccati:**
  - `sito-web/index.html` — rewrite completo
  - `sito-web/assets/css/home-sell.css` — nuovo file, CSS dedicato (no inline styles)
  - `sito-web/assets/js/home-sell.js` — nuovo file, motion + ROI calculator + cursor custom
  - `sito-web/api/slot-counter.php` — nuovo endpoint, legge `data/slots.json`
  - `sito-web/data/slots.json` — nuovo file, `{"month":"2026-05","available":1,"total":2}`
  - `sito-web/api/log-event.php` — già esiste, usato per ROI calculator submit (event `roi_calculator_submit`)

- **Compatibilità:**
  - Mantiene tutti gli script backend esistenti (`chat-backend.js`, `chat-widget.js`, `analytics.js`, `popup-loader.js`)
  - Mantiene navbar popup-menu sistema (popup serve a navigare alle pagine servizio, che restano)
  - Mantiene cookie consent
  - **NON eredita** dark mode su questa home (override manuale: la home rifiuta il toggle dark perché aesthetic-locked). Toggle dark mode resta funzionante su altre pagine.

- **SEO preservato:**
  - Tutti i meta tag esistenti (description, OG, Twitter, canonical, hreflang) restano
  - Schema.org JSON-LD: aggiorno `ProfessionalService` con `priceRange: "€€"`, mantengo `aggregateRating`, aggiorno `description` per riflettere PMI focus
  - H1 unico, H2 strutturati gerarchicamente

- **Performance:**
  - Font subset: solo i pesi/axes usati
  - Noise SVG inline (no extra request)
  - Animazioni `transform`/`opacity` only (no layout thrash)
  - Lazy load case study images via `loading="lazy"`
  - `prefers-reduced-motion` → disabilita tutti i reveal stagger

- **Accessibilità:**
  - Contrast ratio AA su tutti i testi (#1A1612 su #FAF7F2 = 14.5:1 ✓)
  - Focus visible custom (outline rosso 3px)
  - ARIA su FAQ accordion (`<details>` native, già accessibili)
  - Cursor custom solo decorativo (cursor base resta visibile)

## 5. Out of scope (esplicito)

- ❌ Non tocco altre pagine (servizio, preventivo, FAQ, ecc.)
- ❌ Non rifaccio il popup menu navigation
- ❌ Non rifaccio la versione EN (`indexen.html`) — eventuale follow-up
- ❌ Non aggiungo CMS / admin per editare la home da backend
- ❌ Non rifaccio il footer globale (`footer-gdpr.html`)
- ❌ Non aggiungo testing automatico (sito statico, test manuale in browser)

## 6. Definition of done

- [ ] `index.html` rebuild completo, 0 reference a Mobirise `cid-*` classes
- [ ] Apertura in `http://localhost:8000/index.html` mostra hero, scrolla pulito, tutte le 11 sezioni renderizzano
- [ ] ROI calculator funziona end-to-end (input → output animato → form submit → conferma)
- [ ] Slot counter legge da `slots.json` o usa fallback
- [ ] Animazioni rispettano `prefers-reduced-motion`
- [ ] Mobile responsive a 375px, 768px, 1024px, 1440px
- [ ] Lighthouse Performance ≥ 85, Accessibility ≥ 95 (test locale)
- [ ] Chat widget + analytics + cookie consent ancora funzionanti
