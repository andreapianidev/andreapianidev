/* crm.js — reveal on scroll + slot counter + CRM Vision Brief 5-step */
(function () {
  'use strict';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    const targets = document.querySelectorAll('.cm-reveal, .cm-offer__stack li, .cm-guarantee__card, .cm-proof__card, .cm-road, .cm-pas__item');
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
    document.querySelectorAll('.cm-offer__stack li').forEach((el, i) => el.style.setProperty('--i', i));
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

  function setupBriefForm() {
    const root = document.getElementById('cm-brief');
    if (!root) return;
    const steps = Array.from(root.querySelectorAll('.cm-brief__step'));
    const progress = root.querySelectorAll('.cm-brief__progress span');
    const backBtn = root.querySelector('.cm-brief__back');
    const nextBtn = root.querySelector('.cm-brief__next');
    const okEl   = root.querySelector('#cm-brief-success');
    let current = 0;

    function setStep(i) {
      steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
      progress.forEach((bar, idx) => bar.classList.toggle('done', idx <= i));
      backBtn.disabled = (i === 0);
      const isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'spedisci brief →' : 'avanti →';
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
        } else if (!inp.value || (inp.type === 'email' && inp.value.indexOf('@') < 0)) {
          return `Compila il campo "${inp.placeholder || inp.name}".`;
        }
      }
      return null;
    }

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'cm-brief__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'cm-brief__success'; }

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
      const form = root.querySelector('#cm-brief-form');
      const fd = new FormData(form);
      const out = {};
      ['name', 'email', 'phone', 'company', 'notes'].forEach((k) => {
        if (fd.get(k)) out[k] = String(fd.get(k));
      });
      ['team_size', 'current_tool', 'priority', 'approach'].forEach((k) => {
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
        show('✓ Brief CRM ricevuto. Ti scrivo io entro 48h con: 1) raccomandazione approccio (custom/Perfex/SaaS) sincera per il tuo caso, 2) moduli essenziali da fare per primi, 3) timeline 4-10 settimane, 4) range investimento realistico.', 'ok');
        nextBtn.textContent = 'inviato ✓';
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
    setupBriefForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
