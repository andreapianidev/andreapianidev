/* gestionale-osteopati.js — reveal + demo PhysioStudio osteopati 5-step */
(function () {
  'use strict';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupReveal() {
    var items = document.querySelectorAll('.os-reveal, .os-offer__stack li, .os-guarantee__card, .os-proof__card, .os-bigidea__card, .os-related__card');
    if (!('IntersectionObserver' in window) || reducedMotion) {
      items.forEach(function (item) { item.classList.add('revealed'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    items.forEach(function (item) { observer.observe(item); });
  }

  function setupWizard() {
    var root = document.getElementById('os-sprint');
    if (!root) return;
    var form = root.querySelector('form');
    var steps = Array.prototype.slice.call(root.querySelectorAll('.os-sprint__step'));
    var bars = root.querySelectorAll('.os-sprint__progress span');
    var back = root.querySelector('.os-sprint__back');
    var next = root.querySelector('.os-sprint__next');
    var status = root.querySelector('.os-sprint__success');
    var current = 0;
    var fieldLabels = { studio_mode: 'Studio', treatments_week: 'Trattamenti settimanali', current_tool: 'Strumento attuale', main_pain: 'Priorità', name: 'Nome', studio: 'Nome studio', email: 'Email', phone: 'Telefono' };

    function show(message, error) { status.textContent = message; status.className = 'os-sprint__success visible ' + (error ? 'err' : 'ok'); }
    function clear() { status.className = 'os-sprint__success'; }
    function setStep(index) {
      current = index;
      steps.forEach(function (step, i) { step.classList.toggle('active', i === index); });
      bars.forEach(function (bar, i) { bar.classList.toggle('done', i <= index); });
      back.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? 'richiedi la demo →' : 'avanti →';
    }
    function validate() {
      var required = steps[current].querySelectorAll('[required]');
      for (var i = 0; i < required.length; i += 1) {
        var field = required[i];
        if (field.type === 'radio' && !steps[current].querySelector('[name="' + field.name + '"]:checked')) return 'Seleziona un’opzione per continuare.';
        if (field.type !== 'radio' && !field.checkValidity()) { field.focus(); return 'Controlla il campo indicato.'; }
      }
      return '';
    }
    function submit() {
      var message = 'Ciao Andrea! Vorrei una demo di PhysioStudio per osteopati.\n';
      new FormData(form).forEach(function (value, key) { if (String(value).trim()) message += '\n• ' + (fieldLabels[key] || key) + ': ' + value; });
      window.open('https://wa.me/393516248936?text=' + encodeURIComponent(message), '_blank', 'noopener');
      next.disabled = true;
      next.textContent = 'richiesta inviata ✓';
      show('✓ Richiesta pronta. Si apre WhatsApp con il riepilogo; ti propongo un orario entro 48 ore.', false);
    }
    back.addEventListener('click', function () { if (current > 0) { clear(); setStep(current - 1); } });
    next.addEventListener('click', function () {
      var error = validate();
      if (error) { show(error, true); return; }
      clear();
      if (current < steps.length - 1) setStep(current + 1); else submit();
    });
    setStep(0);
  }

  function init() {
    document.body.classList.add('is-loaded');
    document.querySelectorAll('.os-offer__stack li').forEach(function (item, index) { item.style.setProperty('--i', index); });
    setupReveal();
    setupWizard();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
