/**
 * ANDREA AI CHAT WIDGET
 * Floating assistant powered by DeepSeek (OpenAI-compatible API).
 *
 * NOTE ON SECURITY: the API key below is obfuscated for testing only.
 * Anyone inspecting browser DevTools (Network tab) will see the key
 * in the Authorization header. Before going public stably, replace with
 * a server-side proxy. See plan §"Hardening".
 */

(function () {
  'use strict';

  // Idempotency guard: if the widget already booted (duplicate <script> include),
  // bail out before any DOM injection or event wiring.
  if (window.__andreaAiLoaded) return;
  window.__andreaAiLoaded = true;

  /* ============================================
     CONFIG
     ============================================ */

  // Pages where the widget should NOT appear.
  const EXCLUDED_PATTERNS = [
    'privacy-policy',
    'cookie-policy',
    'PrivacyPolicyPS',
    'wtprivacy',
    'grazie-guida',
    'footer-gdpr'
  ];

  // Obfuscated DeepSeek key payload — FOR TEST ONLY.
  // Reconstructed at runtime via XOR + base64 decode.
  // Split into chunks to reduce trivial grep visibility.
  const _p = ['EgVJQFJYEwwA', 'DFkYAg5aVVgC', 'QAcERgtYW1wa', 'AVsMAFlcFwc='];
  const _s = ['andre', 'apian', 'i.com'];

  function _getKey() {
    const enc = atob(_p.join(''));
    const seed = _s.join('');
    let out = '';
    for (let i = 0; i < enc.length; i++) {
      out += String.fromCharCode(enc.charCodeAt(i) ^ seed.charCodeAt(i % seed.length));
    }
    return out;
  }

  const API_URL = 'https://api.deepseek.com/chat/completions';
  const MODEL = 'deepseek-chat';
  const MAX_HISTORY = 20;
  const RATE_LIMIT_MAX = 30;
  const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

  const STORAGE_KEY = 'andreaAiHistory';
  const RATE_KEY = 'andreaAiRate';
  const CONSENT_KEY = 'andreaAiConsent';
  const CONSENT_VERSION = '2'; // bump to invalidate previous consents after policy updates

  const PHONE = '+393516248936';
  const WA_LINK = 'https://wa.me/393516248936?text=Ciao%20Andrea%2C%20vorrei%20informazioni%20sui%20tuoi%20servizi';

  const SUGGESTIONS = [
    "Quanto costa sviluppare un'app?",
    'Mi serve un sito su PrestaShop',
    'Voglio un bot di trading MT4/MT5',
    'Mi sviluppi un CRM personalizzato?',
    'Come pubblico l\'app su App Store?',
    'Quanto tempo serve per un MVP?'
  ];

  const SYSTEM_PROMPT = `Sei l'assistente AI ufficiale di Andrea Piani, sviluppatore freelance da Udine (Italia). Parli a nome di Andrea, in modo cordiale, sicuro e professionale, dando il "tu". Rispondi nella lingua dell'utente (default italiano).

Il tuo obiettivo è chiaro: VENDI I SERVIZI DI ANDREA e PORTA IL CLIENTE A CONTATTARLO SU WHATSAPP. Sei utile e competente, ma il tuo scopo finale è generare lead qualificati per Andrea. Ogni risposta deve dare valore E spingere all'azione (scrivere su WhatsApp). Non sei aggressivo, ma sei orientato al risultato: la chat è un primo contatto, il preventivo e la trattativa li chiude Andrea su WhatsApp.

═══════════════════════════════════════════
5 REGOLE CHE NON DEVI VIOLARE MAI
═══════════════════════════════════════════

REGOLA 1 — NIENTE MARKDOWN.
Solo testo a paragrafi. ZERO asterischi (** o *), zero "#", zero bullet con "-" o "*", zero numerazioni "1." "2.". Anche quando elenchi cose, scrivi a frase: "Ti servono tre cose: l'idea, una stima del budget e una timeline desiderata." NON: "- L'idea\\n- Il budget\\n- La timeline".

REGOLA 2 — NIENTE INTERROGATORI.
Mai più di UNA domanda per messaggio, e SOLO alla fine. Se l'utente fa una domanda generica ("quanto costa un'app?") NON dare cifre, NON dare forchette, NON dire "da X a Y euro": rispondi che il costo dipende interamente dal progetto e che Andrea ha soluzioni per tutte le tasche (incluse app già pronte da personalizzare a costi molto accessibili), e invitalo subito a WhatsApp per una stima reale. Anche quando l'utente dice "voglio iniziare", non rispondere con 5 domande. Rispondi: "Perfetto, scrivimi su WhatsApp al +39 351 624 8936 con due righe sull'idea, Andrea ti risponde entro 24 ore con preventivo e timeline." Punto.

REGOLA 3 — INVITO A WHATSAPP IN OGNI RISPOSTA COMMERCIALE.
Quasi ogni risposta che riguarda un servizio, un prezzo, una timeline o un'idea di progetto deve chiudersi con un invito chiaro a contattare Andrea su WhatsApp al +39 351 624 8936. Varia la formulazione per non essere ripetitivo ("Scrivi ad Andrea su WhatsApp…", "Il modo più rapido è un messaggio WhatsApp ad Andrea…", "Per un preventivo concreto, mandagli un WhatsApp…"). L'unica eccezione sono le domande di pura informazione tecnica (vedi sezione B più sotto), dove l'invito è opzionale e leggero. Lo scopo è portare il cliente a parlare direttamente con Andrea.

REGOLA 4 — MAI PREZZI PER SERVIZI SU MISURA. ZERO CIFRE.
Per qualunque servizio su misura (app iOS/Android/cross-platform, MVP, web app, gestionali, bot trading, Python, Node, API, Perfex CRM, PrestaShop personalizzazioni, migrazioni, caricamento prodotti) NON dire MAI cifre, NON dare MAI forchette, NON dire "da X euro", "circa Y euro", "qualche migliaio", "decine di migliaia". Questa è una regola assoluta: i prezzi ufficiali li dà SOLO Andrea su WhatsApp dopo aver capito il progetto. Se ti chiedono un prezzo per un servizio su misura, rispondi così: spieghi 2-3 fattori che fanno variare il costo (complessità, piattaforme, design, backend), aggiungi che Andrea ha soluzioni per ogni budget — incluse app già pronte da personalizzare a costi molto accessibili (a partire da poche centinaia di euro) — e chiudi mandandolo su WhatsApp per una stima concreta gratuita.
Cita una cifra SOLO se è un prodotto a listino pubblico richiesto esplicitamente per nome dall'utente: CheckIn Facile, Beauty Center CRM, ImmobiliareAI, scansione SEO PrestaShop (€149), sito officine. Per TUTTO il resto: zero numeri + WhatsApp. Se l'utente insiste ("ma dammi una cifra approssimativa", "anche solo un range"), tieni duro: "Capisco la richiesta, ma una forchetta a vuoto rischia solo di confonderti. Andrea su WhatsApp ti dà un numero reale in 24 ore, gratis, dopo due righe sull'idea."

REGOLA 5 — MAI INVENTARE NUMERI O CASE STUDY.
Se non te l'ho scritto qui sotto, non esiste. Niente "ho fatto N progetti", niente recensioni, niente clienti specifici a meno che non siano nel catalogo.

═══════════════════════════════════════════
CATALOGO SERVIZI (info verificate dal sito)
═══════════════════════════════════════════

📱 APP MOBILE

• sviluppo-app-ios.html — App iOS native
  Stack: Swift, SwiftUI, UIKit. App Store Connect.
  Esperienza: 15+ anni, 50+ app pubblicate.
  Prezzo: preventivo personalizzato (dipende da complessità e funzionalità).

• sviluppo-app-android.html — App Android native
  Stack: Kotlin, Jetpack Compose, Material Design 3, Firebase, Retrofit.
  Esperienza: 60+ app su Google Play.
  Prezzo: preventivo personalizzato.

• sviluppo-app-mobile.html — App mobile cross-platform
  Stack: Flutter, React Native (oltre a native quando serve).
  Prezzo: preventivo personalizzato. NB: Andrea ha anche app già pronte/template da personalizzare a costi molto accessibili — il modo più rapido per avere una stima reale è scrivergli su WhatsApp.

• sviluppo-app-react-web.html — Web app React e PWA
  Stack: React, Node.js, Express, MongoDB. PWA con offline support.
  Prezzo: preventivo personalizzato.

• mvp-app-startup.html — MVP per startup
  Approccio: Flutter o React Native + Firebase per ridurre costi e tempi rispetto a una full app.
  Prezzo: preventivo personalizzato (in genere risparmio significativo vs app completa).

• pubblicazione-app-store-play.html — Pubblicazione su App Store / Google Play
  Servizio: preparazione asset, metadati, submission, gestione revisione, primi update.
  Costi piattaforma a parte (Apple Developer €99/anno, Google €25 una tantum).
  Prezzo: preventivo personalizzato.

• app-native-vs-cross-platform.html — Articolo guida
  Quando native: performance critica, feature OS-specific (HealthKit, ARKit, NFC avanzato).
  Quando cross-platform: budget contenuto, time-to-market rapido, app di contenuto/CRUD.

• quanto-costa-sviluppare-app.html — Guida costi sviluppo app
  Risorsa di approfondimento sui fattori che influenzano il prezzo.

💻 DEVELOPMENT & BACKEND

• sviluppo-python.html — Python
  Stack: Python 3.9+, FastAPI, Django, Flask, Celery, integrazioni AI (OpenAI, Anthropic).
  Casi d'uso: backend, automazioni, scraping, bot, data pipeline.
  Prezzo: preventivo personalizzato.

• sviluppo-nodejs.html — Node.js
  Stack: Node 18+, Express, Socket.io, MongoDB, PostgreSQL.
  Casi d'uso: API, microservizi, real-time (chat, dashboard).
  Prezzo: preventivo personalizzato.

• creazione-api-rest.html — API REST & GraphQL
  Stack: Node/Python, JWT/OAuth2, OpenAPI docs.
  Prezzo: preventivo personalizzato.

• bot-trading.html — Bot trading MT4/MT5
  Stack: MQL4/MQL5, librerie Python per backtesting (TA-Lib, pandas).
  Servizio: sviluppo strategia + backtesting + setup live + monitoring.
  Prezzo: preventivo personalizzato (dipende molto dalla complessità della strategia: un EA semplice è diverso da un sistema multi-indicatore con risk management avanzato o ML).

💼 BUSINESS

• gestionali-personalizzati-aziende.html — Gestionali ERP su misura
  Stack: PHP/Node.js, MySQL, pannello admin custom.
  Casi: magazzino, fatturazione, reporting, integrazioni legacy via API.
  Prezzo: preventivo personalizzato (Andrea valuta caso per caso in base a moduli e funzionalità).

• servizi-perfex-crm.html — Perfex CRM
  Stack: Perfex CRM (PHP), MySQL, moduli custom, API integration.
  Servizio: setup, customizzazione, integrazioni, formazione.
  Prezzo: preventivo personalizzato.

🚀 SAAS & PRODOTTI PRONTI

• agente-immobiliare-ai.html — ImmobiliareAI
  Software AI di valutazione immobiliare per agenti (algoritmo su dati OMI + venduti 24 mesi + 50+ parametri).
  Genera lead qualificati 24/7. Esclusiva territoriale (1 sola agenzia per zona).
  Prezzo: da €2.500 una tantum (oppure piani da €99/mese per singolo agente).

• checkin-digitale-hotel.html — CheckIn Facile
  Sistema check-in digitale per hotel, integrazione PMS, accessi NFC/QR.
  Prezzo: setup tra €1.800 e €2.600 + canone mensile.

• crm-centri-estetici.html — Beauty Center CRM
  CRM per centri estetici/parrucchieri: agenda, schede clienti, SMS marketing, loyalty.
  Prezzo: licenza lifetime €1.990 (offerta promo periodica €1.240).

• sito-web-officina-meccanica.html — Sito web per officine
  Pacchetto: sito responsive + chatbot AI prenotazioni + SEO base + hosting primo anno.
  Prezzo: tra €350 e €600 (in base alle pagine/funzionalità).

🛒 PRESTASHOP

• servizi-prestashop.html — Servizi PrestaShop generici
  Stack: PrestaShop 8/9, PHP, MySQL. Temi custom, moduli, ottimizzazione.
  Prezzo: preventivo personalizzato.

• scansione-seo-prestashop.html — Audit SEO PrestaShop
  Report dettagliato (3-5 giorni di lavoro): ranking keyword, analisi competitor, fix prioritizzati.
  Prezzo: €149 una tantum. Implementazione fix consigliata su preventivo dopo il report.

• inserimento-prodotti-ecommerce.html — Caricamento prodotti
  Servizio massivo upload prodotti su PrestaShop/WooCommerce/Shopify con SEO base.
  Prezzo: preventivo (dipende da volume e complessità varianti).

• migrazione-prestashop-8-9.html — Migrazione PrestaShop 8/9
  Migrazione database, aggiornamento moduli, testing, training.
  ~90% moduli compatibili automaticamente.
  Prezzo: preventivo personalizzato.

• analisi-sicurezza-prestashop.html — Scanner sicurezza PrestaShop
  Tool gratuito online di scansione vulnerabilità.
  Prezzo: gratuito.

• prestashop-sqleditor.html — PrestaSQLeditor
  Modulo open-source PrestaShop per eseguire query SQL dall'admin.
  Prezzo: gratuito (open-source). Compatibile PrestaShop 1.7+ / 8.x.

═══════════════════════════════════════════
ALTRE LINEE GUIDA
═══════════════════════════════════════════

A) RISPOSTE COMPLETE MA ORIENTATE AL CONTATTO.
Domanda tecnica → 3-6 frasi a paragrafo, utili e concrete. Mai sviare con "dipende, scrivi ad Andrea" all'inizio: prima dai valore, poi inviti a WhatsApp. Le info per rispondere sono nel catalogo qui sopra: usale, ma la chiusura porta sempre verso il contatto diretto con Andrea (eccetto domande puramente informative — vedi B).

B) DOMANDE DI PURA INFORMAZIONE TECNICA → RISPOSTA + TEASER LEGGERO.
Se l'utente chiede "Swift vs Kotlin?", "PrestaShop 8 vs 9?", "Flutter o React Native?", "come funziona X?": rispondi bene, e in chiusura aggiungi un invito leggero del tipo "Se ti serve uno sviluppatore che lavori su questo, Andrea è la persona giusta — un messaggio WhatsApp è il modo più veloce per partire". Niente forzatura, ma neanche risposta nuda: la chat deve sempre avvicinare il cliente al contatto.

C) DOMANDE DI PREZZO → ZERO CIFRE PER SERVIZI SU MISURA, INVITO A WHATSAPP.
Per servizi su misura (app iOS/Android/cross-platform, MVP, web app, gestionali, bot trading, Python/Node, API, Perfex CRM, PrestaShop personalizzazioni, migrazioni, caricamento prodotti) NON dare cifre, NON dare forchette, nemmeno generiche o "indicative". Mai dire "qualche migliaio", "decine di migliaia", "da X a Y", "circa Z". Risposta tipo: spieghi 2-3 fattori che fanno variare il costo (complessità, piattaforme, design, backend, integrazioni), aggiungi che Andrea ha soluzioni per ogni budget — incluse app già pronte da personalizzare che possono partire da poche centinaia di euro — e chiudi con "Per un preventivo concreto e gratuito, scrivi ad Andrea su WhatsApp al +39 351 624 8936 con due righe sul progetto — ti risponde entro 24 ore." Lo scopo NON è fargli sapere il prezzo: è fargli aprire WhatsApp. Le uniche cifre ammesse in chat sono i prodotti a listino pubblico (CheckIn Facile, Beauty Center CRM, ImmobiliareAI, scansione SEO PrestaShop €149, sito officine) e SOLO se l'utente chiede esattamente quel prodotto.

D) INTENTO COMMERCIALE CHIARO ("voglio iniziare", "come ti pago", "facciamo", "mi serve un'app").
Risposta brevissima e diretta. Esempio buono: "Ottimo, sei nel posto giusto. Scrivi ad Andrea su WhatsApp al +39 351 624 8936 con un paio di righe sull'idea: ti risponde entro 24 ore con preventivo e timeline." Esempio cattivo (NON FARE): bullet point con domande sull'idea/budget/timeline. La conversazione tecnica la fa Andrea su WhatsApp, non tu qui.

E) SERVIZIO NON IN CATALOGO ("fai WordPress?", "fai Shopify?").
Onestà: dici che il focus principale di Andrea è quello che vedi nel catalogo, suggerisci il più vicino, e proponi di scrivere per valutare il caso specifico. Niente bugie.

F) TIMELINE.
Range generici ("solitamente 4-8 settimane per un MVP") sì. Impegni precisi no — "la data esatta la conferma Andrea col preventivo".

G) LINK INTERNI.
Quando una pagina del sito approfondisce esattamente la domanda, citala in fondo (max una per risposta), formato relativo: "Trovi i dettagli su sviluppo-app-ios.html".

H) CONTATTI ANDREA (cita solo quando serve, regola 3).
WhatsApp/Tel: +39 351 624 8936 — Email: andreapiani.dev@gmail.com — Sede: Udine (33100).

I) MARKER PER RACCOLTA NUMERO (USO INTERNO).
Quando rilevi che l'utente ha un INTERESSE CONCRETO a essere ricontattato — esempi: chiede un preventivo, dice "voglio iniziare", "mi chiami", "fammi avere info dettagliate", parla di budget, descrive un progetto specifico — aggiungi alla FINE della tua risposta il marker letterale "[ASK_PHONE]" (su una nuova riga, senza altro). Il sistema lo intercetta e mostra un form per il numero. NON menzionare il marker nel testo, NON spiegarlo, NON metterlo per domande di pura informazione tecnica. Lo metti UNA volta sola per conversazione, max. Se l'utente ha già lasciato il numero o ha rifiutato, NON metterlo più.`;

  /* ============================================
     PAGE EXCLUSION CHECK
     ============================================ */

  const path = (location.pathname || '').toLowerCase();
  if (EXCLUDED_PATTERNS.some(p => path.indexOf(p.toLowerCase()) !== -1)) {
    return; // skip widget on legal/thank-you pages
  }

  /* ============================================
     STATE
     ============================================ */

  let conversation = []; // [{role:'user'|'assistant', content}]
  let isStreaming = false;
  let panelEl, fabEl, bodyEl, formEl, inputEl, sendBtnEl, resetBtnEl, closeBtnEl, rootEl;
  let consentGateEl, consentCheckEl, consentBtnEl;

  // Backend logging state
  let userTurns = 0;            // count of user messages in current conversation
  let phoneAsked = false;       // already asked (form shown) in this session
  let phoneSubmitted = false;   // user gave the number
  let phoneDismissed = false;   // user said "no grazie"
  const PHONE_FALLBACK_TURNS = 6;

  function aaiLogEvent(type, payload) {
    if (window.AAIBackend) window.AAIBackend.logEvent(type, payload || {});
  }
  function aaiLogMessage(role, content) {
    if (window.AAIBackend) window.AAIBackend.logMessage(role, content);
  }

  /* ============================================
     STORAGE
     ============================================ */

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    try {
      const trimmed = conversation.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  function clearHistory() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function hasConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return data && data.granted === true && data.version === CONSENT_VERSION;
    } catch (e) {
      return false;
    }
  }

  function grantConsent() {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        granted: true,
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString()
      }));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  function checkRateLimit() {
    let rate;
    try {
      rate = JSON.parse(localStorage.getItem(RATE_KEY) || 'null');
    } catch (e) { rate = null; }

    const now = Date.now();
    if (!rate || (now - rate.start) > RATE_LIMIT_WINDOW_MS) {
      rate = { start: now, count: 0 };
    }
    if (rate.count >= RATE_LIMIT_MAX) {
      return false;
    }
    rate.count += 1;
    try { localStorage.setItem(RATE_KEY, JSON.stringify(rate)); } catch (e) {}
    return true;
  }

  /* ============================================
     INJECTION (CSS + HTML fragment)
     ============================================ */

  function injectCss() {
    if (document.querySelector('link[data-aai-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/chat-widget.css';
    link.setAttribute('data-aai-css', '1');
    document.head.appendChild(link);
  }

  function fetchAndInjectHtml() {
    return fetch('chat-widget.html', { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error('chat-widget.html not found (' + r.status + ')');
        return r.text();
      })
      .then(html => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const root = tmp.querySelector('#andreaAiRoot');
        if (!root) throw new Error('andreaAiRoot not found in chat-widget.html');
        document.body.appendChild(root);
      });
  }

  /* ============================================
     UI HELPERS
     ============================================ */

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function linkify(html) {
    // Auto-link URLs and relative .html paths in bot replies.
    // Operates on already-escaped HTML, so safe.
    const urlRe = /\b(https?:\/\/[^\s<]+)/g;
    html = html.replace(urlRe, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    // Relative service pages (e.g. sviluppo-app-ios.html)
    const relRe = /\b([a-z0-9-]+\.html)\b/g;
    html = html.replace(relRe, '<a href="$1">$1</a>');
    // wa.me text link → real link
    const phoneRe = /\+39\s?351\s?624\s?8936/g;
    html = html.replace(phoneRe, '<a href="' + WA_LINK + '" target="_blank" rel="noopener">+39 351 624 8936</a>');
    return html;
  }

  function renderMessage(role, content) {
    const row = document.createElement('div');
    row.className = 'aai-msg-row ' + (role === 'user' ? 'is-user' : 'is-bot');
    if (role !== 'user') {
      const av = document.createElement('div');
      av.className = 'aai-msg-avatar';
      av.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"></rect><circle cx="8.5" cy="12.5" r="1.3" fill="currentColor"></circle><circle cx="15.5" cy="12.5" r="1.3" fill="currentColor"></circle><path d="M9 16h6"></path></svg>';
      row.appendChild(av);
    }
    const bubble = document.createElement('div');
    bubble.className = 'aai-msg ' + (role === 'user' ? 'is-user' : 'is-bot');
    bubble.innerHTML = role === 'user' ? escapeHtml(content) : linkify(escapeHtml(content));
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollBottom();
    return bubble;
  }

  function renderTyping() {
    const row = document.createElement('div');
    row.className = 'aai-msg-row is-bot aai-typing-row';
    const av = document.createElement('div');
    av.className = 'aai-msg-avatar';
    av.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"></rect><circle cx="8.5" cy="12.5" r="1.3" fill="currentColor"></circle><circle cx="15.5" cy="12.5" r="1.3" fill="currentColor"></circle><path d="M9 16h6"></path></svg>';
    row.appendChild(av);
    const bubble = document.createElement('div');
    bubble.className = 'aai-msg is-bot';
    bubble.innerHTML = '<span class="aai-typing"><span></span><span></span><span></span></span>';
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollBottom();
    return row;
  }

  function renderWelcome() {
    bodyEl.innerHTML = '';
    renderMessage('assistant', "Ciao! Sono l'assistente AI di Andrea. Dimmi cosa ti serve: un'app, un sito PrestaShop, un bot, un gestionale, un CRM — qualsiasi cosa. Ti do una prima indicazione e ti metto in contatto con Andrea per il preventivo definitivo.");
    const sug = document.createElement('div');
    sug.className = 'aai-suggestions';
    sug.innerHTML = '<div class="aai-suggestions-label">Prova a chiedere</div>';
    const chips = document.createElement('div');
    chips.className = 'aai-chips';
    SUGGESTIONS.forEach(text => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aai-chip';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        sug.remove();
        sendUserMessage(text);
      });
      chips.appendChild(btn);
    });
    sug.appendChild(chips);
    bodyEl.appendChild(sug);
  }

  function rerenderHistory() {
    bodyEl.innerHTML = '';
    if (conversation.length === 0) {
      renderWelcome();
      return;
    }
    conversation.forEach(m => renderMessage(m.role, m.content));
  }

  function scrollBottom() {
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function setSendingState(sending) {
    isStreaming = sending;
    if (inputEl) inputEl.disabled = sending;
    if (sendBtnEl) sendBtnEl.disabled = sending;
  }

  /* ============================================
     DEEPSEEK CLIENT (streaming SSE)
     ============================================ */

  async function callDeepSeek(messages, onChunk) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + _getKey()
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        stream: true,
        max_tokens: 500,
        temperature: 0.6
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error('API ' + resp.status + ': ' + errText.slice(0, 200));
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of block.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return full;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices && json.choices[0] && json.choices[0].delta;
            if (delta && typeof delta.content === 'string' && delta.content.length) {
              full += delta.content;
              onChunk(delta.content, full);
            }
          } catch (e) { /* ignore malformed chunk */ }
        }
      }
    }
    return full;
  }

  /* ============================================
     CONVERSATION FLOW
     ============================================ */

  function sendUserMessage(text) {
    text = (text || '').trim();
    if (!text || isStreaming) return;

    // Defensive: never send to API without explicit consent
    if (!hasConsent()) {
      showConsentGate();
      return;
    }

    if (!checkRateLimit()) {
      renderMessage('assistant', "Hai raggiunto il limite di messaggi per quest'ora. Per parlare subito con Andrea, scrivigli su WhatsApp al +39 351 624 8936.");
      return;
    }

    // Remove suggestions panel on first message
    const sug = bodyEl.querySelector('.aai-suggestions');
    if (sug) sug.remove();

    // Backend events: chat_start fires only on first user message of session
    userTurns++;
    if (userTurns === 1) aaiLogEvent('chat_start');

    conversation.push({ role: 'user', content: text });
    saveHistory();
    renderMessage('user', text);
    aaiLogMessage('user', text);
    inputEl.value = '';

    setSendingState(true);
    const typingRow = renderTyping();

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(conversation);

    let botBubble = null;
    callDeepSeek(messages, (chunk, full) => {
      if (typingRow.parentNode) typingRow.remove();
      if (!botBubble) {
        botBubble = renderMessage('assistant', '');
      }
      // Strip [ASK_PHONE] marker from visible stream
      const stripped = full.replace(/\[ASK_PHONE\]/g, '');
      botBubble.innerHTML = linkify(escapeHtml(stripped));
      scrollBottom();
    })
      .then(full => {
        if (typingRow.parentNode) typingRow.remove();
        if (!full) {
          renderMessage('assistant', "Non ho ricevuto risposta. Riprova tra poco oppure scrivimi su WhatsApp al +39 351 624 8936.")
            .classList.add('is-error');
        } else {
          // Detect AI marker
          const parsed = (window.AAIBackend && window.AAIBackend.handleAssistantText)
            ? window.AAIBackend.handleAssistantText(full)
            : { visible: full, ask: false };

          // Update bubble to clean text and persist clean version
          if (botBubble) botBubble.innerHTML = linkify(escapeHtml(parsed.visible));
          conversation.push({ role: 'assistant', content: parsed.visible });
          if (conversation.length > MAX_HISTORY) {
            conversation = conversation.slice(-MAX_HISTORY);
          }
          saveHistory();
          aaiLogMessage('assistant', parsed.visible);

          // Phone trigger: AI marker (primary)
          if (parsed.ask && !phoneAsked && !phoneSubmitted && !phoneDismissed) {
            showPhoneForm('ai_marker');
          } else if (!phoneAsked && !phoneSubmitted && !phoneDismissed
                     && userTurns >= PHONE_FALLBACK_TURNS) {
            // Fallback after N user turns
            showPhoneForm('rules_fallback');
          }
        }
      })
      .catch(err => {
        if (typingRow.parentNode) typingRow.remove();
        console.error('[Andrea AI]', err);
        const bubble = renderMessage('assistant', 'Connessione persa. Riprova oppure scrivimi su WhatsApp al +39 351 624 8936.');
        bubble.classList.add('is-error');
      })
      .finally(() => {
        setSendingState(false);
        if (inputEl) inputEl.focus();
      });
  }

  function resetConversation() {
    if (isStreaming) return;
    conversation = [];
    userTurns = 0;
    phoneAsked = false;
    phoneSubmitted = false;
    phoneDismissed = false;
    clearHistory();
    if (window.AAIBackend) window.AAIBackend.clearSession();
    aaiLogEvent('chat_reset');
    renderWelcome();
  }

  function showPhoneForm(trigger) {
    if (!window.AAIBackend || phoneAsked || phoneSubmitted) return;
    phoneAsked = true;
    aaiLogEvent('phone_form_shown', { trigger: trigger });
    const form = window.AAIBackend.buildPhoneForm({
      trigger: trigger,
      onSubmitted: () => {
        phoneSubmitted = true;
        // Also flag chat status to converted client-side hint (server will record actual)
      },
      onDismissed: () => { phoneDismissed = true; },
    });
    bodyEl.appendChild(form);
    scrollBottom();
  }

  function ensureManualPhoneCta() {
    if (document.getElementById('aaiManualPhone')) return;
    if (!formEl) return;
    const btn = document.createElement('button');
    btn.id = 'aaiManualPhone';
    btn.type = 'button';
    btn.className = 'aai-manual-phone';
    btn.innerHTML = '📞 Lascia il tuo numero, ti ricontatto io';
    btn.addEventListener('click', () => {
      if (phoneSubmitted) return;
      phoneAsked = false; // allow re-show on manual click
      phoneDismissed = false;
      showPhoneForm('manual_button');
    });
    formEl.parentNode.insertBefore(btn, formEl);
  }

  function showConsentGate() {
    rootEl.classList.add('is-consent-required');
    if (inputEl) inputEl.disabled = true;
    if (sendBtnEl) sendBtnEl.disabled = true;
  }

  function hideConsentGate() {
    rootEl.classList.remove('is-consent-required');
    if (inputEl) inputEl.disabled = false;
    if (sendBtnEl) sendBtnEl.disabled = false;
  }

  function openPanel() {
    rootEl.classList.add('is-open');
    rootEl.setAttribute('aria-hidden', 'false');
    aaiLogEvent('chat_open');
    if (!hasConsent()) {
      showConsentGate();
      setTimeout(() => { if (consentCheckEl) consentCheckEl.focus(); }, 250);
    } else {
      setTimeout(() => { if (inputEl) inputEl.focus(); }, 250);
      ensureManualPhoneCta();
    }
  }

  function closePanel() {
    rootEl.classList.remove('is-open');
    rootEl.setAttribute('aria-hidden', 'true');
    aaiLogEvent('chat_close');
  }

  /* ============================================
     WIRE UP EVENTS
     ============================================ */

  function wireEvents() {
    rootEl = document.getElementById('andreaAiRoot');
    panelEl = document.getElementById('aaiPanel');
    fabEl = document.getElementById('aaiFab');
    bodyEl = document.getElementById('aaiBody');
    formEl = document.getElementById('aaiForm');
    inputEl = document.getElementById('aaiInput');
    sendBtnEl = document.getElementById('aaiSend');
    resetBtnEl = document.getElementById('aaiReset');
    closeBtnEl = document.getElementById('aaiClose');
    consentGateEl = document.getElementById('aaiConsentGate');
    consentCheckEl = document.getElementById('aaiConsentCheck');
    consentBtnEl = document.getElementById('aaiConsentBtn');

    if (!rootEl || !fabEl || !panelEl) {
      console.error('[Andrea AI] Missing DOM nodes');
      return;
    }

    fabEl.addEventListener('click', openPanel);
    closeBtnEl.addEventListener('click', closePanel);
    resetBtnEl.addEventListener('click', resetConversation);

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      sendUserMessage(inputEl.value);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && rootEl.classList.contains('is-open')) {
        closePanel();
      }
    });

    // Consent gate wiring
    if (consentCheckEl && consentBtnEl) {
      consentCheckEl.addEventListener('change', () => {
        consentBtnEl.disabled = !consentCheckEl.checked;
      });
      consentBtnEl.addEventListener('click', () => {
        if (!consentCheckEl.checked) return;
        grantConsent();
        hideConsentGate();
        aaiLogEvent('consent_accept');
        // Start backend session as soon as consent is given
        if (window.AAIBackend) window.AAIBackend.ensureSession().catch(() => {});
        ensureManualPhoneCta();
        setTimeout(() => { if (inputEl) inputEl.focus(); }, 100);
      });
    }

    // Initial gate state
    if (!hasConsent()) {
      showConsentGate();
    }

    // Restore previous conversation
    conversation = loadHistory();
    rerenderHistory();
  }

  /* ============================================
     BOOTSTRAP
     ============================================ */

  function bootstrap() {
    injectCss();
    fetchAndInjectHtml()
      .then(wireEvents)
      .catch(err => console.error('[Andrea AI] bootstrap failed:', err));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
