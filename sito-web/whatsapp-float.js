/* WhatsApp floating button — sempre visibile in basso a destra.
   Self-contained: inietta stile + bottone, nessuna dipendenza.
   Due numeri: IT +39 351 624 8936 · ES +34 619 500 367
   Al tap si apre un piccolo selettore con entrambi. */
(function () {
  if (window.__waFloatLoaded) return;        // evita doppia iniezione
  window.__waFloatLoaded = true;

  var TEXT = encodeURIComponent("Ciao Andrea, ho visto il tuo sito e vorrei qualche informazione.");
  var NUMBERS = [
    { flag: "🇮🇹", label: "Italia",  pretty: "+39 351 624 8936", raw: "393516248936" },
    { flag: "🇪🇸", label: "España",  pretty: "+34 619 500 367",  raw: "34619500367"  }
  ];

  var css = '' +
    '.wa-float-wrap{position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;gap:10px}' +
    '.wa-float{position:relative;width:60px;height:60px;' +
    'border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;text-decoration:none;border:0;padding:0;' +
    'transition:transform .2s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent}' +
    '.wa-float:hover{transform:scale(1.08);box-shadow:0 8px 26px rgba(37,211,102,.45)}' +
    '.wa-float:active{transform:scale(.96)}' +
    '.wa-float svg{width:34px;height:34px;fill:#fff;display:block;pointer-events:none}' +
    '.wa-float::before{content:"";position:absolute;inset:0;border-radius:50%;background:#25d366;' +
    'z-index:-1;animation:wa-pulse 2.4s ease-out infinite}' +
    '@keyframes wa-pulse{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(1.9);opacity:0}}' +
    '.wa-float-menu{display:none;flex-direction:column;gap:6px;background:#fff;border-radius:14px;' +
    'padding:8px;box-shadow:0 10px 34px rgba(0,0,0,.22);min-width:216px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.wa-float-menu.open{display:flex}' +
    '.wa-float-menu__title{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#7a7a7a;padding:.25rem .5rem .1rem}' +
    '.wa-float-menu a{display:flex;align-items:center;gap:10px;padding:.55rem .6rem;border-radius:9px;' +
    'text-decoration:none;color:#111;transition:background .15s ease}' +
    '.wa-float-menu a:hover{background:#eafaf0}' +
    '.wa-float-menu .flag{font-size:1.15rem;line-height:1}' +
    '.wa-float-menu .lbl{display:flex;flex-direction:column;line-height:1.25}' +
    '.wa-float-menu .lbl b{font-size:.86rem;font-weight:600}' +
    '.wa-float-menu .lbl span{font-size:.78rem;color:#666}' +
    '@media (max-width:600px){.wa-float-wrap{right:16px;bottom:16px}.wa-float{width:54px;height:54px}.wa-float svg{width:30px;height:30px}}' +
    '@media (prefers-reduced-motion:reduce){.wa-float::before{animation:none}}';

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var wrap = document.createElement("div");
  wrap.className = "wa-float-wrap";

  var menu = document.createElement("div");
  menu.className = "wa-float-menu";
  menu.innerHTML = '<div class="wa-float-menu__title">Scrivimi su WhatsApp</div>' +
    NUMBERS.map(function (n) {
      return '<a href="https://wa.me/' + n.raw + '?text=' + TEXT + '" target="_blank" rel="noopener">' +
             '<span class="flag" aria-hidden="true">' + n.flag + '</span>' +
             '<span class="lbl"><b>' + n.label + '</b><span>' + n.pretty + '</span></span></a>';
    }).join("");

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "wa-float";
  btn.setAttribute("aria-label", "Scrivimi su WhatsApp");
  btn.setAttribute("aria-expanded", "false");
  btn.title = "Scrivimi su WhatsApp — Italia o España";
  btn.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C9.42 3 4.06 8.36 4.06 14.98c0 2.1.55 4.16 1.6 5.97L4 29l8.24-1.62a11.9 11.9 0 0 0 3.8.62h.01c6.62 0 11.98-5.36 11.98-11.98S22.66 3 16.04 3zm0 21.93h-.01c-1.18 0-2.34-.32-3.35-.92l-.24-.14-4.89.96.98-4.77-.16-.25a9.94 9.94 0 0 1-1.52-5.27c0-5.5 4.48-9.97 9.99-9.97 2.67 0 5.17 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.05c0 5.5-4.48 9.99-9.78 9.99zm5.48-7.47c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.23-.24-.59-.49-.5-.68-.51l-.58-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.13 4.54.72.31 1.27.5 1.71.64.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35z"/></svg>';

  function setOpen(open) {
    menu.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!menu.classList.contains("open"));
  });
  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  wrap.appendChild(menu);
  wrap.appendChild(btn);

  function mount() {
    if (document.querySelector(".wa-float-wrap")) return;
    document.body.appendChild(wrap);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  /* --- Selettore su TUTTI i pulsanti WhatsApp del sito -------------------
     I CTA inline puntano al numero italiano. Qui intercettiamo il click e
     mostriamo la scelta IT/ES conservando il testo precompilato del link. */
  var pickCss = '' +
    '.wa-pick-ov{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);' +
    'display:flex;align-items:center;justify-content:center;padding:1.2rem;' +
    'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.wa-pick{background:#fff;border-radius:16px;padding:1.4rem 1.3rem 1.1rem;max-width:340px;width:100%;' +
    'box-shadow:0 18px 50px rgba(0,0,0,.3)}' +
    '.wa-pick h3{margin:0 0 .2rem;font-size:1.05rem;color:#111}' +
    '.wa-pick p{margin:0 0 .9rem;font-size:.85rem;color:#666;line-height:1.4}' +
    '.wa-pick a{display:flex;align-items:center;gap:11px;padding:.7rem .75rem;border-radius:11px;' +
    'text-decoration:none;color:#111;border:1px solid #e3e3e3;margin-bottom:.5rem;transition:all .15s ease}' +
    '.wa-pick a:hover{background:#eafaf0;border-color:#25d366}' +
    '.wa-pick .flag{font-size:1.3rem;line-height:1}' +
    '.wa-pick .lbl{display:flex;flex-direction:column;line-height:1.25}' +
    '.wa-pick .lbl b{font-size:.92rem}' +
    '.wa-pick .lbl span{font-size:.8rem;color:#666}' +
    '.wa-pick button{width:100%;background:none;border:0;color:#888;font-size:.82rem;padding:.4rem;cursor:pointer}';
  var pickStyle = document.createElement("style");
  pickStyle.textContent = pickCss;
  document.head.appendChild(pickStyle);

  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest('a[href*="wa.me/393516248936"]') : null;
    if (!link || link.closest(".wa-float-wrap") || link.closest(".wa-pick")) return;
    e.preventDefault();

    var text = (link.getAttribute("href").split("?text=")[1]) || TEXT;
    var ov = document.createElement("div");
    ov.className = "wa-pick-ov";
    ov.innerHTML = '<div class="wa-pick" role="dialog" aria-modal="true" aria-label="Scegli il numero WhatsApp">' +
      '<h3>Su quale numero preferisci?</h3>' +
      '<p>Rispondo su entrambi. Il messaggio è già pronto, devi solo inviarlo.</p>' +
      NUMBERS.map(function (n) {
        return '<a href="https://wa.me/' + n.raw + '?text=' + text + '" target="_blank" rel="noopener">' +
               '<span class="flag" aria-hidden="true">' + n.flag + '</span>' +
               '<span class="lbl"><b>' + n.label + '</b><span>' + n.pretty + '</span></span></a>';
      }).join("") +
      '<button type="button">Annulla</button></div>';

    function close() { ov.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    ov.addEventListener("click", function (ev) {
      if (ev.target === ov || ev.target.tagName === "BUTTON") close();
      if (ev.target.closest("a")) setTimeout(close, 80);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
  });
})();
