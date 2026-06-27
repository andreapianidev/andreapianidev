/* slot-counter.js — aggiorna automaticamente il mese/anno nei badge "slot liberi"
   su tutte le pagine. Sostituisce solo il prefisso "Mese AAAA", preservando il
   resto del testo (es. "— 1 slot libero su 2"). Nessuna dipendenza. */
(function () {
  var MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  var RE_MESE = /^\s*(?:Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4}/i;

  function aggiorna() {
    var now = new Date();
    var label = MESI[now.getMonth()] + ' ' + now.getFullYear();
    var nodes = document.querySelectorAll('[data-slot-counter]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (RE_MESE.test(el.textContent)) {
        el.textContent = el.textContent.replace(RE_MESE, label);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aggiorna);
  } else {
    aggiorna();
  }
})();
