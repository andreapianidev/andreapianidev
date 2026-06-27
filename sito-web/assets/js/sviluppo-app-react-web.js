/* sviluppo-app-react-web.js — reveal + Web App Brief 5-step + slot fetch */
(function () {
  'use strict';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() { requestAnimationFrame(() => document.body.classList.add('is-loaded')); }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    const targets = document.querySelectorAll('.rw-reveal, .rw-offer__stack li, .rw-guarantee__card, .rw-proof__card, .rw-stack__card, .rw-pas__item');
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

  const WA_LABELS = {
    name: 'Nome', nome: 'Nome', email: 'Email', phone: 'Telefono', telefono: 'Telefono',
    company: 'Azienda', azienda: 'Azienda', idea: 'Idea', problem: 'Problema',
    budget: 'Budget', website: 'Sito', url: 'Sito',
  };
  function waLabel(key) {
    if (WA_LABELS[key]) return WA_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function buildWaMessage(answers) {
    let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n\n';
    Object.keys(answers).forEach((key) => {
      let val = answers[key];
      if (Array.isArray(val)) val = val.join(', ');
      val = (val == null ? '' : String(val)).trim();
      if (!val) return;
      msg += '• ' + waLabel(key) + ': ' + val + '\n';
    });
    return msg;
  }

  function setupBriefForm() {
    const root = document.getElementById('rw-brief');
    if (!root) return;
    const steps = Array.from(root.querySelectorAll('.rw-brief__step'));
    const progress = root.querySelectorAll('.rw-brief__progress span');
    const backBtn = root.querySelector('.rw-brief__back');
    const nextBtn = root.querySelector('.rw-brief__next');
    const okEl = root.querySelector('#rw-brief-success');
    let current = 0;

    function setStep(i) {
      steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
      progress.forEach((bar, idx) => bar.classList.toggle('done', idx <= i));
      backBtn.disabled = (i === 0);
      const isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'invia brief →' : 'avanti →';
      current = i;
      const card = root.querySelector('.rw-brief__form');
      if (card && i > 0) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function validateStep(i) {
      const step = steps[i];
      const requiredInputs = step.querySelectorAll('[required]');
      for (const inp of requiredInputs) {
        if (inp.type === 'radio') {
          const any = step.querySelector(`[name="${inp.name}"]:checked`);
          if (!any) return `Seleziona un'opzione per continuare.`;
        } else if (!inp.value || (inp.type === 'email' && inp.value.indexOf('@') < 0)) {
          return `Compila il campo "${inp.placeholder || inp.name}".`;
        }
      }
      return null;
    }

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'rw-brief__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'rw-brief__success'; }

    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (current > 0) setStep(current - 1);
      hide();
    });
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const err = validateStep(current);
      if (err) { show(err, 'err'); return; }
      hide();
      if (current < steps.length - 1) { setStep(current + 1); return; }
      submit();
    });

    function readAnswers() {
      const fd = new FormData(root.querySelector('#rw-brief-form'));
      const out = {};
      ['name', 'email', 'phone', 'company', 'notes'].forEach((k) => {
        if (fd.get(k)) out[k] = String(fd.get(k));
      });
      ['app_type', 'stack', 'backend', 'performance_target'].forEach((k) => {
        if (fd.get(k)) out[k] = String(fd.get(k));
      });
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
        show('✓ Brief web ricevuto. Ti scrivo io entro 48h con: 1) stack consigliato (React vs Next.js vs Astro), 2) componenti UI suggeriti, 3) timeline 4-10 settimane, 4) cosa preparare per il kick-off.', 'ok');
        nextBtn.textContent = 'inviato ✓';
      }

      var __msg = buildWaMessage(answers);
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(__msg), '_blank');
      done();
      return;
    }

    setStep(0);
  }

  function init() {
    setupReveal();
    setupBriefForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
