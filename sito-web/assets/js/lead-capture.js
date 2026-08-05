/* lead-capture.js — rete di sicurezza per TUTTI i form del sito.
 *
 * I form del sito aprono WhatsApp con window.open(wa.me...): se il visitatore
 * non completa l'invio in chat, o se il popup viene bloccato, il lead si perde.
 * Questo script ascolta il submit di ogni form (in fase di CAPTURE, quindi PRIMA
 * del gestore che apre WhatsApp), serializza i campi e li invia a /api/lead, che
 * manda l'email ad Andrea. Non fa preventDefault: il comportamento WhatsApp resta
 * identico. Se il popup fallisce, mostra comunque un fallback cliccabile.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/lead';
  var recent = new WeakMap(); // anti doppio-invio per form

  function isLeadForm(form) {
    if (!form || form.dataset.noLeadCapture === '1') return false;
    // Deve contenere almeno un campo email/telefono/testo significativo
    return !!form.querySelector(
      'input[type="email"],[name="email"],[name="mail"],' +
      'input[type="tel"],[name="telefono"],[name="tel"],[name="phone"],' +
      'textarea,[name="messaggio"],[name="nome"],[name="name"]'
    );
  }

  /* Informativa breve ex Art. 13 GDPR sotto ogni form che invia davvero i dati
   * al server. Deve stare accanto al punto di raccolta, non solo in fondo alla
   * pagina: l'utente deve sapere DOVE finiscono i dati mentre li digita. */
  function injectPrivacyNote(form) {
    if (form.querySelector('.lead-privacy-note')) return;
    var p = document.createElement('p');
    p.className = 'lead-privacy-note';
    p.style.cssText = 'font-size:.8em;line-height:1.55;opacity:.72;margin:.9rem 0 0;color:inherit;';
    p.innerHTML = 'I dati che inserisci vengono inviati via email al titolare ' +
      '<strong>Andrea Piani</strong> (tramite Resend e Gmail) al momento dell\'invio del modulo, ' +
      'per rispondere alla tua richiesta (art. 6.1.b GDPR — misure precontrattuali). ' +
      'Se prosegui su WhatsApp, il messaggio transita anche da Meta. ' +
      'Conservazione 24 mesi. Dettagli, destinatari e come esercitare i tuoi diritti: ' +
      '<a href="/privacy-policy.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">Privacy Policy</a>.';
    form.appendChild(p);
  }

  function injectHoneypot(form) {
    if (form.querySelector('[name="website_url"]')) return;
    var hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'website_url';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0;';
    form.appendChild(hp);
  }

  function serialize(form) {
    var out = {};
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      var v = (value == null ? '' : String(value)).trim();
      if (!v) return;
      if (out[key] === undefined) out[key] = v;
      else if (Array.isArray(out[key])) out[key].push(v);
      else out[key] = [out[key], v];
    });
    out._page = location.pathname.replace(/^\//, '') || 'index.html';
    out._form = form.id || '(senza-id)';
    return out;
  }

  function send(form) {
    var now = Date.now();
    if (recent.get(form) && now - recent.get(form) < 4000) return; // throttle
    recent.set(form, now);

    var data = serialize(form);
    // niente da inviare oltre ai campi tecnici
    var keys = Object.keys(data).filter(function (k) { return k[0] !== '_'; });
    if (!keys.length) return;

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) { /* best effort */ }
  }

  function onSubmitCapture(e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement) || !isLeadForm(form)) return;
    // Se il form non è valido, il gestore originale mostrerà gli errori e non
    // aprirà WhatsApp: in quel caso non inviamo nemmeno l'email.
    if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;
    send(form);
  }

  function init() {
    // honeypot + informativa su tutti i form-lead già presenti
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      if (isLeadForm(forms[i])) {
        injectHoneypot(forms[i]);
        injectPrivacyNote(forms[i]);
      }
    }
    // capture-phase: gira prima dei gestori bubble che aprono WhatsApp
    document.addEventListener('submit', onSubmitCapture, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
