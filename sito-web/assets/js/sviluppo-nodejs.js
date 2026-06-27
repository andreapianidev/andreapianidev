/* sviluppo-nodejs.js — reveal + Realtime API Sketch 5-step form
   + animated terminal log streaming. Form submits via WhatsApp. */
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

  function setupReveal() {
    const targets = document.querySelectorAll('.nj-reveal');
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

  function setupTerminal() {
    const body = document.querySelector('[data-nj-terminal]');
    if (!body || prefersReducedMotion) return;
    const logs = [
      { ts: '12:34:01', ev: 'socket.connect', id: 'user.482', ok: 'ok' },
      { ts: '12:34:02', ev: 'auth.verify',    id: 'jwt.signed', ok: 'ok' },
      { ts: '12:34:03', ev: 'room.join',      id: 'room.alpha', ok: '+1' },
      { ts: '12:34:04', ev: 'msg.broadcast',  id: '→ 218 peers', ok: 'ok' },
      { ts: '12:34:05', ev: 'redis.publish',  id: 'channel:live', ok: 'ok' },
      { ts: '12:34:06', ev: 'metric.lag',     id: '12ms p95',    ok: 'ok' },
      { ts: '12:34:07', ev: 'socket.connect', id: 'user.483',    ok: 'ok' },
      { ts: '12:34:08', ev: 'iot.telemetry',  id: 'device.x9',   ok: 'ok' }
    ];
    let i = 0;
    function appendLog() {
      const item = logs[i % logs.length];
      const span = document.createElement('span');
      span.className = 'log';
      span.innerHTML = `<span class="ts">[${item.ts}]</span> <span class="ev">${item.ev}</span> <span class="id">${item.id}</span> <span class="ok">${item.ok}</span>`;
      body.insertBefore(span, body.querySelector('.caret'));
      i++;
      // keep max 8 lines
      const all = body.querySelectorAll('.log');
      if (all.length > 8) all[0].remove();
    }
    // seed 4 instantly
    for (let k = 0; k < 4; k++) appendLog();
    setInterval(appendLog, 2200);
  }

  function setupSketchForm() {
    const root = document.getElementById('nj-sketch');
    if (!root) return;
    const steps = Array.from(root.querySelectorAll('.nj-sketch__step'));
    const progress = root.querySelectorAll('.nj-sketch__progress span');
    const backBtn = root.querySelector('.nj-sketch__back');
    const nextBtn = root.querySelector('.nj-sketch__next');
    const okEl   = root.querySelector('#nj-sketch-success');
    let current = 0;

    function setStep(i) {
      steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
      progress.forEach((bar, idx) => bar.classList.toggle('done', idx <= i));
      backBtn.disabled = (i === 0);
      const isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'spedisci sketch →' : 'avanti →';
      current = i;
      if (i > 0) root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      okEl.className = 'nj-sketch__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'nj-sketch__success'; }

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
      const fd = new FormData(root.querySelector('#nj-sketch-form'));
      const out = {};
      ['name', 'email', 'phone', 'company', 'realtime_type', 'concurrent_users', 'frontend_stack', 'persistence', 'notes'].forEach((k) => {
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
        show('✓ Sketch ricevuto. Ti scrivo io entro 48h con: 1) stack realtime suggerito (Socket.io vs WebSocket native vs SSE vs WebRTC), 2) architettura per i tuoi concurrent users, 3) timeline 4-8 settimane, 4) cosa misurare in beta.', 'ok');
        nextBtn.textContent = 'inviato ✓';
      }

      openWhatsApp(answers);
      done();
      return;
    }

    setStep(0);
  }

  function init() {
    setupReveal();
    setupTerminal();
    setupSketchForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
