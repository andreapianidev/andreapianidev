# Daily AI Summary — Design Spec

**Data:** 2026-04-26
**Stato:** Approvato dall'utente, pronto per writing-plans
**Owner:** Andrea Piani

## Obiettivo

Aggiungere al pannello admin un **riassunto giornaliero generato da AI** che analizza i dati reali del sito andreapiani.com (KPI, trend, top pagine, sources, devices, funnel, contatti, reminders) e produce un sintetico report ibrido (operativo + strategico + azioni consigliate). Il riassunto si rigenera **una sola volta al giorno** alle 07:00 Europe/Rome via cron, viene **cachato su file** e mostrato come banner full-width sopra le KPI cards in dashboard. È prevista una rigenerazione manuale on-demand protetta da dialog di conferma.

## Vincoli e principi

- **1 chiamata DeepSeek al giorno** in regime normale. Niente API call ad ogni refresh dashboard.
- **DeepSeek key**: stessa chiave usata da `chat-widget.js` e `admin/bot.php`, già disponibile via `aai_deepseek_key()` in `sito-web/lib/deepseek.php` (env `AAI_DEEPSEEK_KEY` con fallback XOR-deobfuscation).
- **No nuove dipendenze server**: solo PHP + JSON file storage, coerente con il resto del backend AAI.
- **No build step** per il frontend: CSS/JS nativi.
- **GDPR-friendly**: nessun dato nuovo persistito oltre quello già raccolto. Il file `daily-summary/<date>.json` contiene solo aggregati e il testo AI.
- **Errori sempre notificati** all'utente via popup in dashboard (non solo log silenzioso).

## Architettura

```
07:00 Europe/Rome
        │
        ▼
cron-job.org ──GET──▶ /api/cron/daily-summary.php?token=AAI_CRON_TOKEN
                              │
                              ├─▶ acquisisce lock (data/locks/daily-summary.lock)
                              ├─▶ raccoglie dump dati (admin/lib/daily-summary.php → collect)
                              ├─▶ chiama DeepSeek (lib/deepseek.php)
                              ├─▶ valida JSON output
                              ├─▶ salva data/stats/daily-summary/<YYYY-MM-DD>.json (atomic via flock+rename)
                              └─▶ in caso di errore: log evento + scrive data/stats/daily-summary/last-error.json

Admin apre dashboard
        │
        ▼
admin/index.php ──legge──▶ data/stats/daily-summary/<oggi>.json (cached)
                              │
                              ├─▶ se manca: legge ultimo disponibile + badge "stale"
                              ├─▶ se manca anche quello: mostra placeholder + bottone "Genera ora"
                              └─▶ se last-error.json è recente (< 24h): popup errore

Refresh manuale
        │
        ▼
[↻ Aggiorna] → confirm dialog → POST /admin/api/refresh-summary.php (CSRF)
                              │
                              ├─▶ verifica sessione admin + CSRF
                              ├─▶ acquisisce lock (skip se già in corso)
                              ├─▶ rigenera file giorno corrente
                              └─▶ ritorna nuovo JSON al frontend → re-render banner
```

### Fallback automatico

Se l'admin apre la dashboard dopo le 09:00 e il file del giorno corrente manca (cron-job.org down, errore di rete temporaneo), il primo accesso triggera **una sola volta** la generazione automatica via lock-file. Successivi refresh leggono solo il file cachato.

## File nuovi

| Path | Ruolo |
|------|-------|
| `sito-web/api/cron/daily-summary.php` | Endpoint pubblico token-protetto, chiamato da cron-job.org alle 07:00 |
| `sito-web/admin/api/refresh-summary.php` | Endpoint admin CSRF-protetto per refresh manuale |
| `sito-web/admin/lib/daily-summary.php` | Helper: `aai_summary_collect_data()`, `aai_summary_generate()`, `aai_summary_load($date)`, `aai_summary_save($date, $payload)`, `aai_summary_acquire_lock()`, `aai_summary_log_error($msg)` |
| `sito-web/data/stats/daily-summary/<YYYY-MM-DD>.json` | File cached giornalieri (retention 90 giorni, gestita da purge esistente) |
| `sito-web/data/stats/daily-summary/last-error.json` | Ultimo errore generazione (per popup notifica) |
| `sito-web/data/locks/daily-summary.lock` | Lock concorrenza |

## File modificati

| Path | Modifica |
|------|----------|
| `sito-web/admin/index.php` | Render banner full-width sopra KPI cards. Carica payload via PHP server-side (no fetch iniziale) |
| `sito-web/admin/assets/admin.css` | Stile banner AI: gradiente viola/blu, badge AI pulsante, sezioni collapse |
| `sito-web/admin/assets/admin.js` | Logica refresh: confirm dialog, POST, re-render, gestione popup errore |
| `sito-web/api/cron/purge.php` | Estendere purge per cancellare file `daily-summary/<date>.json` più vecchi di 90 giorni |

## Schema JSON output

`data/stats/daily-summary/<YYYY-MM-DD>.json`:

```json
{
  "schema_version": 1,
  "generated_at": "2026-04-26T07:00:12+02:00",
  "date": "2026-04-26",
  "model": "deepseek-chat",
  "tokens_used": { "prompt": 3812, "completion": 709, "total": 4521 },
  "data_snapshot": {
    "yesterday": { "visits": 21, "chats_opened": 3, "chats_started": 1, "phones": 1, "wa_clicks": 1 },
    "vs_day_before": { "visits_delta_pct": 12.5, "chats_delta_pct": 0 },
    "last_7_days": { "visits": 142, "chats": 18, "phones": 4 },
    "last_7_vs_prev_7": { "visits_delta_pct": 8.3, "phones_delta_pct": 33.0 },
    "last_30_days": { "visits": 612, "chats": 71, "phones": 14 },
    "top_pages_7d": [ { "url": "/sviluppo-app-ios.html", "visits": 34 }, ... ],
    "sources_7d": [ { "source": "google", "visits": 78 }, ... ],
    "devices_7d": { "mobile_pct": 64, "desktop_pct": 33, "tablet_pct": 3 },
    "hourly_distribution_7d": [ ... 24 valori ... ],
    "funnel_7d": { "visits": 142, "chats_opened": 22, "consents": 19, "chats_started": 18, "phones": 4, "wa_clicks": 6 },
    "new_contacts_yesterday": 1,
    "reminders_due_today": 2,
    "reminders_overdue": 0
  },
  "summary": {
    "headline": "Lead in crescita, top page iOS in salita",
    "operativo": "Ieri 21 visite (+12% vs giorno prima), 3 chat aperte di cui 1 avviata e 1 telefono raccolto. 1 click WhatsApp.",
    "trend": "Settimana a 142 visite (+8% vs precedente). Telefoni raccolti +33%. Pagina sviluppo-app-ios.html in cima per traffico organico google.",
    "azioni": [
      "Pubblica un caso studio iOS — la pagina è la più cliccata della settimana",
      "Richiama il lead +393XX dell'altro ieri, ancora senza risposta in reminders",
      "Verifica perché il funnel chats_started→phones è sotto il 25%"
    ]
  }
}
```

`data/stats/daily-summary/last-error.json` (solo se l'ultima generazione è fallita):

```json
{
  "occurred_at": "2026-04-26T07:00:14+02:00",
  "trigger": "cron",
  "error": "DeepSeek API timeout (30s)",
  "http_status": null,
  "acknowledged": false
}
```

Quando l'admin apre dashboard e `last-error.json` esiste con `acknowledged: false`, viene mostrato un toast/popup. Click "Ok" → `PATCH /admin/api/refresh-summary.php?ack=1` setta `acknowledged: true`.

## Prompt DeepSeek

**System:**

```
Sei l'analyst dati di Andrea Piani, freelance developer. Ricevi un dump JSON con statistiche giornaliere e settimanali del sito andreapiani.com.

Genera un riassunto in italiano, tono professionale e diretto, focalizzato su insight azionabili.

Output: JSON con questi campi esatti:
- "headline": string max 60 caratteri, sintesi della giornata
- "operativo": string 2-3 frasi su cosa è successo ieri (numeri concreti, delta vs giorno prima)
- "trend": string 2-3 frasi su andamento ultimi 7gg vs settimana precedente, top pagine in crescita/calo
- "azioni": array di 1-3 stringhe, ogni elemento è un'azione concreta basata sui dati (es. "Richiama lead X", "Pubblica caso studio Y", "Investiga calo pagina Z")

Non inventare dati. Se i numeri sono zero o troppo bassi per insight statistici, dillo esplicitamente nelle azioni (es. "Traffico ancora basso, push promozione su LinkedIn").
```

**User:** dump JSON completo `data_snapshot`.

**Parametri DeepSeek:**
- `model: "deepseek-chat"`
- `response_format: {"type": "json_object"}`
- `temperature: 0.4` (creativo ma stabile)
- `max_tokens: 800`

## Banner UI

**Layout:**

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✨ AI                Lead in crescita, top page iOS in salita        ↻│
│  ─────────────────────────────────────────────────────────────────────  │
│  ▸ OPERATIVO   Ieri 21 visite (+12%), 3 chat aperte, 1 telefono...    │
│  ▸ TREND       Settimana 142 visite (+8%). Telefoni +33%. Top: iOS... │
│  ▸ AZIONI                                                               │
│      • Pubblica un caso studio iOS                                      │
│      • Richiama il lead +393XX                                          │
│      • Verifica funnel chats_started→phones                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  Generato 07:00 · DeepSeek · ultima rigenerazione: 12 ore fa            │
└────────────────────────────────────────────────────────────────────────┘
```

**Stili (`admin.css`):**
- Banner full-width, gradiente `linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #1e293b 100%)`, bordo top 2px gradient animato
- Badge "AI" con sparkle SVG, pulse animation lieve (2s loop, opacity 0.85↔1)
- Headline 1.5rem, font-weight 600, color white
- Sezioni: tre subsection con icona `▸` rotante 90° quando aperto. Default: tutte aperte (no collapse iniziale, l'admin vede tutto subito).
- Footer: small, opacity 0.7, bottone refresh circolare 32px, hover rotate 180°
- Responsive: su mobile sezioni stack verticali, padding ridotto

**JS (`admin.js`):**
- `refreshDailySummary()`:
  1. `confirm("Generare nuovo riassunto AI? Costa 1 chiamata API.")` → se cancel, return
  2. Disabilita bottone, mostra spinner
  3. `fetch('/admin/api/refresh-summary.php', { method: 'POST', headers: { 'X-CSRF-Token': csrf } })`
  4. Successo: re-render banner con nuovo payload, toast "Riassunto aggiornato"
  5. Errore: popup `alert('Errore generazione riassunto: ' + msg)` (coerente con pattern esistente, vedi admin.js:115)
- `dismissSummaryError()`: chiama endpoint con `?ack=1` per marcare errore come visto

## Sicurezza

- `api/cron/daily-summary.php`: token-only via query param, `hash_equals()` con `AAI_CRON_TOKEN`. Stesso pattern di `api/cron/purge.php`.
- `admin/api/refresh-summary.php`: richiede `aai_admin_require_login()` + CSRF token (header `X-CSRF-Token` validato contro sessione admin).
- Lock file (`data/locks/daily-summary.lock`) con `flock(LOCK_EX | LOCK_NB)`. Se occupato, l'endpoint manuale ritorna 409 Conflict. Cron in caso di lock occupato logga e termina (probabile stuck precedente).
- Timeout DeepSeek: 30 secondi. Oltre → errore registrato.
- Validazione output: il JSON tornato da DeepSeek deve avere i 4 campi `headline`/`operativo`/`trend`/`azioni`. Se manca uno → errore.
- Retention: file più vecchi di 90 giorni cancellati dal cron purge esistente.

## Gestione errori e notifiche popup

| Scenario | Comportamento |
|----------|---------------|
| Cron fallisce (timeout, key invalida, rete) | Scrive `last-error.json`. Mantiene file giorno precedente. Admin in dashboard vede toast errore + banner stale |
| Refresh manuale fallisce | Popup `alert()` immediato con messaggio errore. File precedente preservato |
| Output DeepSeek non valido (JSON malformato, campi mancanti) | Trattato come errore generazione. `last-error.json` aggiornato |
| Lock occupato durante refresh manuale | Popup "Generazione già in corso, riprova tra qualche secondo" |
| File giorno corrente E precedente entrambi mancanti (primo deploy) | Banner placeholder "Nessun riassunto disponibile" + bottone "Genera ora" |

Tutti gli errori loggano anche in `data/stats/events.jsonl` con `type: "summary_error"` per audit.

## Setup operativo

**One-time:**

1. Aggiungere job su cron-job.org:
   - URL: `https://www.andreapiani.com/api/cron/daily-summary.php?token=<AAI_CRON_TOKEN>`
   - Schedule: `0 7 * * *` Europe/Rome
   - Method: GET
   - Timeout: 60s

2. Verificare permessi cartella `data/stats/daily-summary/` (creata automaticamente al primo run con 0755).

**No nuove env var**: `AAI_CRON_TOKEN` e `AAI_DEEPSEEK_KEY` già configurate.

## Costo stimato

- 1 chiamata/giorno × ~4500 token (prompt + completion) ≈ 30 chiamate/mese
- DeepSeek pricing → < $0.05/mese
- Refresh manuali rari (admin solo, conferma esplicita) → costo trascurabile

## Test plan

- [ ] Cron endpoint chiamato senza token → 403
- [ ] Cron endpoint chiamato con token sbagliato → 403
- [ ] Cron endpoint chiamato con token valido → 200, file generato
- [ ] Doppia chiamata cron simultanea → seconda esce per lock
- [ ] DeepSeek key invalida → `last-error.json` scritto, file precedente preservato
- [ ] DeepSeek timeout → idem
- [ ] Output JSON malformato → idem
- [ ] Refresh manuale senza CSRF → 403
- [ ] Refresh manuale senza sessione admin → redirect login
- [ ] Refresh manuale con file corrente esistente → sovrascrive
- [ ] Banner mostra dati corretti con file presente
- [ ] Banner mostra fallback "stale" con solo file precedente
- [ ] Banner mostra placeholder con nessun file
- [ ] Popup errore mostrato quando `last-error.json` non acked
- [ ] Click "ok" su popup → `acknowledged: true`
- [ ] Mobile: banner stack verticale leggibile

## Out of scope (esplicito)

- **Multi-tenancy**: solo un admin (`andrea`), nessun bisogno di summary per-utente.
- **Storico riassunti UI**: i file restano 90gg ma non c'è (per ora) una pagina che li elenca. Si può aggiungere in futuro.
- **Notifiche email/push** quando il summary è pronto: l'admin lo vede al prossimo accesso dashboard, sufficiente.
- **A/B prompt**: prompt fisso, eventuale tuning manuale futuro modificando `admin/lib/daily-summary.php`.
- **Internazionalizzazione**: solo italiano, stesso target del pannello admin.
