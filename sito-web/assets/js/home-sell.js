/* home-sell.js — motion + ROI calculator + scarcity counter + custom cursor
   Esclusivo della home (index.html). Vanilla JS, nessuna dipendenza.
*/
(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Page-load class ----
  function markLoaded() {
    requestAnimationFrame(() => {
      body.classList.add('is-loaded');
    });
  }
  if (document.readyState === 'complete') {
    markLoaded();
  } else {
    window.addEventListener('load', markLoaded);
  }

  // ---- IntersectionObserver reveal ----
  function setupReveal() {
    const targets = document.querySelectorAll('.hs-reveal, .hs-mark, .hs-offer__stack li, .hs-solution__col--win, .hs-guarantee__card');
    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      targets.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  // Stagger index for offer stack items
  function annotateStaggerOrder() {
    document.querySelectorAll('.hs-offer__stack li').forEach((li, i) => {
      li.style.setProperty('--i', i);
    });
  }

  // ---- ROI Calculator ----
  function setupROI() {
    const calc = document.getElementById('roi-calc');
    if (!calc) return;

    const hoursEl     = calc.querySelector('#roi-hours');
    const peopleEl    = calc.querySelector('#roi-people');
    const rateEl      = calc.querySelector('#roi-rate');

    const hoursValEl  = calc.querySelector('#roi-hours-val');
    const peopleValEl = calc.querySelector('#roi-people-val');
    const rateValEl   = calc.querySelector('#roi-rate-val');

    const bigEl       = calc.querySelector('#roi-big');
    const breakdownEls = {
      manual:  calc.querySelector('#roi-bd-manual'),
      errors:  calc.querySelector('#roi-bd-errors'),
      reports: calc.querySelector('#roi-bd-reports'),
      total:   calc.querySelector('#roi-bd-total'),
    };

    let displayedTotal = 0;
    let rafId = null;

    function fmtEur(n) {
      try {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
      } catch (e) {
        return '€' + Math.round(n).toLocaleString('it-IT');
      }
    }
    function fmtNum(n) {
      return new Intl.NumberFormat('it-IT').format(Math.round(n));
    }

    function recalc() {
      const hours = parseInt(hoursEl.value, 10) || 0;
      const people = parseInt(peopleEl.value, 10) || 1;
      const rate = parseInt(rateEl.value, 10) || 0;

      hoursValEl.textContent = hours + ' h';
      peopleValEl.textContent = people + (people === 1 ? ' persona' : ' persone');
      rateValEl.textContent = '€' + rate + '/h';

      const annualHours = hours * 52 * people;
      const manualCost  = annualHours * rate;
      const errorCost   = manualCost * 0.25; // 25% errors/rework estimate
      const reportCost  = people * 50 * rate; // ~50h/anno report manuali per persona
      const total       = manualCost + errorCost + reportCost;

      breakdownEls.manual.querySelector('span').textContent  = `${fmtNum(annualHours)} h × €${rate}`;
      breakdownEls.manual.querySelector('strong').textContent = fmtEur(manualCost);
      breakdownEls.errors.querySelector('strong').textContent = fmtEur(errorCost);
      breakdownEls.reports.querySelector('strong').textContent = fmtEur(reportCost);
      breakdownEls.total.querySelector('strong').textContent  = fmtEur(total);

      animateNumber(displayedTotal, total);
      displayedTotal = total;
    }

    function animateNumber(from, to) {
      if (prefersReducedMotion) { bigEl.textContent = fmtEur(to); return; }
      if (rafId) cancelAnimationFrame(rafId);
      const start = performance.now();
      const duration = 700;
      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = from + (to - from) * eased;
        bigEl.textContent = fmtEur(current);
        if (t < 1) rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }

    [hoursEl, peopleEl, rateEl].forEach((el) => el && el.addEventListener('input', recalc));
    recalc();

    // ---- form submit ----
    const form = calc.querySelector('#roi-form');
    const okEl = calc.querySelector('#roi-success');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('[name=name]').value.trim();
      const email = form.querySelector('[name=email]').value.trim();
      const phone = form.querySelector('[name=phone]').value.trim();
      if (!name || !email) {
        okEl.textContent = 'Compila almeno nome e email per ricevere il report.';
        okEl.style.background = '#A41E1E';
        okEl.classList.add('visible');
        return;
      }

      const submitBtn = form.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Apertura WhatsApp...';

      const lossYearly = fmtEur(Math.round(displayedTotal));
      const fields = {
        Nome: name,
        Email: email,
        Telefono: phone,
        'Ore/settimana': (parseInt(hoursEl.value, 10) || 0) + ' h',
        Persone: parseInt(peopleEl.value, 10) || 1,
        'Costo orario': '€' + (parseInt(rateEl.value, 10) || 0) + '/h',
        'Perdita stimata/anno': lossYearly
      };
      let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n';
      Object.keys(fields).forEach((label) => {
        const val = fields[label];
        if (val !== '' && val != null) msg += '\n• ' + label + ': ' + val;
      });
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(msg), '_blank');

      okEl.textContent = '✓ Richiesta ricevuta. Ti scrivo io entro 24h con il PDF e la simulazione.';
      okEl.style.background = '#2E7D32';
      okEl.classList.add('visible');
      submitBtn.textContent = 'Inviato ✓';
    });
  }

  // ---- Custom cursor on CTA ----
  function setupCursor() {
    if (prefersReducedMotion) return;
    if (matchMedia('(hover: none)').matches) return;
    const cursor = document.createElement('div');
    cursor.className = 'hs-cursor';
    cursor.textContent = 'Prendi →';
    document.body.appendChild(cursor);

    let mouseX = 0, mouseY = 0;
    let curX = 0, curY = 0;
    let rafActive = false;

    function loop() {
      curX += (mouseX - curX) * 0.22;
      curY += (mouseY - curY) * 0.22;
      cursor.style.left = curX + 'px';
      cursor.style.top = curY + 'px';
      if (cursor.classList.contains('visible')) {
        requestAnimationFrame(loop);
      } else {
        rafActive = false;
      }
    }

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const ctas = document.querySelectorAll('.hs-cta--cursor');
    ctas.forEach((cta) => {
      cta.addEventListener('mouseenter', () => {
        curX = mouseX; curY = mouseY;
        cursor.classList.add('visible');
        cta.style.cursor = 'none';
        if (!rafActive) { rafActive = true; requestAnimationFrame(loop); }
      });
      cta.addEventListener('mouseleave', () => {
        cursor.classList.remove('visible');
        cta.style.cursor = '';
      });
    });
  }

  // ---- Init ----
  function init() {
    annotateStaggerOrder();
    setupReveal();
    setupROI();
    setupCursor();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
