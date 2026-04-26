/**
 * Andrea AI — site-wide analytics (page_view + whatsapp_click).
 * Tiny, dependency-free, fire-and-forget.
 *
 * Loads on every page (including pages without the chat widget).
 * Feeds the same /api/log-event.php endpoint the widget uses.
 */
(function () {
  'use strict';
  if (window.__aaiAnalyticsLoaded) return;
  window.__aaiAnalyticsLoaded = true;

  // Skip on legal/thank-you pages — same exclusion as the widget
  const path = (location.pathname || '').toLowerCase();
  const SKIP = ['privacy-policy','cookie-policy','privacypolicyps','wtprivacy','grazie-guida','footer-gdpr'];
  for (var i = 0; i < SKIP.length; i++) if (path.indexOf(SKIP[i]) !== -1) return;

  function detectDevice() {
    return matchMedia && matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  }

  function clientHints() {
    var hints = {};
    try {
      if (window.screen && screen.width)  hints.screen_w = screen.width  | 0;
      if (window.screen && screen.height) hints.screen_h = screen.height | 0;
    } catch (e) {}
    try {
      var lang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toString();
      if (lang) hints.lang = lang.slice(0, 16);
    } catch (e) {}
    return hints;
  }

  function send(eventType, payload) {
    payload = payload || {};
    payload.page_url = location.href;
    payload.device = detectDevice();
    if (eventType === 'page_view') {
      var hints = clientHints();
      for (var k in hints) if (Object.prototype.hasOwnProperty.call(hints, k)) payload[k] = hints[k];
    }
    const data = JSON.stringify({ event_type: eventType, payload: payload, session_id: '', csrf: '' });
    // Use sendBeacon when available (survives navigations like outbound clicks)
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([data], { type: 'application/json' });
        if (navigator.sendBeacon('/api/log-event.php', blob)) return;
      } catch (e) {}
    }
    fetch('/api/log-event.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true,
    }).catch(function () {});
  }

  // 1. Page view (one per load, after deduplication via session bit)
  function firePageView() {
    try {
      const key = 'aaiPV_' + path;
      const last = sessionStorage.getItem(key);
      const now = Date.now();
      // Re-fire if same path was seen >30 min ago (treat as new visit)
      if (!last || (now - parseInt(last, 10)) > 30 * 60 * 1000) {
        send('page_view', { referrer: document.referrer || '' });
      }
      sessionStorage.setItem(key, String(now));
    } catch (e) {
      send('page_view', { referrer: document.referrer || '' });
    }
  }

  // 2. WhatsApp click intercept (any wa.me link site-wide)
  document.addEventListener('click', function (e) {
    const a = e.target && (e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]'));
    if (!a) return;
    send('whatsapp_click', { href: a.getAttribute('href') || '', text: (a.textContent || '').trim().slice(0, 80) });
    // Don't preventDefault — let the link work normally
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', firePageView);
  } else {
    firePageView();
  }
})();
