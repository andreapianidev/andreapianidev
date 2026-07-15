/* gestionale-tabaccheria.js — reveal + Demo Tabaccheria Facile 5-step */
(function () {
  'use strict';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() { requestAnimationFrame(function () { document.body.classList.add('is-loaded'); }); }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    var targets = document.querySelectorAll('.tb-reveal, .tb-offer__stack li, .tb-guarantee__card, .tb-proof__card, .tb-bigidea__card');
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
    document.querySelectorAll('.tb-offer__stack li').forEach(function (el, i) { el.style.setProperty('--i', i); });
  }

  var FIELD_LABELS = {
    name: 'Nome', nome: 'Nome', email: 'Email', phone: 'Telefono', telefono: 'Telefono',
    tabaccheria: 'Tabaccheria', business_type: 'Tipo attività', receipts_day: 'Scontrini al giorno',
    current_tool: 'Cosa usa oggi', main_pain: 'Dolore più grande'
  };

  function labelFor(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function buildWhatsAppMessage(answers) {
    var msg = 'Ciao Andrea! Ho compilato il form Tabaccheria Facile sul sito e vorrei la demo gratuita.\n';
    Object.keys(answers).forEach(function (key) {
      var val = answers[key];
      if (Array.isArray(val)) val = val.filter(Boolean).join(', ');
      else val = (val == null ? '' : String(val)).trim();
      if (!val) return;
      msg += '\n• ' + labelFor(key) + ': ' + val;
    });
    return msg;
  }

  function setupDemoForm() {
    var root = document.getElementById('tb-sprint');
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll('.tb-sprint__step'));
    var progress = root.querySelectorAll('.tb-sprint__progress span');
    var backBtn = root.querySelector('.tb-sprint__back');
    var nextBtn = root.querySelector('.tb-sprint__next');
    var okEl = root.querySelector('#sprint-success');
    var current = 0;

    function setStep(i) {
      steps.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
      progress.forEach(function (bar, idx) { bar.classList.toggle('done', idx <= i); });
      backBtn.disabled = (i === 0);
      var isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'invia richiesta demo →' : 'avanti →';
      current = i;
      var card = root.querySelector('.tb-sprint__form') || root;
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
          if (!any) return 'Seleziona un\'opzione per continuare.';
        } else if (!inp.value || (inp.type === 'email' && inp.value.indexOf('@') < 0)) {
          return 'Compila il campo "' + (inp.placeholder || inp.name) + '".';
        }
      }
      return null;
    }

    function show(msg, kind) {
      okEl.textContent = msg;
      okEl.className = 'tb-sprint__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'tb-sprint__success'; }

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
      ['name', 'email', 'phone', 'tabaccheria'].forEach(function (k) { if (fd.get(k)) out[k] = String(fd.get(k)); });
      ['business_type', 'receipts_day', 'current_tool', 'main_pain'].forEach(function (k) { if (fd.get(k)) out[k] = String(fd.get(k)); });
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

      function done() {
        show('✓ Richiesta ricevuta. Ti scrivo io entro 48h per la demo live 30min di Tabaccheria Facile con dati di prova di una tabaccheria fittizia. Niente pitch: vedi se è il caso giusto per il tuo banco.', 'ok');
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
    setupDemoForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
