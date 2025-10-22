/**
 * Cookie Consent Banner - GDPR Compliant
 * Andrea Piani - www.andreapiani.com
 * Versione 1.0 - Ottobre 2025
 */

(function() {
  'use strict';

  // Configurazione
  const CONFIG = {
    cookieName: 'cookie_consent',
    cookieDuration: 365, // giorni
    analyticsId: null, // Inserire GA4 ID quando disponibile (es. 'G-XXXXXXXXXX')
  };

  // Controlla se il consenso è già stato dato
  function getConsent() {
    const consent = getCookie(CONFIG.cookieName);
    return consent ? JSON.parse(consent) : null;
  }

  // Salva il consenso
  function saveConsent(analytics) {
    const consent = {
      necessary: true, // Sempre true (tecnici)
      analytics: analytics,
      timestamp: new Date().toISOString()
    };
    setCookie(CONFIG.cookieName, JSON.stringify(consent), CONFIG.cookieDuration);
    return consent;
  }

  // Get cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Set cookie
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  // Delete cookie
  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  // Inizializza Google Analytics solo se consentito
  function initAnalytics() {
    if (!CONFIG.analyticsId) return;

    // Carica script GA4
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.analyticsId}`;
    document.head.appendChild(script);

    // Configura GA4
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', CONFIG.analyticsId, {
      'anonymize_ip': true,
      'cookie_flags': 'SameSite=None;Secure'
    });

    console.log('✅ Google Analytics inizializzato');
  }

  // Rimuove Google Analytics
  function removeAnalytics() {
    // Rimuovi cookie GA
    const gaCookies = ['_ga', '_gid', '_gat', '_gat_gtag_' + CONFIG.analyticsId];
    gaCookies.forEach(cookie => {
      deleteCookie(cookie);
      // Prova anche con dominio
      document.cookie = `${cookie}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.andreapiani.com`;
    });

    // Disabilita GA
    if (CONFIG.analyticsId) {
      window['ga-disable-' + CONFIG.analyticsId] = true;
    }

    console.log('❌ Google Analytics disabilitato');
  }

  // Crea il banner HTML
  function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.innerHTML = `
      <div class="cookie-consent-overlay"></div>
      <div class="cookie-consent-modal">
        <div class="cookie-consent-content">
          <h3>🍪 Questo sito utilizza cookie</h3>
          <p>
            Utilizziamo cookie tecnici necessari per il funzionamento del sito e, previo tuo consenso,
            cookie analitici per migliorare l'esperienza utente.
          </p>
          <p style="font-size: 0.9rem; margin-top: 1rem;">
            <a href="privacy-policy.html" target="_blank" style="color: #149dcc;">Privacy Policy</a> ·
            <a href="cookie-policy.html" target="_blank" style="color: #149dcc;">Cookie Policy</a>
          </p>
          <div class="cookie-consent-buttons">
            <button id="cookie-accept-all" class="cookie-btn cookie-btn-primary">
              ✅ Accetta Tutti
            </button>
            <button id="cookie-reject" class="cookie-btn cookie-btn-secondary">
              ❌ Solo Necessari
            </button>
          </div>
        </div>
      </div>
    `;

    // Aggiungi stili CSS inline
    const style = document.createElement('style');
    style.textContent = `
      #cookie-consent-banner {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cookie-consent-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(3px);
      }
      .cookie-consent-modal {
        position: relative;
        background: #ffffff;
        max-width: 550px;
        width: 90%;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from {
          transform: translateY(50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .cookie-consent-content {
        padding: 2rem;
      }
      .cookie-consent-content h3 {
        margin: 0 0 1rem 0;
        color: #000;
        font-size: 1.5rem;
      }
      .cookie-consent-content p {
        margin: 0 0 0.5rem 0;
        color: #333;
        line-height: 1.6;
        font-size: 1rem;
      }
      .cookie-consent-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
      }
      .cookie-btn {
        flex: 1;
        padding: 0.9rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 150px;
      }
      .cookie-btn-primary {
        background: #149dcc;
        color: #ffffff;
      }
      .cookie-btn-primary:hover {
        background: #0d7a9e;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(20, 157, 204, 0.4);
      }
      .cookie-btn-secondary {
        background: #f0f0f0;
        color: #333;
      }
      .cookie-btn-secondary:hover {
        background: #e0e0e0;
        transform: translateY(-2px);
      }
      @media (max-width: 500px) {
        .cookie-consent-content {
          padding: 1.5rem;
        }
        .cookie-consent-content h3 {
          font-size: 1.3rem;
        }
        .cookie-consent-buttons {
          flex-direction: column;
        }
        .cookie-btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);

    // Aggiungi al body
    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('cookie-accept-all').addEventListener('click', () => {
      acceptAllCookies();
    });

    document.getElementById('cookie-reject').addEventListener('click', () => {
      rejectNonEssentialCookies();
    });
  }

  // Accetta tutti i cookie
  function acceptAllCookies() {
    saveConsent(true);
    removeBanner();
    initAnalytics();
  }

  // Rifiuta cookie non necessari
  function rejectNonEssentialCookies() {
    saveConsent(false);
    removeBanner();
    removeAnalytics();
  }

  // Rimuovi banner
  function removeBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Aggiungi link "Gestisci Cookie" nel footer (se esiste)
  // DISABILITATO - il link è già presente manualmente nel footer
  function addManageLink() {
    // Non aggiungere link automatico, è già nel footer HTML
    return;
  }

  // Inizializzazione
  function init() {
    // Controlla se il consenso è già stato dato
    const consent = getConsent();

    if (!consent) {
      // Nessun consenso salvato, mostra banner
      createBanner();
    } else {
      // Consenso esistente
      if (consent.analytics) {
        initAnalytics();
      } else {
        removeAnalytics();
      }
    }

    // Aggiungi link gestione cookie
    addManageLink();
  }

  // Esegui quando DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Esponi funzioni globali per uso manuale
  window.CookieConsent = {
    accept: acceptAllCookies,
    reject: rejectNonEssentialCookies,
    reset: function() {
      deleteCookie(CONFIG.cookieName);
      location.reload();
    },
    getConsent: getConsent
  };

})();
