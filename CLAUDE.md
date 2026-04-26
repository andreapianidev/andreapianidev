# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **static HTML/CSS/JavaScript portfolio website** for Andrea Piani, a freelance developer specializing in iOS/Android app development, Python automation, CRM systems, and PrestaShop e-commerce services. The site is built with **Mobirise**, uses **Bootstrap 5**, and serves primarily **Italian-speaking clients** with some English support.

## Site Architecture

### Technology Stack
- **Framework**: Mobirise (static site builder)
- **CSS Framework**: Bootstrap 5.x
- **JavaScript**: Vanilla JS (no frameworks)
- **Icons**: Mobirise Icons 2 + Mobirise Icons Bold + Socicon
- **Fonts**: Google Fonts (Source Code Pro, Jost)

### Repo layout (workspace vs deploy)

```
andreapiani.com/                          ← workspace di sviluppo
│
├── sito-web/                             ← TUTTO ciò che va sul server PHP (andreapiani.com)
│   │                                       Quando deployi: carichi l'INTERO contenuto
│   │                                       di questa cartella sul server (in root web).
│   │
│   ├── index.html, indexen.html, ...    Pagine HTML (38+ files)
│   ├── chat-widget.html, popup-menu.html, navbar-template.html, footer-gdpr.html  Frammenti
│   ├── assets/                          Bootstrap, theme, css, js, images, web/assets
│   ├── lib/                             PHP helpers (config, storage, auth, csrf, ratelimit, util, setup)
│   ├── api/                             Endpoints (start-session, log-message, log-event, submit-phone, stats/, cron/)
│   ├── admin/                           PHP admin panel (login, sessions, contacts, reminders, export, settings)
│   ├── data/                            JSON storage (web-blocked via own .htaccess)
│   ├── pyprestascanimages/              Immagini di prodotto
│   ├── *.png                            Screenshots prodotti (autoclicker, bcs, talky, ecc.)
│   ├── animations.{css,js}, dark-mode.{css,js}, utilities.{css,js},
│   │   performance.js, cookie-consent.js, navbar-fix.{css,js}    Custom features
│   ├── sitemap.xml, robots.txt, google98e9eefca6d4b4b3.html    SEO + Search Console
│   ├── .htaccess                        HTTPS+www redirect, RewriteRule per Authorization, SetEnv AAI_*
│   └── setup-web.php                    One-shot installer (visit once, then renames itself)
│
├── docs/superpowers/specs/               ← Spec/design docs (dev-only, NON va sul server)
├── CLAUDE.md                             ← Questo file (dev docs)
├── *.md, README_ANALYSIS.txt             ← Documentation (dev-only)
├── *.sh                                  ← Build scripts (dev-only)
│   ├── inject-backend-scripts.sh        Patcha gli HTML in sito-web/ aggiungendo i tag dei backend script
│   ├── update-all-pages.sh, add-servizi-link.sh, remove-old-popups.sh
├── project.mobirise                      ← Mobirise project file (locale, NON va sul server)
├── .aai-credentials.json                 ← GITIGNORED — segreti generati una volta
├── *.bak, *.backup                       ← Backup orfani da operazioni passate (puoi cancellare)
└── .gitignore
```

**Workflow di deploy:**
- Carica TUTTO il contenuto di `sito-web/` sul server `andreapiani.com` (FTP/cPanel). Sostituisci i file esistenti. Niente altri deploy o servizi.
├── sitemap.xml - SEO sitemap
├── robots.txt - Search engine directives
└── .htaccess - Server configuration
```

## ⚠️ IMPORTANT: Local Development & Testing

### Running a Local HTTP Server

**CRITICAL**: This site uses JavaScript `fetch()` to load `popup-menu.html` dynamically. The popup menu **WILL NOT WORK** if you open HTML files directly in the browser (`file://` protocol) due to CORS security restrictions.

**You MUST use a local HTTP server for testing:**

```bash
# Navigate to the site directory
cd /path/to/andreapiani.com

# Start Python HTTP server on port 8000
python3 -m http.server 8000

# Access the site at:
# http://localhost:8000/index.html
# http://localhost:8000/sviluppo-nodejs.html
# etc.
```

**To stop the server:**
```bash
# Press Ctrl+C in the terminal, or:
pkill -f "http.server 8000"
```

**Alternative servers:**
```bash
# Using Node.js (if installed)
npx serve -p 8000

# Using PHP (if installed)
php -S localhost:8000
```

### Why This Is Required

- **popup-loader.js** uses `fetch('popup-menu.html')` to load the menu dynamically
- Browsers block `fetch()` requests on `file://` protocol (CORS policy)
- **Error you'll see without HTTP server**: "Cross origin requests are only supported for HTTP"
- **Solution**: Always test via HTTP server (http://localhost:8000)

### Popup Menu System Location

**IMPORTANT**: The popup menu CSS styles are located in **`navbar-fix.css`**, NOT in a separate file!

- ✅ **Popup CSS**: `navbar-fix.css` (lines with `.servizi-popup-*` classes)
- ✅ **Popup HTML**: `popup-menu.html` (loaded dynamically)
- ✅ **Popup JS**: `assets/js/popup-loader.js` (loader script)
- ❌ **DO NOT create**: `assets/css/popup-menu.css` (will conflict with navbar-fix.css)

If the popup doesn't work, check:
1. Is `navbar-fix.css` included in the page?
2. Is `assets/js/popup-loader.js` included before `</body>`?
3. Are you testing via HTTP server (not `file://`)?
4. Does `popup-menu.html` exist in the root directory?

## Critical Systems

### 1. Centralized Popup Menu System
**Files**: `popup-menu.html`, `assets/css/popup-menu.css`, `assets/js/popup-loader.js`

**How it works**:
- The services menu is stored in ONE central file (`popup-menu.html`)
- `popup-loader.js` dynamically loads and injects it into every page
- Every page includes these in `<head>` and before `</body>`:
  ```html
  <link rel="stylesheet" href="assets/css/popup-menu.css">
  <script src="assets/js/popup-loader.js"></script>
  ```
- Navbar link triggers: `<a href="#" onclick="openServiziPopup()">Servizi ▾</a>`

**To modify the menu**: Edit ONLY `popup-menu.html` - changes appear on ALL pages automatically.

**Popup Categories**:
1. 📱 Sviluppo App Mobile (iOS, Android, Mobile)
2. 🌐 Web App & Cloud (React, PWA, Native vs Cross-platform, MVP, Store Publishing)
3. 💻 Development & Automation (Python, Trading Bots)
4. 💼 Soluzioni Business (Gestionali, Perfex CRM, React Web Apps)
5. 🛒 PrestaShop (Services, Product Management, Migration, Security, SQL Editor)

### 2. SEO Structure (Consistent Across All Pages)

Every service page follows this pattern:
```html
<!-- Meta tags -->
<meta name="description" content="...">
<meta name="keywords" content="...">
<meta name="robots" content="index, follow, max-image-preview:large">

<!-- Open Graph -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
<meta property="og:url" content="...">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">
<meta name="twitter:description" content="...">

<!-- Canonical -->
<link rel="canonical" href="https://www.andreapiani.com/[page].html" />

<!-- Hreflang for multi-language -->
<link rel="alternate" hreflang="it" href="..." />
<link rel="alternate" hreflang="en" href="..." />

<!-- Schema.org markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service" | "ProfessionalService",
  "serviceType": "...",
  "provider": {
    "@type": "Person",
    "name": "Andrea Piani",
    "jobTitle": "...",
    "email": "andreapiani.dev@gmail.com",
    "telephone": "+393516248936"
  }
}
</script>
```

**Common Schema types used**:
- `ProfessionalService` (homepage & service pages)
- `Service` (individual service pages)
- `BreadcrumbList` (navigation hierarchy)
- `FAQPage` (Q&A sections)
- `OfferCatalog` (service offerings)

### 3. Custom Features System

The site has a modular custom features system documented in:
- `QUICK-START.md` - Integration guide
- `FEATURES-IMPLEMENTED.md` - Comprehensive feature list
- `ANIMATIONS-GUIDE.md` - Animation documentation
- `POPUP-SYSTEM-README.md` - Popup system docs

**Key Features**:
- **Toast Notifications**: `Toast.success()`, `Toast.error()`, `Toast.warning()`, `Toast.info()`
- **Modal System**: `Modal.create(content)`
- **WhatsApp Floating Button**: Auto-initialized with link to +393516248936
- **Dark Mode Toggle**: `DarkMode.enable()`, `DarkMode.disable()`, `DarkMode.toggle()`
- **Scroll to Top Button**: Auto-appears on scroll
- **Ripple Effects**: Auto-applied to buttons
- **Form Validation**: `AppUtils.validateForm(form)`
- **Copy to Clipboard**: `AppUtils.copyToClipboard(text)`
- **Event Tracking**: `AppUtils.trackEvent(category, action, label)`

### 4. Animation System

**Files**: `animations.css`, `animations.js`

**Available classes**:
- Entry: `animate-fadeInUp`, `animate-fadeIn`, `animate-scaleIn`, `animate-slideInLeft/Right`, `animate-bounceIn`
- Continuous: `icon-pulse`, `glow-animate`, `float-animate`, `gradient-animate`
- Hover: `btn-animate`, `card-animate`, `link-animate`
- Scroll: `scroll-animate` (triggers when element enters viewport)
- Delay: `animate-delay-1`, `animate-delay-2`, `animate-delay-3`
- Stagger: `stagger-animate` (sequential animations for children)

**Auto-applied**: Buttons and cards automatically get hover animations when page loads.

## Andrea AI Admin Panel (PHP backend)

Logging and lead management system for the Andrea AI chat widget. Stores all
conversations, captures phone numbers via hybrid trigger (AI marker + 6-turn
rules fallback + manual button), and lets Andrea manage leads from a PHP admin UI.

**Storage:** plain JSON files (no DB) under `/data/` (web-blocked by `.htaccess`).
Atomic writes via `flock` + temp file + `rename`. See `lib/storage.php`.

### Components (tutti dentro `sito-web/`)

```
sito-web/lib/                       Shared helpers (config, storage, util, csrf, ratelimit, auth, setup)
sito-web/api/                       Public widget endpoints
  start-session.php                   (widget: open new chat session, returns session_id + csrf_token)
  log-message.php                     (widget: append message)
  submit-phone.php                    (widget: capture phone, normalizes to E.164)
  log-event.php                       (widget + analytics.js: track events)
  cron/purge.php?token=...            (token-protected: 12-month conv retention, 90-day events)
sito-web/admin/                     PHP UI (login, dashboard, sessions, session detail, contacts, reminders, export, settings)
sito-web/data/                      Storage (NOT web-accessible — protected by data/.htaccess)
  conversations/<date>_<sid>.json
  contacts.json, index.json, reminders.json, csrf.json, ratelimit.json
  stats/daily/<date>.json, stats/events.jsonl
  auth/users.json (password_hash + api_token), auth/login_attempts.json
  locks/                                  flock files
sito-web/assets/js/chat-backend.js  Browser-side bridge: ensureSession, logMessage, logEvent, submitPhone, phone form UI
sito-web/assets/js/analytics.js     Site-wide page_view + whatsapp_click tracking (loaded on every page)
inject-backend-scripts.sh           (in root) Idempotent script to add backend+analytics tags to all pages in sito-web/
```

### Admin URLs (after deploy on www.andreapiani.com)

- Login: `/admin/login.php`
- Dashboard (KPI + reminders due today): `/admin/index.php`
- Conversations list (filters): `/admin/sessions.php`
- Conversation detail (CTAs: WhatsApp, call, copy, reminder, export, delete): `/admin/session.php?id=<sid>`
- Contacts (per-phone view + GDPR delete-all): `/admin/contacts.php`
- Reminders (today/overdue/done): `/admin/reminders.php`
- Export JSON/CSV (filtered): `/admin/export.php`
- Settings (password, api_token rotate, manual purge): `/admin/settings.php`

### One-time setup (server)

```bash
# 1. Generate IP salt and cron token (write into .env or webserver env vars)
php -r "echo 'AAI_IP_SALT=' . bin2hex(random_bytes(32)) . PHP_EOL;"
php -r "echo 'AAI_CRON_TOKEN=' . bin2hex(random_bytes(24)) . PHP_EOL;"

# 2. Create the first admin user (creates data/auth/users.json + api_token)
php lib/setup.php <username> <password>   # password min 12 chars

# 3. Schedule the weekly purge cron
# Configure cron-job.org or server crontab to GET:
#   https://www.andreapiani.com/api/cron/purge.php?token=<AAI_CRON_TOKEN>
```

### Security model

- **Widget → backend** (write): origin check (`Origin/Referer` must start with `https://www.andreapiani.com`),
  per-session CSRF token (created at start-session), rate limits (30 msgs/min per session, 10 new sessions/min per IP).
- **Admin panel**: PHP session, Argon2id password hash, `HttpOnly + Secure + SameSite=Strict` cookie,
  5/15min login throttling per IP.
- **Stats API**: Bearer token in `Authorization` header, constant-time compare via `hash_equals`.
- **IP privacy**: stored only as `sha256(salt + ip)`; raw IP never persisted (anti-spam only, GDPR-friendly).
- **Retention**: conversations kept 12 months, events 90 days; purge runs weekly via cron.

### Hybrid phone trigger flow

The widget integrates with the backend through `assets/js/chat-backend.js`:
1. **Primary** — DeepSeek system prompt (in `assets/js/chat-widget.js`) instructs the model
   to emit `[ASK_PHONE]` at the end of replies when interest is concrete. The widget strips
   the marker before render and shows the phone form inline.
2. **Fallback** — after 6 user turns without phone or marker, the form is shown automatically.
3. **Manual** — a small CTA "📞 Lascia il tuo numero" sits above the input at all times.

The `phone_trigger` field (`ai_marker | rules_fallback | manual_button`) is stored on the
session so we can later A/B which trigger converts best.

### AI Analyst (admin bot, `/admin/bot.php`)

Bot conversazionale powered by DeepSeek con accesso reale ai dati raccolti. Risponde a domande su statistiche, conversazioni, contatti, promemoria. Usa OpenAI-compatible function calling (12 tool functions) per recuperare dati invece di inventare.

**File principali:**
- `sito-web/lib/deepseek.php` — client API. Chiave letta da env `AAI_DEEPSEEK_KEY`, fallback alla deobfuscazione XOR di `chat-widget.js` (stessa chiave del frontend, single source of truth).
- `sito-web/admin/lib/bot-tools.php` — schemi tool + handler che leggono `data/stats/`, `data/conversations/`, `data/index.json`, `data/contacts.json`, `data/reminders.json`.
- `sito-web/admin/api/ask-bot.php` — endpoint POST con loop tool-calling (max 6 iterazioni). CSRF protetto.
- `sito-web/admin/bot.php` — UI chat full-page (dark luxe, coerente col resto admin).
- `sito-web/admin/assets/bot-widget.{css,js}` — floating widget bottom-left, presente in tutte le pagine admin autenticate (iniettato da `layout.php` footer). Bot.php sopprime il widget via `$GLOBALS['_aaiHideBotWidget'] = true`.
- `sito-web/data/admin-bot/<username>.json` — cronologia persistente per utente (max 20 turn).

**Tool disponibili al bot:**
`get_overview`, `get_trend`, `get_top_pages`, `get_traffic_sources`, `get_devices`, `get_hourly_distribution`, `get_recent_sessions`, `get_session_detail`, `search_sessions`, `get_contacts`, `get_reminders`, `get_funnel`.

**Per aggiungere un nuovo tool:** appendi schema in `aai_bot_tool_schemas()` e case in `aai_bot_dispatch_tool()` di `admin/lib/bot-tools.php`.

**Costo stimato:** ~1.4k prompt token per chiamata (schema tool) + dati. DeepSeek pricing → frazioni di centesimo per chat tipica. Rotazione chiave: cambia il payload XOR in `chat-widget.js:36` (frontend e admin la prendono entrambi da lì).

### Statistiche (pagina admin `/admin/stats.php`)

Pagina aggregata che legge `data/stats/daily/<date>.json`:
- KPI 7/30/90 giorni: visite, chat aperte/avviate, telefoni, click WhatsApp, % mobile
- Trend chart (Chart.js da CDN, no build step) con 4 serie: visite / chat / telefoni / WA
- Funnel verticale a barre: visite → chat aperte → consenso → chat avviate → telefoni → click WA
- Top pagine (top 20 per visite)

Nessun servizio esterno (Google Analytics, ecc.). Tutto on-prem.

### Server-side env vars (PHP backend on andreapiani.com)

Configurati nel `.htaccess` di `sito-web/`:

```apache
SetEnv AAI_IP_SALT "5462cba8c9fa2c314d103464e738b6a4667bcab25cb78d0cd4a15766be94be93"
SetEnv AAI_CRON_TOKEN "e3ad3a2429c7e08f8889682f1bfe39e4080766acf77f704b"
```

### Cron purge (weekly retention)

Configura su cron-job.org (free) → GET, settimanale:
```
https://www.andreapiani.com/api/cron/purge.php?token=e3ad3a2429c7e08f8889682f1bfe39e4080766acf77f704b
```

### Login credentials

| Service | URL | Username / Password |
|---------|-----|---------------------|
| Admin PHP panel | https://www.andreapiani.com/admin/login.php | `andrea` · `TK8ChMMpGK5gfWt` |

(cambia password dal pannello → Impostazioni)

### One-shot server setup (already done)

Il repo contiene `sito-web/setup-web.php` (rinominato in `setup-web.done.php` dopo il primo run). Il setup è **già stato eseguito** in produzione: utente `andrea` creato in `data/auth/users.json`. Non serve rifarlo.

Per ricreare un utente admin in futuro, da SSH del server:
```bash
php sito-web/lib/setup.php <username> <password>
```

### Local credential file

Tutti i segreti sono in `.aai-credentials.json` (gitignored). Trattalo come sensibile — password manager consigliato.

## Development Workflows

### Adding a New Service Page

1. **Create HTML file**: Use existing service page as template (e.g., `sviluppo-app-ios.html`)
2. **Required sections**:
   - Complete `<head>` with meta tags, OG tags, Schema.org markup
   - Navbar with "Servizi ▾" link: `onclick="openServiziPopup()"`
   - Hero section with value proposition
   - Features/benefits section
   - Use cases or case studies
   - FAQ section (with Schema.org FAQPage markup)
   - CTA to `preventivo-app.html`
3. **Include required CSS** (in `<head>`):
   ```html
   <link rel="stylesheet" href="assets/bootstrap/css/bootstrap.min.css">
   <link rel="stylesheet" href="assets/theme/css/style.css">
   <link rel="stylesheet" href="assets/css/popup-menu.css">
   <link rel="stylesheet" href="navbar-fix.css">
   <link rel="stylesheet" href="animations.css">
   <link rel="stylesheet" href="utilities.css">
   <link rel="stylesheet" href="dark-mode.css">
   ```
4. **Include required JS** (before `</body>`):
   ```html
   <script src="assets/bootstrap/js/bootstrap.bundle.min.js"></script>
   <script src="assets/theme/js/script.js"></script>
   <script src="assets/js/popup-loader.js"></script>
   <script src="animations.js"></script>
   <script src="utilities.js"></script>
   <script src="dark-mode.js"></script>
   <script src="performance.js"></script>
   <script src="cookie-consent.js"></script>
   <!-- Andrea AI Chat Widget (optional but recommended) -->
   <script src="assets/js/chat-backend.js" defer data-aai-backend="1"></script>
   <script src="assets/js/chat-widget.js" defer data-aai-js="1"></script>
   <!-- Site-wide analytics (always include, even on pages without the widget) -->
   <script src="assets/js/analytics.js" defer data-aai-analytics="1"></script>
   ```
   Or just run `./inject-backend-scripts.sh` after creating the page — it patches all HTML files idempotently.
5. **Update `popup-menu.html`**: Add link to new service in appropriate category
6. **Update `sitemap.xml`**: Add new URL with appropriate priority and changefreq
7. **Test**: Verify popup menu, dark mode, animations, mobile responsiveness

### Modifying the Navigation Menu

**ONLY edit `popup-menu.html`** - changes propagate to all pages automatically.

Structure:
```html
<div class="popup-section">
    <h4>📦 Category Title</h4>
    <ul>
        <li><a href="page.html">Service Name</a></li>
    </ul>
</div>
```

### Updating Site-Wide Features

**Navbar customization**: Edit `navbar-fix.css` and `navbar-fix.js` (if exists)
**Animations**: Edit `animations.css` (keyframes) and `animations.js` (triggers)
**Utility functions**: Edit `utilities.js` (global functions)
**Dark mode**: Edit `dark-mode.css` (styles) and `dark-mode.js` (toggle logic)
**Performance**: Edit `performance.js` (lazy loading, font preloading, etc.)

### Batch Updates to All Pages

Use the provided shell scripts:
- `update-all-pages.sh` - Updates all pages with centralized popup system
- `add-servizi-link.sh` - Adds "Servizi" link to navbars
- `remove-old-popups.sh` - Removes old inline popups

**Important**: These scripts create `.backup` files. Review changes before deleting backups.

## Common Patterns & Conventions

### File Naming
- Italian service pages: `[service-name].html` (e.g., `sviluppo-app-ios.html`)
- English versions: `[service-name]-en.html` (e.g., `privacy-policy-en.html`)
- Use hyphens, lowercase, SEO-friendly URLs
- No dates or version numbers in URLs

### Content Structure
- **Mobile-first responsive design**
- **Bootstrap grid system**: Use `.container`, `.row`, `.col-md-*`
- **Section spacing**: Bootstrap utility classes (`.mb-5`, `.py-5`, etc.)
- **CTA buttons**: Link to `preventivo-app.html` or WhatsApp (`https://wa.me/393516248936`)
- **Icons**: Use emoji or Mobirise icon classes

### Colors & Branding
- Primary CTA color: Typically blue/purple gradient
- Dark navbar: `#000000` background
- Dark mode support via `dark-mode.css`
- Professional, clean design aesthetic

### Italian Language Conventions
- Primary audience is Italian-speaking
- Use formal tone ("Lei" form) for business content
- Common terms:
  - "Sviluppo App" = App Development
  - "Preventivo" = Quote/Estimate
  - "Servizi" = Services
  - "Progetti" = Projects

## Performance & SEO Best Practices

- **Lazy loading**: Images use `IntersectionObserver` (handled by `performance.js`)
- **Font preloading**: Google Fonts with `font-display: swap`
- **Canonical URLs**: Always include on every page
- **Schema.org markup**: Required for all service pages
- **Mobile optimization**: Test all pages on mobile devices
- **Sitemap**: Update `sitemap.xml` when adding/removing pages
- **Robots.txt**: Already configured for search engines

## Contact Information (For Schema & Content)

- **Name**: Andrea Piani
- **Email**: andreapiani.dev@gmail.com
- **Phone**: +393516248936
- **WhatsApp**: +393516248936
- **Location**: Udine, Italy (33100)
- **Website**: https://www.andreapiani.com

## Key Service Categories

1. **Mobile Development**: iOS (Swift/SwiftUI), Android (Kotlin), Cross-platform
2. **Python Development**: Bots, automation, web scraping, Django, Flask, FastAPI, backend
3. **Business Solutions**: Perfex CRM, custom management systems (gestionali)
4. **E-commerce**: PrestaShop services (migration, security, customization)
5. **Web Development**: React, PWA, web apps
6. **Trading**: MT4/MT5 trading bots

## Testing Checklist for New/Modified Pages

- [ ] Meta tags complete (description, keywords, OG, Twitter)
- [ ] Schema.org markup included and validated
- [ ] Canonical URL set correctly
- [ ] Navbar includes "Servizi ▾" link with `openServiziPopup()` function
- [ ] All custom CSS/JS files included
- [ ] Popup menu loads and displays correctly
- [ ] Dark mode toggle works
- [ ] Animations trigger on scroll
- [ ] WhatsApp button appears
- [ ] Mobile responsive (test on small screens)
- [ ] Links work (internal navigation, CTA to preventivo)
- [ ] Forms validate correctly (if present)
- [ ] Cookie consent banner appears on first visit
- [ ] Page listed in `sitemap.xml`
- [ ] Hreflang tags if multi-language version exists

## Important Notes

- **Never commit directly to production**: This appears to be a production site (no git repo detected)
- **Always create backups**: Before making bulk changes to HTML files
- **Test in browser**: Static site requires manual browser testing
- **Preserve existing styles**: Follow Bootstrap conventions and existing CSS patterns
- **Maintain SEO**: Don't remove or significantly alter meta tags without good reason
- **Multi-language support**: Consider both IT and EN versions when adding content
