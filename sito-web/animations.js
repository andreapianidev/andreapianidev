/**
 * ANIMATIONS.JS - Gestione animazioni scroll
 * Andrea Piani Website
 */

(function() {
  'use strict';

  // Intersection Observer per animazioni allo scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Una volta visibile, smetti di osservare (animazione una volta sola)
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Inizializza le animazioni quando il DOM è pronto
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observer.observe(el));
  }

  // Aggiungi classe animate ai bottoni
  function initButtonAnimations() {
    const buttons = document.querySelectorAll('.btn, .button, button[type="submit"], a.btn-primary, a.btn-secondary');
    buttons.forEach(btn => {
      if (!btn.classList.contains('btn-animate')) {
        btn.classList.add('btn-animate');
      }
    });
  }

  // Aggiungi classe animate alle card
  function initCardAnimations() {
    const cards = document.querySelectorAll('.card, .pricing-card, .service-card, .feature-card');
    cards.forEach(card => {
      if (!card.classList.contains('card-animate')) {
        card.classList.add('card-animate');
      }
    });
  }

  // Aggiungi animazioni ai link
  function initLinkAnimations() {
    const links = document.querySelectorAll('.nav-link, .dropdown-item');
    links.forEach(link => {
      if (!link.classList.contains('link-animate')) {
        // Non aggiungere a tutti i link per non sovrascrivere gli stili esistenti
        // link.classList.add('link-animate');
      }
    });
  }

  // Inizializza tutto quando il DOM è caricato
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initScrollAnimations();
      initButtonAnimations();
      initCardAnimations();
      initLinkAnimations();
    });
  } else {
    // DOM già caricato
    initScrollAnimations();
    initButtonAnimations();
    initCardAnimations();
    initLinkAnimations();
  }

  // Aggiungi animazioni agli elementi quando vengono aggiunti dinamicamente
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.classList && node.classList.contains('scroll-animate')) {
            observer.observe(node);
          }
        }
      });
    });
  });

  // Osserva il body per elementi aggiunti dinamicamente
  if (document.body) {
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

})();
