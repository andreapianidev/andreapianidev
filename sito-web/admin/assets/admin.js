// Andrea AI admin — minimal JS helpers (dark luxe build).
(function () {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Mobile drawer ----------
  const burger   = document.querySelector('.adm-burger');
  const drawer   = document.querySelector('.adm-nav#adm-drawer');
  const backdrop = document.querySelector('.adm-drawer-backdrop');
  function setDrawer(open) {
    if (!burger || !drawer || !backdrop) return;
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger) burger.addEventListener('click', () => setDrawer(!burger.classList.contains('is-open')));
  if (backdrop) backdrop.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger && burger.classList.contains('is-open')) setDrawer(false);
  });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setDrawer(false); });

  // ---------- Confirm before destructive actions ----------
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => {
      if (!confirm(el.getAttribute('data-confirm'))) e.preventDefault();
    });
  });

  // ---------- Copy to clipboard ----------
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.getAttribute('data-copy'));
        const old = btn.textContent;
        btn.textContent = '✓ Copiato';
        setTimeout(() => (btn.textContent = old), 1200);
      } catch {}
    });
  });

  // ---------- Fetch helper ----------
  window.aaiPost = async function (url, data) {
    const r = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('http_' + r.status);
    return r.json();
  };

  // ---------- Count-up for KPI numbers ----------
  // Uses IntersectionObserver so off-screen KPIs animate when scrolled into view.
  const counterEls = document.querySelectorAll('[data-counter]');
  if (counterEls.length && !reduceMotion) {
    const fmt = new Intl.NumberFormat('it-IT');
    const animate = (el) => {
      const target = parseInt(el.getAttribute('data-counter'), 10) || 0;
      if (target === 0) return;
      const duration = 900;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
        el.textContent = fmt.format(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counterEls.forEach(el => io.observe(el));
    } else {
      counterEls.forEach(animate);
    }
  }

  // ---------- Ripple effect on .adm-btn ----------
  if (!reduceMotion) {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.adm-btn');
      if (!btn || btn.disabled) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'adm-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ---------- Daily AI Summary banner ----------
  // Uses event delegation on document so it survives the dashboard auto-refresh
  // (layout.php re-renders main.innerHTML every 60s, which would drop direct listeners).
  (function () {
    function getRoot() { return document.querySelector('.adm-aisum'); }
    function getCsrf() {
      const r = getRoot();
      return (r && r.getAttribute('data-aisum-csrf')) || '';
    }

    function showConfirmModal(message) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'adm-aisum-modal';
        overlay.innerHTML =
          '<div class="adm-aisum-modal-card">' +
            '<h3 class="adm-aisum-modal-title">Generare nuovo riassunto AI?</h3>' +
            '<p class="adm-aisum-modal-msg">' + message + '</p>' +
            '<div class="adm-aisum-modal-actions">' +
              '<button type="button" class="adm-btn" data-act="cancel">Annulla</button>' +
              '<button type="button" class="adm-btn adm-btn--primary" data-act="ok">Conferma</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(overlay);
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.addEventListener('click', e => {
          if (e.target === overlay) close(false);
          const act = e.target.closest('[data-act]');
          if (!act) return;
          close(act.getAttribute('data-act') === 'ok');
        });
        document.addEventListener('keydown', function esc(e){
          if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(false); }
        });
      });
    }

    function showErrorPopup(message) {
      const existing = document.querySelector('.adm-aisum-popup');
      if (existing) existing.remove();
      const pop = document.createElement('div');
      pop.className = 'adm-aisum-popup';
      pop.innerHTML =
        '<div class="adm-aisum-popup-title">⚠ Errore generazione riassunto AI</div>' +
        '<div class="adm-aisum-popup-msg"></div>' +
        '<div class="adm-aisum-popup-actions">' +
          '<button type="button" class="adm-btn" data-act="dismiss">Ok, ignora</button>' +
          '<button type="button" class="adm-btn adm-btn--primary" data-act="retry">Riprova</button>' +
        '</div>';
      pop.querySelector('.adm-aisum-popup-msg').textContent = message || 'Errore sconosciuto.';
      document.body.appendChild(pop);
      pop.addEventListener('click', async (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const action = act.getAttribute('data-act');
        if (action === 'dismiss') {
          try { await ackError(); } catch {}
          pop.remove();
        } else if (action === 'retry') {
          pop.remove();
          await regenerate(false);
        }
      });
    }

    async function ackError() {
      const r = await fetch('api/refresh-summary.php?ack=1', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf: getCsrf() })
      });
      if (!r.ok) throw new Error('http_' + r.status);
    }

    async function regenerate(isAuto) {
      const root = getRoot();
      const btn = root && root.querySelector('[data-aisum-refresh]');
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
      try {
        const r = await fetch('api/refresh-summary.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csrf: getCsrf(), auto: !!isAuto })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || data.error || ('http_' + r.status));
        location.reload();
      } catch (err) {
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
        showErrorPopup(err && err.message ? err.message : String(err));
      }
    }

    // Delegated click — survives main.innerHTML re-renders from autorefresh.
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-aisum-refresh]');
      if (!btn) return;
      e.preventDefault();
      const ok = await showConfirmModal('Costa 1 chiamata API DeepSeek. Procedere?');
      if (!ok) return;
      regenerate(false);
    });

    // Initial-mount tasks (error popup, auto-fallback). Run only on first DOMContentLoaded
    // to avoid retriggering on autorefresh (which doesn't re-run this script).
    function initialMount() {
      const root = getRoot();
      if (!root) return;
      if (root.getAttribute('data-aisum-show-error') === '1') {
        const msg = root.getAttribute('data-aisum-error') || 'Errore generazione riassunto AI.';
        showErrorPopup(msg);
      }
      if (root.getAttribute('data-aisum-auto') === '1') {
        regenerate(true);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialMount);
    } else {
      initialMount();
    }
  })();

  // ---------- Reminder modal ----------
  window.openReminderModal = function (sessionId, phone) {
    const due = prompt('Quando ti ricordo? (formato: YYYY-MM-DD HH:MM, es. 2026-04-30 15:00)');
    if (!due) return;
    const note = prompt('Nota promemoria (opzionale):') || '';
    const csrf = document.querySelector('meta[name="csrf"]')?.content;
    aaiPost('reminder-create.php', { session_id: sessionId, phone, due_at: due, note, csrf })
      .then(() => location.reload())
      .catch(e => alert('Errore: ' + e.message));
  };
})();
