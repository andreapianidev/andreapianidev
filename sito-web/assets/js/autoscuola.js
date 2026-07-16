/* autoscuola.js — page-load + reveal on scroll per software-autoscuola.html.
   Vanilla JS, nessuna dipendenza. Rispetta prefers-reduced-motion. */
(function () {
  'use strict';

  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- page load ----
  function markLoaded() {
    requestAnimationFrame(function () { body.classList.add('is-loaded'); });
  }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);

  // ---- reveal ----
  var targets = document.querySelectorAll('.as-reveal, .as-ledger, .as-checks, .as-card');
  if (!('IntersectionObserver' in window) || reduced) {
    for (var i = 0; i < targets.length; i++) targets[i].classList.add('revealed');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
})();
