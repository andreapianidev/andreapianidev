/* gestionale-bed-and-breakfast.js — reveal caldi + Demo B&B Facile 5-step + WhatsApp submit */
(function () {
  'use strict';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markLoaded() { requestAnimationFrame(function () { document.body.classList.add('is-loaded'); }); }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  function setupReveal() {
    var targets = document.querySelectorAll('.bb-reveal, .bb-offer__stack li, .bb-guarantee__card, .bb-proof__card, .bb-bigidea__card, .bb-related__card');
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
    document.querySelectorAll('.bb-offer__stack li').forEach(function (el, i) { el.style.setProperty('--i', i); });
  }

  var FIELD_LABELS = {
    name: 'Nome', email: 'Email', phone: 'Telefono',
    structure: 'Struttura',
    structure_type: 'Tipo struttura',
    units_count: 'Camere/unità',
    sales_channels: 'Canali di vendita oggi',
    main_pain: 'Dolore più grande'
  };

  var VALUE_LABELS = {
    bnb: 'B&B', affittacamere: 'Affittacamere / guest house',
    case_vacanze: 'Case vacanze multiple', agriturismo: 'Agriturismo con camere',
    u_1_3: '1-3 camere/unità', u_4_6: '4-6 camere/unità', u_7_12: '7-12 camere/unità', u_13plus: '13+ camere/unità',
    solo_booking: 'Solo Booking.com', booking_airbnb: 'Booking + Airbnb',
    piu_portali: 'Booking + Airbnb + altri portali', anche_diretta: 'Portali + prenotazione diretta',
    overbooking: 'Overbooking / doppie prenotazioni', commissioni: 'Commissioni OTA troppo alte',
    burocrazia: 'Burocrazia (Alloggiati, tassa soggiorno, ISTAT)', pulizie: 'Pulizie e cambi da coordinare',
    tariffe: 'Tariffe statiche, aggiornare i portali è un lavoro'
  };

  function labelFor(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function prettyValue(val) {
    return VALUE_LABELS[val] || val;
  }

  function buildWhatsAppMessage(answers) {
    var msg = 'Ciao Andrea! Ho un B&B e ho compilato il form per una demo di B&B Facile.\n';
    Object.keys(answers).forEach(function (key) {
      var val = answers[key];
      if (Array.isArray(val)) val = val.filter(Boolean).join(', ');
      else val = (val == null ? '' : String(val)).trim();
      if (!val) return;
      msg += '\n• ' + labelFor(key) + ': ' + prettyValue(val);
    });
    return msg;
  }

  function setupDemoForm() {
    var root = document.getElementById('bb-sprint');
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll('.bb-sprint__step'));
    var progress = root.querySelectorAll('.bb-sprint__progress span');
    var backBtn = root.querySelector('.bb-sprint__back');
    var nextBtn = root.querySelector('.bb-sprint__next');
    var okEl = root.querySelector('#sprint-success');
    var current = 0;

    function setStep(i) {
      steps.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
      progress.forEach(function (bar, idx) { bar.classList.toggle('done', idx <= i); });
      backBtn.disabled = (i === 0);
      var isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? 'invia richiesta demo →' : 'avanti →';
      current = i;
      var card = root.querySelector('.bb-sprint__form');
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
      okEl.className = 'bb-sprint__success visible ' + (kind === 'err' ? 'err' : 'ok');
    }
    function hide() { okEl.className = 'bb-sprint__success'; }

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
      ['structure_type', 'units_count', 'sales_channels', 'main_pain'].forEach(function (k) { if (fd.get(k)) out[k] = String(fd.get(k)); });
      ['name', 'structure', 'email', 'phone'].forEach(function (k) { if (fd.get(k)) out[k] = String(fd.get(k)); });
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
        show('✓ Richiesta ricevuta. Ti scrivo io entro 48h con un orario per la demo live 30 minuti di B&B Facile, con dati di prova di una struttura come la tua. Niente pitch: se non è il caso giusto te lo dico.', 'ok');
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
