/* Beauty CRM — Page interactions: slot counter, 5-step form, smooth nav */
(function () {
  'use strict';

  // ---------- Smooth scroll ----------
  function bindSmoothScroll() {
    document.querySelectorAll('[data-be-scroll]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = a.getAttribute('data-be-scroll');
        const node = document.getElementById(target);
        if (!node) return;
        e.preventDefault();
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ---------- 5-step form ----------
  function bindForm() {
    const form = document.getElementById('be-trial-form');
    if (!form) return;
    const steps = form.querySelectorAll('.be-step');
    const dots = form.querySelectorAll('.be-form-step-dot');
    const btnPrev = form.querySelector('[data-be-prev]');
    const btnNext = form.querySelector('[data-be-next]');
    const btnSubmit = form.querySelector('[data-be-submit]');
    const success = document.getElementById('be-form-success');
    const errorBox = form.querySelector('.be-form-error');

    const state = {
      idx: 0,
      attivita: null,
      postazioni: null,
      gestionaleAttuale: null,
      dolore: null,
      nome: '',
      attivitaNome: '',
      email: '',
      telefono: ''
    };

    function showError(msg) {
      if (!errorBox) return;
      errorBox.textContent = msg;
      errorBox.classList.add('is-visible');
      setTimeout(() => errorBox.classList.remove('is-visible'), 4500);
    }

    function render() {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === state.idx));
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === state.idx);
        d.classList.toggle('is-done', i < state.idx);
      });
      btnPrev.style.visibility = state.idx === 0 ? 'hidden' : 'visible';
      btnNext.style.display = state.idx === steps.length - 1 ? 'none' : 'inline-flex';
      btnSubmit.style.display = state.idx === steps.length - 1 ? 'inline-flex' : 'none';
    }

    function validateStep() {
      switch (state.idx) {
        case 0: return !!state.attivita || 'Seleziona il tipo di attività.';
        case 1: return !!state.postazioni || 'Seleziona il numero di postazioni.';
        case 2: return !!state.gestionaleAttuale || 'Seleziona cosa usi oggi.';
        case 3: return !!state.dolore || 'Seleziona il dolore principale.';
        case 4: {
          if (!state.nome.trim()) return 'Inserisci il tuo nome.';
          if (!state.attivitaNome.trim()) return 'Inserisci nome del tuo centro/salone.';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) return 'Inserisci una email valida.';
          return true;
        }
      }
      return true;
    }

    // Option pickers
    form.querySelectorAll('[data-be-opt-group]').forEach((group) => {
      const field = group.getAttribute('data-be-opt-group');
      group.querySelectorAll('.be-opt').forEach((opt) => {
        opt.addEventListener('click', () => {
          group.querySelectorAll('.be-opt').forEach((o) => o.classList.remove('is-selected'));
          opt.classList.add('is-selected');
          state[field] = opt.getAttribute('data-value');
        });
      });
    });

    // Text inputs
    const inNome = form.querySelector('[name="nome"]');
    const inAtt = form.querySelector('[name="attivita_nome"]');
    const inEmail = form.querySelector('[name="email"]');
    const inTel = form.querySelector('[name="telefono"]');
    if (inNome) inNome.addEventListener('input', (e) => (state.nome = e.target.value));
    if (inAtt) inAtt.addEventListener('input', (e) => (state.attivitaNome = e.target.value));
    if (inEmail) inEmail.addEventListener('input', (e) => (state.email = e.target.value));
    if (inTel) inTel.addEventListener('input', (e) => (state.telefono = e.target.value));

    btnNext.addEventListener('click', (e) => {
      e.preventDefault();
      const ok = validateStep();
      if (ok !== true) { showError(ok); return; }
      if (state.idx < steps.length - 1) { state.idx++; render(); }
    });
    btnPrev.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.idx > 0) { state.idx--; render(); }
    });

    btnSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const ok = validateStep();
      if (ok !== true) { showError(ok); return; }
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Apertura WhatsApp…';

      const fields = {
        Nome: state.nome.trim(),
        Attività: state.attivitaNome.trim(),
        Email: state.email.trim(),
        Telefono: state.telefono.trim(),
        'Tipo attività': state.attivita,
        Postazioni: state.postazioni,
        'Gestionale attuale': state.gestionaleAttuale,
        'Dolore principale': state.dolore
      };
      let msg = 'Ciao Andrea! Ho compilato il form sul sito e vorrei essere ricontattato.\n';
      Object.keys(fields).forEach((label) => {
        const val = fields[label];
        if (val) msg += '\n• ' + label + ': ' + val;
      });
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(msg), '_blank');

      form.style.display = 'none';
      if (success) success.classList.add('is-visible');
    });

    render();
  }

  // ---------- Init ----------
  function init() {
    bindSmoothScroll();
    bindForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
