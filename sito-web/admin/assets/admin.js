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
  // Delegated handlers on document so they survive the dashboard auto-refresh
  // (layout.php re-renders main.innerHTML every 60s).
  function aaiSumGetRoot() { return document.querySelector('.adm-aisum'); }
  function aaiSumGetCsrf() {
    const r = aaiSumGetRoot();
    return (r && r.getAttribute('data-aisum-csrf')) || '';
  }

  async function aaiSumRegenerate() {
    const root = aaiSumGetRoot();
    const btns = root ? root.querySelectorAll('[data-aisum-refresh]') : [];
    btns.forEach(b => { b.disabled = true; b.classList.add('is-loading'); });
    try {
      const r = await fetch('api/refresh-summary.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf: aaiSumGetCsrf() })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || data.error || ('http_' + r.status));
      location.reload();
    } catch (err) {
      btns.forEach(b => { b.disabled = false; b.classList.remove('is-loading'); });
      alert('Errore generazione riassunto AI:\n\n' + (err && err.message ? err.message : err));
    }
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-aisum-refresh]');
    if (!btn) return;
    e.preventDefault();
    if (!confirm('Generare nuovo riassunto AI? Costa 1 chiamata API DeepSeek.')) return;
    aaiSumRegenerate();
  });

  // Show error popup once on initial page load if last-error.json was unacked.
  function aaiSumInit() {
    const root = aaiSumGetRoot();
    if (!root) return;
    if (root.getAttribute('data-aisum-show-error') === '1') {
      const msg = root.getAttribute('data-aisum-error') || 'Errore sconosciuto';
      // Use alert (blocking) so admin must dismiss to continue; ack on dismiss.
      alert('⚠ Errore generazione riassunto AI:\n\n' + msg);
      fetch('api/refresh-summary.php?ack=1', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf: aaiSumGetCsrf() })
      }).catch(() => {});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aaiSumInit);
  } else {
    aaiSumInit();
  }

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
