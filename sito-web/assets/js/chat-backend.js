/**
 * Andrea AI — backend integration.
 * Logs sessions, messages, events, and phone submissions to the same-origin PHP API.
 * Failures NEVER block the chat UI.
 */
(function () {
  'use strict';
  if (window.AAIBackend) return;

  const API = {
    startSession:  '/api/start-session.php',
    logMessage:    '/api/log-message.php',
    logEvent:      '/api/log-event.php',
    submitPhone:   '/api/submit-phone.php',
  };

  const SID_KEY  = 'andreaAiSid';
  const CSRF_KEY = 'andreaAiCsrf';
  const QUEUE_KEY = 'andreaAiQueue';

  let inFlightStart = null;
  const listeners = { phoneSubmitted: [], phoneDismissed: [] };

  function readSid()  { try { return sessionStorage.getItem(SID_KEY) || null; } catch (e) { return null; } }
  function readCsrf() { try { return sessionStorage.getItem(CSRF_KEY) || null; } catch (e) { return null; } }
  function writeSession(sid, csrf) {
    try { sessionStorage.setItem(SID_KEY, sid); sessionStorage.setItem(CSRF_KEY, csrf); } catch (e) {}
  }
  function clearSession() {
    try { sessionStorage.removeItem(SID_KEY); sessionStorage.removeItem(CSRF_KEY); } catch (e) {}
  }

  function detectDevice() {
    return matchMedia && matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  }

  function postJson(url, data) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
      keepalive: true, // survive page unload (chat_close on close)
    }).then(r => {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json().catch(() => ({}));
    });
  }

  function ensureSession() {
    const existing = readSid();
    const csrf = readCsrf();
    if (existing && csrf) return Promise.resolve({ session_id: existing, csrf_token: csrf });
    if (inFlightStart) return inFlightStart;
    inFlightStart = postJson(API.startSession, {
      page_url: location.href,
      referrer: document.referrer || '',
      device: detectDevice(),
    }).then(r => {
      if (!r.session_id || !r.csrf_token) throw new Error('bad_start');
      writeSession(r.session_id, r.csrf_token);
      inFlightStart = null;
      flushQueue();
      return r;
    }).catch(e => { inFlightStart = null; throw e; });
    return inFlightStart;
  }

  // Outbox for transient failures (network glitches)
  function enqueue(item) {
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      q.push(item);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
    } catch (e) {}
  }
  function flushQueue() {
    let q;
    try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { q = []; }
    if (!q.length) return;
    localStorage.removeItem(QUEUE_KEY);
    q.forEach(item => postJson(item.url, item.data).catch(() => enqueue(item)));
  }

  function logMessage(role, content) {
    return ensureSession().then(({ session_id, csrf_token }) => {
      const payload = { session_id, csrf: csrf_token, role, content };
      return postJson(API.logMessage, payload).catch(() => enqueue({ url: API.logMessage, data: payload }));
    }).catch(() => {});
  }

  function logEvent(eventType, payload) {
    payload = payload || {};
    payload.page_url = payload.page_url || location.href;
    payload.device   = payload.device   || detectDevice();
    const sid = readSid();
    const csrf = readCsrf();
    const data = { event_type: eventType, payload, session_id: sid || '', csrf: csrf || '' };
    // page_view/whatsapp_click are allowed without session — fire-and-forget
    return postJson(API.logEvent, data).catch(() => enqueue({ url: API.logEvent, data }));
  }

  function submitPhone(phone, trigger) {
    return ensureSession().then(({ session_id, csrf_token }) => {
      const data = { session_id, csrf: csrf_token, phone, trigger: trigger || 'manual_button' };
      return postJson(API.submitPhone, data).then(r => {
        listeners.phoneSubmitted.forEach(fn => { try { fn(r.phone, trigger); } catch (e) {} });
        logEvent('phone_submitted', { trigger, phone_normalized: r.phone });
        return r;
      });
    });
  }

  function on(evt, fn) {
    if (listeners[evt]) listeners[evt].push(fn);
  }

  function emit(evt, ...args) {
    (listeners[evt] || []).forEach(fn => { try { fn(...args); } catch (e) {} });
  }

  // ----- AI marker handling -----
  // The model is instructed to insert "[ASK_PHONE]" when interest is concrete.
  // We strip the marker from the visible text and notify caller.
  function handleAssistantText(text) {
    if (!text) return { visible: text, ask: false };
    if (text.indexOf('[ASK_PHONE]') === -1) return { visible: text, ask: false };
    const visible = text.replace(/\[ASK_PHONE\]/g, '').replace(/\n{3,}/g, '\n\n').trim();
    return { visible, ask: true };
  }

  // ----- Phone form rendering -----
  function buildPhoneForm(opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'aai-phone-form';
    wrap.setAttribute('data-trigger', opts.trigger || 'manual_button');
    wrap.innerHTML = ''
      + '<div class="aai-phone-form-title">'
      +   '<span aria-hidden="true">📞</span> '
      +   (opts.title || 'Lasciami il tuo numero, ti ricontatto io')
      + '</div>'
      + '<div class="aai-phone-form-sub">Andrea ti scrive su WhatsApp entro 24 ore. Niente spam.</div>'
      + '<div class="aai-phone-row">'
      +   '<input class="aai-phone-input" type="tel" inputmode="tel" autocomplete="tel"'
      +   '       placeholder="+39 351 ..." maxlength="20" />'
      +   '<button class="aai-phone-submit" type="button">Invia</button>'
      + '</div>'
      + '<button class="aai-phone-dismiss" type="button">No grazie</button>'
      + '<div class="aai-phone-msg" aria-live="polite"></div>';

    const input  = wrap.querySelector('.aai-phone-input');
    const submit = wrap.querySelector('.aai-phone-submit');
    const dismiss= wrap.querySelector('.aai-phone-dismiss');
    const msg    = wrap.querySelector('.aai-phone-msg');

    submit.addEventListener('click', () => {
      const value = (input.value || '').trim();
      if (!/^\+?\d[\d\s]{7,14}$/.test(value)) {
        msg.textContent = 'Numero non valido. Inserisci un numero italiano o internazionale (8-15 cifre).';
        msg.className = 'aai-phone-msg is-err';
        input.focus();
        return;
      }
      submit.disabled = true; input.disabled = true;
      msg.textContent = 'Invio in corso...';
      msg.className = 'aai-phone-msg';
      submitPhone(value, opts.trigger || 'manual_button')
        .then(r => {
          msg.textContent = '✓ Grazie! Ti ricontatto al ' + (r.phone || value) + '.';
          msg.className = 'aai-phone-msg is-ok';
          submit.style.display = 'none';
          dismiss.style.display = 'none';
          if (typeof opts.onSubmitted === 'function') opts.onSubmitted(r.phone || value);
        })
        .catch(() => {
          submit.disabled = false; input.disabled = false;
          msg.textContent = 'Errore di rete, riprova o scrivi su WhatsApp al +39 351 624 8936.';
          msg.className = 'aai-phone-msg is-err';
        });
    });

    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit.click(); });

    dismiss.addEventListener('click', () => {
      logEvent('phone_dismissed', { trigger: opts.trigger || 'manual_button' });
      emit('phoneDismissed');
      if (typeof opts.onDismissed === 'function') opts.onDismissed();
      wrap.remove();
    });

    return wrap;
  }

  window.AAIBackend = {
    ensureSession,
    logMessage,
    logEvent,
    submitPhone,
    handleAssistantText,
    buildPhoneForm,
    clearSession,
    on,
    detectDevice,
    flushQueue,
  };

  // Auto-flush retry queue on load
  flushQueue();
})();
