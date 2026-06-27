/**
 * POPUP MENU LOADER - Sistema Centralizzato
 * Carica il popup menu da un file esterno e lo inserisce in tutte le pagine
 */

(function() {
    'use strict';

    // Funzione per caricare il popup menu
    function loadPopupMenu() {
        // Fetch del popup menu
        fetch('popup-menu.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Impossibile caricare popup-menu.html');
                }
                return response.text();
            })
            .then(html => {
                // Crea un div temporaneo per parsare l'HTML
                const temp = document.createElement('div');
                temp.innerHTML = html;

                // Estrai il popup
                const popup = temp.querySelector('#serviziPopup');

                if (popup) {
                    // Appende il popup al body
                    document.body.appendChild(popup);

                    // Inietta hamburger menu mobile (visibile solo <720px via CSS)
                    injectMobileHamburger();

                    // Inizializza gli eventi
                    initializePopupEvents();

                    console.log('✅ Popup menu caricato con successo');
                } else {
                    console.error('❌ Popup element non trovato in popup-menu.html');
                }
            })
            .catch(error => {
                console.error('❌ Errore caricamento popup menu:', error);
            });
    }

    // Inietta hamburger menu mobile per tutte le pagine
    // (le 18 pagine Sabri Suby nascondono i loro nav links su mobile senza
    // sostituto — questo fix universale risolve il problema in un colpo solo)
    function injectMobileHamburger() {
        if (document.getElementById('aaiMobileHamburger')) return; // already injected
        const btn = document.createElement('button');
        btn.id = 'aaiMobileHamburger';
        btn.className = 'aai-mobile-hamburger';
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', 'Apri menu servizi');
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.innerHTML = '<span class="aai-mobile-hamburger__bar"></span><span class="aai-mobile-hamburger__bar"></span><span class="aai-mobile-hamburger__bar"></span><span class="aai-mobile-hamburger__lbl">menu</span>';
        btn.addEventListener('click', function() {
            if (typeof window.openServiziPopup === 'function') {
                window.openServiziPopup();
            }
        });
        document.body.appendChild(btn);
    }

    // Funzione per inizializzare gli eventi del popup
    function initializePopupEvents() {
        const popup = document.getElementById('serviziPopup');
        if (!popup) return;

        // ESC key per chiudere
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && popup.classList.contains('active')) {
                closeServiziPopup();
            }
        });
    }

    // Carica il popup quando il DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPopupMenu);
    } else {
        loadPopupMenu();
    }
})();

// Funzioni globali per aprire/chiudere il popup
window.openServiziPopup = function() {
    const popup = document.getElementById('serviziPopup');
    if (popup) {
        popup.classList.add('active');
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeServiziPopup = function() {
    const popup = document.getElementById('serviziPopup');
    if (popup) {
        popup.classList.remove('active');
        popup.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Toggle popup
window.toggleServiziPopup = function() {
    const popup = document.getElementById('serviziPopup');
    if (popup && popup.classList.contains('active')) {
        closeServiziPopup();
    } else {
        openServiziPopup();
    }
};
