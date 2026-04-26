/* Admin AI Analyst floating widget.
   Mounts a bottom-left FAB + collapsible chat panel on every authenticated admin page.
   Reuses /admin/api/ask-bot.php (same backend as /admin/bot.php full-page view).
   Requires window.AAI_ADMIN_CSRF set by layout.php footer. */
(function () {
  'use strict';
  if (window.__aaiBotWidgetMounted) return;
  window.__aaiBotWidgetMounted = true;

  var CSRF = window.AAI_ADMIN_CSRF || '';
  var STORAGE_OPEN = 'aaiBotWidgetOpen';
  var ENDPOINT = 'api/ask-bot.php';

  // Build DOM
  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'aai-bw-fab';
  fab.title = 'AI Analyst';
  fab.setAttribute('aria-label', 'Apri AI Analyst');
  fab.innerHTML =
    '<span class="aai-bw-pulse"></span>' +
    '<svg class="aai-bw-bot" viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="aaiBotShine" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>' +
          '<stop offset="1" stop-color="#ffffff" stop-opacity=".75"/>' +
        '</linearGradient>' +
      '</defs>' +
      // antenna
      '<line x1="32" y1="6" x2="32" y2="14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="32" cy="6" r="2.6" fill="#fff"/>' +
      // head body (rounded square)
      '<rect x="12" y="14" width="40" height="34" rx="10" ry="10" fill="url(#aaiBotShine)"/>' +
      // ears
      '<rect x="8"  y="24" width="5" height="12" rx="2.5" fill="#fff" opacity=".85"/>' +
      '<rect x="51" y="24" width="5" height="12" rx="2.5" fill="#fff" opacity=".85"/>' +
      // eyes (big friendly)
      '<g class="aai-bot-eyes">' +
        '<circle cx="24" cy="30" r="4.5" fill="#1f2937"/>' +
        '<circle cx="40" cy="30" r="4.5" fill="#1f2937"/>' +
        '<circle cx="25.6" cy="28.6" r="1.4" fill="#fff"/>' +
        '<circle cx="41.6" cy="28.6" r="1.4" fill="#fff"/>' +
      '</g>' +
      // smile
      '<path d="M24 39 Q32 45 40 39" stroke="#1f2937" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
      // cheeks
      '<circle cx="19" cy="38" r="2" fill="#f472b6" opacity=".75"/>' +
      '<circle cx="45" cy="38" r="2" fill="#f472b6" opacity=".75"/>' +
      // little body collar
      '<rect x="22" y="48" width="20" height="6" rx="3" fill="#fff" opacity=".7"/>' +
    '</svg>';

  var panel = document.createElement('div');
  panel.className = 'aai-bw-panel';
  panel.innerHTML =
    '<div class="aai-bw-head">' +
      '<div class="ttl"><span class="dot"></span>AI Analyst<span class="sub">DeepSeek · dati reali</span></div>' +
      '<div class="acts">' +
        '<button type="button" class="danger" data-act="reset" title="Cancella cronologia">🗑</button>' +
        '<a href="bot.php" title="Apri pagina intera"><button type="button" data-act="expand">⛶</button></a>' +
        '<button type="button" data-act="close" title="Chiudi">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="aai-bw-msgs" data-msgs></div>' +
    '<div class="aai-bw-prompts">' +
      '<button type="button">Come va il sito ultimi 7gg?</button>' +
      '<button type="button">Confronta questa settimana con la precedente</button>' +
      '<button type="button">Lead persi senza promemoria</button>' +
      '<button type="button">Funnel di conversione 30gg</button>' +
      '<button type="button">Top pagine 30gg</button>' +
      '<button type="button">Promemoria scaduti</button>' +
    '</div>' +
    '<form class="aai-bw-form" autocomplete="off">' +
      '<textarea placeholder="Chiedi qualcosa…" rows="1" maxlength="4000"></textarea>' +
      '<button type="submit">↑</button>' +
    '</form>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var msgs    = panel.querySelector('[data-msgs]');
  var form    = panel.querySelector('form');
  var input   = panel.querySelector('textarea');
  var sendBtn = form.querySelector('button[type=submit]');
  var prompts = panel.querySelector('.aai-bw-prompts');
  var resetBt = panel.querySelector('[data-act=reset]');
  var closeBt = panel.querySelector('[data-act=close]');

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // Minimal post-escape markdown: **bold**, *italic*, `code`, paragraphs, line breaks.
  function renderMarkdown(raw){
    var s = escapeHtml(raw || '');
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
    var paras = s.split(/\n{2,}/).map(function(p){ return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; });
    return paras.join('');
  }

  function scrollBottom(){ msgs.scrollTop = msgs.scrollHeight; }

  function showEmpty(){
    msgs.innerHTML = '<div class="aai-bw-empty"><div class="big">📊</div>Chiedimi qualcosa sui dati.</div>';
  }

  function clearEmpty(){
    var e = msgs.querySelector('.aai-bw-empty'); if (e) e.remove();
  }

  function renderMessage(role, content, toolTrace){
    clearEmpty();
    var d = document.createElement('div');
    d.className = 'aai-bw-msg ' + role;
    if (role === 'assistant') {
      d.innerHTML = renderMarkdown(content || '');
    } else {
      d.textContent = content || '';
    }
    msgs.appendChild(d);
    if (toolTrace && toolTrace.length){
      var t = document.createElement('div');
      t.className = 'aai-bw-trace';
      var lines = toolTrace.map(function(tt){
        var head = tt.tool + '(' + JSON.stringify(tt.args || {}) + ')';
        var preview = tt.result_preview ? ('\n  → ' + tt.result_preview) : '';
        return head + preview;
      }).join('\n\n');
      t.innerHTML = '<details><summary>🔧 ' + toolTrace.length + ' tool · fonte dati</summary><pre>' + escapeHtml(lines) + '</pre></details>';
      msgs.appendChild(t);
    }
  }

  function showTyping(){
    var d = document.createElement('div');
    d.className = 'aai-bw-typing';
    d.id = 'aai-bw-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(d);
    scrollBottom();
  }
  function hideTyping(){ var d = document.getElementById('aai-bw-typing'); if (d) d.remove(); }

  function showError(text){
    clearEmpty();
    var d = document.createElement('div');
    d.className = 'aai-bw-msg error';
    d.textContent = '⚠️ ' + text;
    msgs.appendChild(d);
    scrollBottom();
  }

  function send(text){
    text = (text || '').trim();
    if (!text) return;
    renderMessage('user', text);
    input.value = '';
    autoResize();
    sendBtn.disabled = true;
    showTyping();
    scrollBottom();

    fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'ask', message: text, csrf: CSRF })
    }).then(function(r){
      if (r.status === 401) { location.href = 'login.php'; return null; }
      return r.json();
    }).then(function(d){
      hideTyping();
      sendBtn.disabled = false;
      input.focus();
      if (!d) return;
      if (d.error){ showError(d.message || d.error); return; }
      renderMessage('assistant', d.reply || '(risposta vuota)', d.tool_trace);
      scrollBottom();
    }).catch(function(err){
      hideTyping();
      sendBtn.disabled = false;
      showError('Errore di rete: ' + err.message);
    });
  }

  function autoResize(){
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  function open(){
    panel.classList.add('is-open');
    try { localStorage.setItem(STORAGE_OPEN, '1'); } catch(_){}
    setTimeout(function(){ input.focus(); }, 200);
    if (!msgs.dataset.loaded) loadHistory();
  }
  function close(){
    panel.classList.remove('is-open');
    try { localStorage.setItem(STORAGE_OPEN, '0'); } catch(_){}
  }

  function loadHistory(){
    msgs.dataset.loaded = '1';
    fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'history' })
    }).then(function(r){ return r.json(); })
      .then(function(d){
        var hist = (d && d.history) || [];
        if (!hist.length) { showEmpty(); return; }
        msgs.innerHTML = '';
        hist.forEach(function(m){ renderMessage(m.role, m.content || '', m.tool_trace || []); });
        scrollBottom();
      }).catch(function(){ showEmpty(); });
  }

  // Wiring
  fab.addEventListener('click', function(){
    if (panel.classList.contains('is-open')) close(); else open();
  });
  closeBt.addEventListener('click', close);
  form.addEventListener('submit', function(e){ e.preventDefault(); send(input.value); });
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(input.value); }
  });
  input.addEventListener('input', autoResize);
  prompts.addEventListener('click', function(e){
    if (e.target.tagName === 'BUTTON') send(e.target.textContent);
  });
  resetBt.addEventListener('click', function(){
    if (!confirm('Cancellare la cronologia AI Analyst?')) return;
    fetch(ENDPOINT, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', csrf: CSRF })
    }).then(function(r){ return r.json(); }).then(function(){ msgs.innerHTML = ''; showEmpty(); });
  });

  // Restore open state across page reloads (admin auto-refreshes some views)
  try {
    if (localStorage.getItem(STORAGE_OPEN) === '1') open();
  } catch (_) {}
})();
