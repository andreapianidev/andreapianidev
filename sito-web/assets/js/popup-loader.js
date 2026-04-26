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
