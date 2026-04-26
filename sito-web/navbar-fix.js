/**
 * Navbar Hamburger Icon Fix - Andrea Piani Website
 * Aggiunge automaticamente lo span necessario per l'icona hamburger a 3 linee
 */

(function() {
  'use strict';

  // Aspetta che il DOM sia completamente caricato
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarFix);
  } else {
    initNavbarFix();
  }

  function initNavbarFix() {
    // Trova tutti gli elementi navbar-toggler-icon
    const togglerIcons = document.querySelectorAll('.navbar-toggler-icon');

    togglerIcons.forEach(function(icon) {
      // Controlla se lo span è già presente
      if (icon.querySelector('span')) {
        return; // Skip se già presente
      }

      // Aggiungi lo span per la linea centrale dell'hamburger
      const span = document.createElement('span');
      icon.appendChild(span);

      console.log('✅ Navbar hamburger icon fixed');
    });
  }

})();

/**
 * POPUP MEGA MENU SERVIZI
 * Funzioni per aprire/chiudere il popup
 */

function openServiziPopup() {
  const popup = document.getElementById('serviziPopup');
  if (popup) {
    popup.classList.add('active');
    document.body.style.overflow = 'hidden'; // Blocca scroll della pagina
    console.log('✅ Servizi popup opened');
  }
}

function closeServiziPopup() {
  const popup = document.getElementById('serviziPopup');
  if (popup) {
    popup.classList.remove('active');
    document.body.style.overflow = ''; // Ripristina scroll
    console.log('✅ Servizi popup closed');
  }
}

// Chiudi popup con tasto ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeServiziPopup();
  }
});
