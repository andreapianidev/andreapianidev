/* servizi-prestashop.js — reveal stagger + audit form submission + slot fetch
   Dedicato a servizi-prestashop.html. Vanilla, zero dipendenze.
*/
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    const targets = document.querySelectorAll('.ps-reveal, .ps-offer__service, .ps-guarantee__card, .ps-proof__card');
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
    document.querySelectorAll('.ps-offer__service').forEach((el, i) => {
      el.style.setProperty('--i', i);
    });
  }

  function setupAuditForm() {
    const form = document.getElementById('audit-form');
    if (!form) return;
    const okEl = form.parentElement.querySelector('#audit-success');
    const btn = form.querySelector('button[type=submit]');

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.style.background = (kind === 'err') ? '#B71C1C' : '#1F7A1F';
      okEl.classList.add('visible');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const url = form.querySelector('[name=shop_url]').value.trim();
      const version = form.querySelector('[name=ps_version]').value;
      const email = form.querySelector('[name=email]').value.trim();
      const phone = form.querySelector('[name=phone]').value.trim();
      const name = form.querySelector('[name=name]').value.trim();

      if (!url || !email || !name) {
        show('Compila almeno URL shop, nome e email per ricevere la diagnosi.', 'err');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Apertura WhatsApp...';

      const fields = {
        Nome: name,
        Email: email,
        Telefono: phone,
        Sito: url,
        'Versione PrestaShop': version
      };
      let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n';
      Object.keys(fields).forEach((label) => {
        const val = fields[label];
        if (val) msg += '\n• ' + label + ': ' + val;
      });
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(msg), '_blank');

      show('✓ Richiesta acquisita. Andrea ti scrive personalmente entro 48h sulla mail indicata.', 'ok');
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
