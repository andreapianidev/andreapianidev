(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealItems = document.querySelectorAll('[data-reveal]');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px' });

    revealItems.forEach(function (item) { observer.observe(item); });
  }

  var routeSteps = Array.prototype.slice.call(document.querySelectorAll('[data-route-step]'));
  if (!reducedMotion && routeSteps.length) {
    var activeIndex = 0;
    window.setInterval(function () {
      activeIndex = (activeIndex + 1) % routeSteps.length;
      routeSteps.forEach(function (step, index) {
        step.classList.toggle('is-active', index === activeIndex);
        step.classList.toggle('is-complete', index < activeIndex);
      });
    }, 1600);
  } else {
    routeSteps.forEach(function (step) { step.classList.add('is-complete'); });
  }

  document.querySelectorAll('.wa-faq details').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      document.querySelectorAll('.wa-faq details[open]').forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

})();
