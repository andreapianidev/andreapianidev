# Chat Conversations Admin Panel + Stats Dashboard

**Status:** approved 2026-04-26
**Owner:** Andrea Piani

## Goal

Log every Andrea AI chat conversation, capture lead phone numbers via hybrid trigger (AI marker + rules fallback + manual button), provide a PHP-based admin panel for editing/managing leads, and a Next.js dashboard on Vercel for read-only aggregate statistics. No database — JSON files only.

## Components

1. **Chat widget changes** — `assets/js/chat-widget.js` + new `assets/js/analytics.js` (loaded site-wide)
2. **PHP backend** — `/api/*.php` (write endpoints) + `/api/stats/*.php` (read endpoints, bearer-auth) + `/admin/*.php` (login + UI)
3. **Vercel dashboard** — separate Next.js 15 repo `andreapiani-stats`, password-protected, proxies to PHP via server-side bearer

## Architecture

Widget on `andreapiani.com` POSTs to PHP endpoints on same origin (no CORS). PHP writes to `/data/` (web-blocked via `.htaccess`). Vercel app reads from `/api/stats/*` via server-side proxy with bearer token (token never exposed to browser).

## Data layout (`/data/`)

```
.htaccess                       Deny from all
conversations/<date>_<sid>.json one file per session
contacts.json                   {phone: {first_seen, last_seen, sessions[], status, notes}}
index.json                      slim list for fast admin pagination
stats/daily/<date>.json         daily counters
stats/events.jsonl              raw events, 90-day retention
reminders.json                  {id, session_id, phone, due_at, note, done}
auth/users.json                 {username, password_hash, api_token}
auth/login_attempts.json        rate limit
locks/                          flock files
cron/purge.log
```

### Session schema (conversation file)

```
session_id, started_at, last_activity_at, phone, phone_collected_at,
phone_trigger (ai_marker|rules_fallback|manual_button),
page_url, referrer, user_agent, ip_hash (sha256+salt), device (mobile|desktop),
status (open|closed|converted|spam), tags[], notes,
contacted_back (bool), contacted_back_at,
messages: [{id, role, content, timestamp}]
```

## Events tracked

`page_view`, `chat_open`, `consent_accept`, `chat_start`, `phone_form_shown`,
`phone_submitted`, `phone_dismissed`, `whatsapp_click`, `chat_reset`, `chat_close`.
Each event also increments daily counters in `stats/daily/<today>.json`.

## API endpoints

**Widget (no auth, CSRF + origin check + rate limit):**
- POST `/api/start-session.php` → `{session_id, csrf_token}`
- POST `/api/log-message.php` `{session_id, role, content, csrf}`
- POST `/api/submit-phone.php` `{session_id, phone, trigger, csrf}`
- POST `/api/log-event.php` `{session_id?, event_type, payload, csrf?}`

**Stats (Bearer token, CORS allow Vercel domain):**
- GET `/api/stats/daily.php?from=&to=`
- GET `/api/stats/summary.php?days=30`

## Admin panel pages (`/admin/`)

`login.php`, `index.php` (KPI + reminders due today), `sessions.php` (filter list),
`session.php?id=` (detail + edit metadata + delete single message + CTAs +
reminder modal + WhatsApp open), `contacts.php` (per-phone view + GDPR delete-all),
`reminders.php`, `export.php` (CSV/JSON), `settings.php` (password + api_token).

## Hybrid phone trigger

1. **Primary**: system prompt instructs DeepSeek to emit `[ASK_PHONE]` marker on
   concrete interest. Widget strips marker before render and shows form.
2. **Fallback**: after 6 user turns without phone or marker.
3. **Manual**: persistent small button above chat input.

## Phone validation

Permissive regex `/^\+?\d[\d\s]{7,14}$/`. Server normalizes to E.164 (`+39…`).

## Auth

- **Admin panel**: PHP session, password hash Argon2id, HttpOnly+Secure+SameSite=Strict cookie, 5/15min rate limit.
- **Stats API**: Bearer token in `auth/users.json`, constant-time compare.
- **Vercel**: password env var, HttpOnly cookie session, server-side proxy holds the bearer (browser never sees it).

## GDPR / retention

- 12-month retention for all conversations (anonymous and identified)
- IP stored only as SHA-256 hash with secret salt (anti-spam only)
- 90-day retention for `events.jsonl`
- Cron `purge.php` weekly (token-protected URL, callable via cron-job.org)
- "Delete by phone" button in contacts page for art. 17 requests

## Concurrency

- All multi-write files use `flock(LOCK_EX)` on `/data/locks/<file>.lock`
- `atomic_update($file, $callback)` wrapper: lock → read → callback → temp write → rename

## Vercel dashboard

Next.js 15 App Router + Tailwind + Recharts.
- `/login` form, password from env
- `(auth)/page.tsx` overview (KPI cards + 30d trend)
- `(auth)/funnel` Sankey/bars
- `(auth)/pages` top 20 pages by views and chat-starts
- `api/login` sets cookie
- `api/proxy/[...path]` server-only fetch to PHP with `PHP_API_TOKEN`
- Deploy via `vercel deploy`; final domain recorded in `CLAUDE.md`

## Out of scope

- Multi-user admin (single user: Andrea)
- Email/SMS notifications (reminders are visual in panel)
- Real-time updates (polling acceptable in admin)
- I18n of admin UI (Italian only)
