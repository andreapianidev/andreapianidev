/* sviluppo-app-social-network.js — reveal + brief social 5-step */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.getElementById('sn-sprint');

  function markLoaded() {
    requestAnimationFrame(function () { document.body.classList.add('is-loaded'); });
  }

  function setupReveal() {
    var targets = document.querySelectorAll('.sn-reveal, .sn-offer__stack li, .sn-guarantee__card, .sn-proof__card, .sn-cost-card, .sn-area-card, .sn-related__card');
    if (!('IntersectionObserver' in window) || reducedMotion) {
      targets.forEach(function (item) { item.classList.add('revealed'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach(function (item) { observer.observe(item); });
  }

  var labels = {
    stage: 'Stato del progetto', social_type: 'Tipo di social', must_features: 'Feature irrinunciabili',
    budget: 'Budget realistico', name: 'Nome', project: 'Progetto', email: 'Email', phone: 'Telefono'
  };

  var values = {
    solo_idea: 'Solo idea', mockup_pitch: 'Mockup / pitch pronti', mvp_da_rifare: 'MVP da rifare', live_da_scalare: 'App live da scalare',
    nicchia_verticale: 'Nicchia verticale', community_marketplace: 'Community + marketplace', dating_matching: 'Dating / matching', contenuti_video: 'Contenuti video', altro: 'Altro / ibrido',
    feed_profili: 'Feed + profili', chat: 'Chat', video: 'Video', eventi_gruppi: 'Eventi e gruppi',
    sotto_15k: 'Meno di 15.000 €', '15_30k': '15.000–30.000 €', '30_80k': '30.000–80.000 €', '80k_plus': '80.000 €+', da_capire: 'Da capire insieme'
  };

  function setupWizard() {
    if (!root) return;
    var form = root.querySelector('form');
    var steps = Array.prototype.slice.call(root.querySelectorAll('.sn-sprint__step'));
    var progress = root.querySelectorAll('.sn-sprint__progress span');
    var back = root.querySelector('.sn-sprint__back');
    var next = root.querySelector('.sn-sprint__next');
    var status = root.querySelector('.sn-sprint__success');
    var current = 0;

    function showStatus(message, error) {
      status.textContent = message;
      status.className = 'sn-sprint__success visible ' + (error ? 'err' : 'ok');
    }

    function clearStatus() { status.className = 'sn-sprint__success'; }

    function setStep(index) {
      current = index;
      steps.forEach(function (step, i) { step.classList.toggle('active', i === index); });
      progress.forEach(function (bar, i) { bar.classList.toggle('done', i <= index); });
      back.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? 'invia il brief →' : 'avanti →';
      if (index > 0) root.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }

    function validate() {
      var fields = steps[current].querySelectorAll('[required]');
      for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        if (field.type === 'radio' && !steps[current].querySelector('[name="' + field.name + '"]:checked')) return 'Seleziona un’opzione per continuare.';
        if (field.type !== 'radio' && !field.checkValidity()) {
          field.focus();
          return 'Controlla il campo “' + (field.placeholder || field.name) + '”.';
        }
      }
      return '';
    }

    function submit() {
      var data = new FormData(form);
      var message = 'Ciao Andrea! Ho compilato il brief per un’app social/community.\n';
      data.forEach(function (value, key) {
        if (!String(value).trim()) return;
        message += '\n• ' + (labels[key] || key) + ': ' + (values[value] || value);
      });
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(message), '_blank', 'noopener');
      next.disabled = true;
      next.textContent = 'brief inviato ✓';
      showStatus('✓ Brief pronto. Si apre WhatsApp con il riepilogo; ti rispondo entro 48 ore con costi e tagli di scope concreti.', false);
    }

    back.addEventListener('click', function () { if (current > 0) { clearStatus(); setStep(current - 1); } });
    next.addEventListener('click', function () {
      var error = validate();
      if (error) { showStatus(error, true); return; }
      clearStatus();
      if (current < steps.length - 1) setStep(current + 1);
      else submit();
    });
    setStep(0);
  }

  function init() {
    document.querySelectorAll('.sn-offer__stack li').forEach(function (item, index) { item.style.setProperty('--i', index); });
    setupReveal();
    setupWizard();
  }

  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
