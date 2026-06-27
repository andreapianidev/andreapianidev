/* servizi-perfex-crm.js — reveal stagger + CRM health-check form + slot fetch */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() { requestAnimationFrame(() => document.body.classList.add('is-loaded')); }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    const targets = document.querySelectorAll('.px-reveal, .px-offer__stack li, .px-guarantee__card, .px-proof__card, .px-solution__col--win');
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

  function annotateStaggerOrder() {
    document.querySelectorAll('.px-offer__stack li').forEach((el, i) => {
      el.style.setProperty('--i', i);
    });
  }

  function setupAuditForm() {
    const form = document.getElementById('perfex-audit-form');
    if (!form) return;
    const okEl = form.parentElement.querySelector('#perfex-audit-success');
    const btn = form.querySelector('button[type=submit]');

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'px-audit__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentCrm = form.querySelector('[name=current_crm]').value;
      const sales = form.querySelector('[name=sales_people]').value;
      const leads = form.querySelector('[name=leads_month]').value;
      const closeRate = form.querySelector('[name=close_rate]').value;
      const name = form.querySelector('[name=name]').value.trim();
      const email = form.querySelector('[name=email]').value.trim();
      const phone = form.querySelector('[name=phone]').value.trim();

      if (!name || !email) {
        show('Compila almeno nome e email per ricevere il report.', 'err');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Apertura WhatsApp...';

      const fields = {
        Nome: name,
        Email: email,
        Telefono: phone,
        'CRM attuale': currentCrm,
        'Persone nel sales': sales,
        'Lead/mese': leads,
        'Tasso di chiusura': closeRate
      };
      let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n';
      Object.keys(fields).forEach((label) => {
        const val = fields[label];
        if (val) msg += '\n• ' + label + ': ' + val;
      });
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(msg), '_blank');

      show('✓ Richiesta acquisita. Ti scrivo io entro 48h con 3 cose tecniche da automatizzare nel tuo sales process.', 'ok');
      btn.textContent = 'Inviato ✓';
    });
  }

  function init() {
    annotateStaggerOrder();
    setupReveal();
    setupAuditForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
