/* creazione-api-rest.js — reveal + 5-step API Design Audit. Form submits via WhatsApp. */
(function () {
  'use strict';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const WA_LABELS = {
    name: 'Nome', nome: 'Nome', email: 'Email', phone: 'Telefono', telefono: 'Telefono',
    company: 'Azienda', azienda: 'Azienda', idea: 'Idea', problem: 'Esigenza',
    budget: 'Budget', website: 'Sito', url: 'Sito'
  };
  function waLabel(key) {
    if (WA_LABELS[key]) return WA_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function buildWaMessage(answers) {
    let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n';
    Object.keys(answers).forEach((key) => {
      let val = answers[key];
      if (Array.isArray(val)) val = val.join(', ');
      val = (val == null ? '' : String(val)).trim();
      if (!val) return;
      msg += '\n• ' + waLabel(key) + ': ' + val;
    });
    return msg;
  }
  function openWhatsApp(answers) {
    window.open('https://wa.me/393516248936?text=' + encodeURIComponent(buildWaMessage(answers)), '_blank');
  }

  function markLoaded() { requestAnimationFrame(() => document.body.classList.add('is-loaded')); }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    const targets = document.querySelectorAll('.ar-reveal, .ar-offer__stack li, .ar-guarantee__card, .ar-proof__card, .ar-bigidea__card');
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
    document.querySelectorAll('.ar-offer__stack li').forEach((el, i) => el.style.setProperty('--i', i));
  }

  function setupAuditForm() {
    const root = document.getElementById('ar-audit');
    if (!root) return;
    const steps = Array.from(root.querySelectorAll('.ar-audit__step'));
    const progress = root.querySelectorAll('.ar-audit__progress span');
    const backBtn = root.querySelector('.ar-audit__back');
    const nextBtn = root.querySelector('.ar-audit__next');
    const okEl   = root.querySelector('#ar-audit-success');
    let current = 0;

    function setStep(i) {
      steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
      progress.forEach((bar, idx) => bar.classList.toggle('done', idx <= i));
      backBtn.disabled = (i === 0);
      const isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'invia audit →' : 'avanti →';
      current = i;
      const card = root;
      if (card && i > 0) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function validateStep(i) {
      const step = steps[i];
      const requiredInputs = step.querySelectorAll('[required]');
      for (const inp of requiredInputs) {
        if (inp.type === 'radio') {
          const name = inp.name;
          const any = step.querySelector(`[name="${name}"]:checked`);
          if (!any) return `Seleziona un'opzione per continuare.`;
        } else if (inp.type === 'checkbox') {
          const name = inp.name;
          const any = step.querySelector(`[name="${name}"]:checked`);
          if (!any) return `Seleziona almeno un'opzione.`;
        } else if (!inp.value || (inp.type === 'email' && inp.value.indexOf('@') < 0)) {
          return `Compila il campo "${inp.placeholder || inp.name}".`;
        }
      }
      return null;
    }

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'ar-audit__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'ar-audit__success'; }

    backBtn.addEventListener('click', (e) => { e.preventDefault(); if (current > 0) setStep(current - 1); hide(); });
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const err = validateStep(current);
      if (err) { show(err, 'err'); return; }
      hide();
      if (current < steps.length - 1) { setStep(current + 1); return; }
      submit();
    });

    function readAnswers() {
      const fd = new FormData(root.querySelector('#ar-audit-form'));
      const out = {};
      ['name', 'email', 'phone', 'company', 'notes'].forEach((k) => {
        if (fd.get(k)) out[k] = String(fd.get(k));
      });
      ['stack_pref', 'volume', 'security'].forEach((k) => {
        if (fd.get(k)) out[k] = String(fd.get(k));
      });
      out.expose = fd.getAll('expose');
      return out;
    }

    function submit() {
      const answers = readAnswers();
      if (!answers.email || !answers.name) {
        show('Manca nome o email — torna allo step finale per completarli.', 'err');
        return;
      }
      nextBtn.disabled = true;
      nextBtn.textContent = 'invio...';

      function done() {
        show('✓ Audit ricevuto. Ti scrivo io entro 48h con: 1) schema OpenAPI suggerito, 2) stack consigliato, 3) timeline realistica, 4) auth & security tier giusto per te.', 'ok');
        nextBtn.textContent = 'inviato ✓';
      }

      openWhatsApp(answers);
      done();
      return;
    }

    setStep(0);
  }

  function init() {
    annotateStaggerOrder();
    setupReveal();
    setupAuditForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
