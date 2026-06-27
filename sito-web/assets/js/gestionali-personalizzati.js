/* gestionali-personalizzati.js — reveal + configuratore 5 step + slot fetch
   Vanilla JS, zero dipendenze.
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
    const targets = document.querySelectorAll('.gp-reveal, .gp-offer__stack li, .gp-guarantee__card, .gp-proof__card');
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
    document.querySelectorAll('.gp-offer__stack li').forEach((el, i) => {
      el.style.setProperty('--i', i);
    });
  }

  const FIELD_LABELS = {
    name: 'Nome', nome: 'Nome', email: 'Email', phone: 'Telefono', telefono: 'Telefono',
    company: 'Azienda', azienda: 'Azienda', idea: 'Idea', problem: 'Esigenza',
    budget: 'Budget', website: 'Sito', url: 'Sito',
  };

  function labelFor(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function buildWhatsAppMessage(answers) {
    let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n';
    Object.keys(answers).forEach((key) => {
      let val = answers[key];
      if (Array.isArray(val)) val = val.filter(Boolean).join(', ');
      else val = (val == null ? '' : String(val)).trim();
      if (!val) return;
      msg += `\n• ${labelFor(key)}: ${val}`;
    });
    return msg;
  }

  function setupConfigurator() {
    const root = document.getElementById('gp-config');
    if (!root) return;

    const steps = Array.from(root.querySelectorAll('.gp-config__step'));
    const progress = root.querySelectorAll('.gp-config__progress span');
    const backBtn = root.querySelector('.gp-config__back');
    const nextBtn = root.querySelector('.gp-config__next');
    const okEl   = root.querySelector('#config-success');
    let current = 0;

    function setStep(i) {
      steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
      progress.forEach((bar, idx) => bar.classList.toggle('done', idx <= i));
      backBtn.disabled = (i === 0);
      const isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'Manda la richiesta →' : 'Avanti →';
      current = i;
      // bring the configurator into view on step change (subtle)
      const card = root.querySelector('.gp-config__form');
      if (card && i > 0) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function validateStep(i) {
      const step = steps[i];
      const requiredInputs = step.querySelectorAll('[required]');
      for (const inp of requiredInputs) {
        if (inp.type === 'radio') {
          const name = inp.name;
          const any = step.querySelector(`[name="${name}"]:checked`);
          if (!any) return `Seleziona un'opzione per "${inp.dataset.label || name}".`;
        } else if (!inp.value || (inp.type === 'email' && inp.value.indexOf('@') < 0)) {
          return `Compila il campo "${inp.placeholder || inp.name}".`;
        }
      }
      return null;
    }

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'gp-config__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'gp-config__success'; }

    backBtn.addEventListener('click', (e) => { e.preventDefault(); if (current > 0) setStep(current - 1); hide(); });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const err = validateStep(current);
      if (err) { show(err, 'err'); return; }
      hide();
      if (current < steps.length - 1) { setStep(current + 1); return; }
      submitConfig();
    });

    function readAnswers() {
      const fd = new FormData(root.querySelector('#config-form'));
      const out = {};
      // text
      ['name', 'email', 'phone', 'company', 'dipendenti'].forEach((k) => {
        if (fd.get(k)) out[k] = String(fd.get(k));
      });
      // radio
      ['settore', 'urgenza'].forEach((k) => { if (fd.get(k)) out[k] = String(fd.get(k)); });
      // checkboxes (multi)
      out.moduli = fd.getAll('moduli');
      out.processi = fd.getAll('processi');
      return out;
    }

    function submitConfig() {
      const answers = readAnswers();
      if (!answers.email || !answers.name) {
        show('Manca nome o email — torna allo step finale per completarli.', 'err');
        return;
      }
      nextBtn.disabled = true;
      nextBtn.textContent = 'Invio...';

      function done() {
        show('✓ Richiesta acquisita. Ti scrivo io entro 48h con la proposta personalizzata.', 'ok');
        nextBtn.textContent = 'Inviato ✓';
      }

      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(buildWhatsAppMessage(answers)), '_blank');
      done();
      return;
    }

    setStep(0);
  }

  function init() {
    annotateStaggerOrder();
    setupReveal();
    setupConfigurator();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
