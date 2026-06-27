/* WhatsApp floating button — sempre visibile in basso a destra.
   Self-contained: inietta stile + bottone, nessuna dipendenza.
   Numero: +39 351 624 8936 */
(function () {
  if (window.__waFloatLoaded) return;        // evita doppia iniezione
  window.__waFloatLoaded = true;

  var NUMBER = "393516248936";
  var TEXT = encodeURIComponent("Ciao Andrea, ho visto il tuo sito e vorrei qualche informazione.");
  var HREF = "https://wa.me/" + NUMBER + "?text=" + TEXT;

  var css = '' +
    '.wa-float{position:fixed;right:20px;bottom:20px;z-index:99999;width:60px;height:60px;' +
    'border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;text-decoration:none;' +
    'transition:transform .2s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent}' +
    '.wa-float:hover{transform:scale(1.08);box-shadow:0 8px 26px rgba(37,211,102,.45)}' +
    '.wa-float:active{transform:scale(.96)}' +
    '.wa-float svg{width:34px;height:34px;fill:#fff;display:block}' +
    '.wa-float::before{content:"";position:absolute;inset:0;border-radius:50%;background:#25d366;' +
    'z-index:-1;animation:wa-pulse 2.4s ease-out infinite}' +
    '@keyframes wa-pulse{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(1.9);opacity:0}}' +
    '@media (max-width:600px){.wa-float{right:16px;bottom:16px;width:54px;height:54px}.wa-float svg{width:30px;height:30px}}' +
    '@media (prefers-reduced-motion:reduce){.wa-float::before{animation:none}}';

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var a = document.createElement("a");
  a.className = "wa-float";
  a.href = HREF;
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", "Scrivici su WhatsApp");
  a.title = "Scrivici su WhatsApp";
  a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C9.42 3 4.06 8.36 4.06 14.98c0 2.1.55 4.16 1.6 5.97L4 29l8.24-1.62a11.9 11.9 0 0 0 3.8.62h.01c6.62 0 11.98-5.36 11.98-11.98S22.66 3 16.04 3zm0 21.93h-.01c-1.18 0-2.34-.32-3.35-.92l-.24-.14-4.89.96.98-4.77-.16-.25a9.94 9.94 0 0 1-1.52-5.27c0-5.5 4.48-9.97 9.99-9.97 2.67 0 5.17 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.05c0 5.5-4.48 9.99-9.78 9.99zm5.48-7.47c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.23-.24-.59-.49-.5-.68-.51l-.58-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.13 4.54.72.31 1.27.5 1.71.64.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35z"/></svg>';

  function mount() {
    if (document.querySelector(".wa-float")) return;
    document.body.appendChild(a);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
