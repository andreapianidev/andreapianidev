/* gestionali-personalizzati-milano.js — reveal + wizard preventivo 5-step Milano */
(function () {
  'use strict';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() { requestAnimationFrame(function () { document.body.classList.add('is-loaded'); }); }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    var targets = document.querySelectorAll('.mi-reveal, .mi-offer__stack li, .mi-guarantee__card, .mi-proof__card, .mi-bigidea__card');
    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      targets.forEach(function (el) { el.classList.add('revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  function annotateStaggerOrder() {
    document.querySelectorAll('.mi-offer__stack li').forEach(function (el, i) { el.style.setProperty('--i', i); });
  }

  var FIELD_LABELS = {
    name: 'Nome', email: 'Email', phone: 'Telefono', company: 'Azienda',
    company_type: 'Tipo azienda', need: 'Cosa serve', current_state: 'Situazione attuale',
    budget: 'Budget indicativo', notes: 'Note'
  };

  var VALUE_LABELS = {
    pmi_produzione: 'PMI produzione / logistica',
    studio_professionale: 'Studio professionale',
    retail_moda: 'Retail / moda',
    agenzia_servizi: 'Agenzia / servizi',
    startup: 'Startup',
    gestionale: 'Gestionale su misura',
    app_mobile: 'App mobile iOS/Android',
    integrazione_erp: 'Integrazione ERP/CRM',
    migrazione_excel: 'Migrazione da Excel/Access',
    non_so: 'Non so ancora — da capire insieme',
    excel: 'Excel / Google Sheets',
    gestionale_legacy: 'Gestionale legacy',
    niente: 'Niente di strutturato',
    erp_da_integrare: 'ERP esistente da integrare',
    sotto_5k: 'Meno di 5.000 €',
    da_5_a_15k: '5.000 - 15.000 €',
    da_15_a_40k: '15.000 - 40.000 €',
    oltre_40k: 'Oltre 40.000 €',
    da_capire: 'Da capire insieme'
  };

  function labelFor(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function humanValue(val) {
    return VALUE_LABELS[val] || val;
  }

  function buildWhatsAppMessage(answers) {
    var msg = 'Ciao Andrea! Ho un’azienda a Milano, ho compilato il form sul sito e vorrei un preventivo.\n';
    Object.keys(answers).forEach(function (key) {
      var val = answers[key];
      val = (val == null ? '' : String(val)).trim();
      if (!val) return;
      msg += '\n• ' + labelFor(key) + ': ' + humanValue(val);
    });
    return msg;
  }

  function setupWizard() {
    var root = document.getElementById('mi-sprint');
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll('.mi-sprint__step'));
    var progress = root.querySelectorAll('.mi-sprint__progress span');
    var backBtn = root.querySelector('.mi-sprint__back');
    var nextBtn = root.querySelector('.mi-sprint__next');
    var okEl = root.querySelector('#sprint-success');
    var current = 0;

    function setStep(i) {
      steps.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
      progress.forEach(function (bar, idx) { bar.classList.toggle('done', idx <= i); });
      backBtn.disabled = (i === 0);
      var isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'invia richiesta →' : 'avanti →';
      current = i;
      var card = root.querySelector('.mi-sprint__form');
      if (card && i > 0) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function validateStep(i) {
      var step = steps[i];
      var requiredInputs = step.querySelectorAll('[required]');
      for (var k = 0; k < requiredInputs.length; k++) {
        var inp = requiredInputs[k];
        if (inp.type === 'radio') {
          var name = inp.name;
          var any = step.querySelector('[name="' + name + '"]:checked');
          if (!any) return 'Seleziona un’opzione per continuare.';
        } else if (!inp.value || (inp.type === 'email' && inp.value.indexOf('@') < 0)) {
          return 'Compila il campo "' + (inp.placeholder || inp.name) + '".';
        }
      }
      return null;
    }

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'mi-sprint__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'mi-sprint__success'; }

    backBtn.addEventListener('click', function (e) { e.preventDefault(); if (current > 0) setStep(current - 1); hide(); });
    nextBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var err = validateStep(current);
      if (err) { show(err, 'err'); return; }
      hide();
      if (current < steps.length - 1) { setStep(current + 1); return; }
      submit();
    });

    function readAnswers() {
      var fd = new FormData(root.querySelector('#sprint-form'));
      var out = {};
      ['company_type', 'need', 'current_state', 'budget'].forEach(function (k) { if (fd.get(k)) out[k] = String(fd.get(k)); });
      ['name', 'company', 'email', 'phone'].forEach(function (k) { if (fd.get(k)) out[k] = String(fd.get(k)); });
      return out;
    }

    function submit() {
      var answers = readAnswers();
      if (!answers.email || !answers.name) {
        show('Manca nome o email — torna allo step finale per completarli.', 'err');
        return;
      }
      nextBtn.disabled = true;
      nextBtn.textContent = 'invio...';

      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(buildWhatsAppMessage(answers)), '_blank');
      show('✓ Richiesta ricevuta. Ti scrivo io entro 48h con un preventivo scritto o un orario per una call di 30 minuti. Niente pitch commerciale: ti dico onestamente se sono la persona giusta per il tuo progetto.', 'ok');
      nextBtn.textContent = 'inviato ✓';
    }

    setStep(0);
  }

  function init() {
    annotateStaggerOrder();
    setupReveal();
    setupWizard();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
