<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

// Suppress floating bot widget on this page — full-page chat already present.
$GLOBALS['_aaiHideBotWidget'] = true;

$csrf = aai_admin_csrf();
aai_admin_header('AI Analyst', 'bot');
?>
<h1 class="adm-title">🤖 AI Analyst</h1>
<p class="adm-sub" style="color:var(--text-dim);margin:-6px 0 18px;font-size:14px;">
  Bot con accesso reale a statistiche, conversazioni, contatti e promemoria. Powered by DeepSeek.
</p>

<style>
  .bot-wrap{display:flex;flex-direction:column;height:calc(100vh - 240px);min-height:520px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:14px;overflow:hidden}
  .bot-toolbar{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-base);font-size:13px;color:var(--text-dim)}
  .bot-toolbar .left{display:flex;gap:8px;align-items:center}
  .bot-toolbar .dot{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 10px var(--success-soft)}
  .bot-toolbar button{background:transparent;border:1px solid var(--border-hi);color:var(--text-dim);padding:5px 12px;border-radius:8px;font-size:12px;cursor:pointer;transition:all .15s}
  .bot-toolbar button:hover{color:var(--danger);border-color:var(--danger)}
  .bot-msgs{flex:1;overflow-y:auto;padding:18px 18px 8px;display:flex;flex-direction:column;gap:14px}
  .bot-msg{max-width:78%;padding:11px 14px;border-radius:12px;line-height:1.5;font-size:14.5px;white-space:pre-wrap;word-wrap:break-word}
  .bot-msg.user{align-self:flex-end;background:var(--accent-soft);border:1px solid var(--accent-ring);color:var(--text)}
  .bot-msg.assistant{align-self:flex-start;background:var(--bg-hover);border:1px solid var(--border);color:var(--text)}
  .bot-msg.error{align-self:center;background:var(--danger-soft);border:1px solid var(--danger);color:var(--danger);font-size:13px;padding:8px 14px}
  .bot-tool-trace{align-self:flex-start;max-width:78%;font-family:var(--font-mono);font-size:11.5px;color:var(--text-mute);background:var(--bg-base);border:1px solid var(--border-soft);border-radius:8px;padding:8px 12px}
  .bot-tool-trace details{cursor:pointer}
  .bot-tool-trace summary{color:var(--accent-hi);outline:none}
  .bot-tool-trace pre{margin:6px 0 0;white-space:pre-wrap;word-break:break-all;color:var(--text-mute)}
  .bot-typing{align-self:flex-start;display:flex;gap:5px;padding:14px 16px;background:var(--bg-hover);border:1px solid var(--border);border-radius:12px}
  .bot-typing span{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:bot-bounce 1s infinite ease-in-out}
  .bot-typing span:nth-child(2){animation-delay:.15s}
  .bot-typing span:nth-child(3){animation-delay:.3s}
  @keyframes bot-bounce{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
  .bot-input-row{display:flex;gap:10px;padding:14px;border-top:1px solid var(--border);background:var(--bg-base)}
  .bot-input-row textarea{flex:1;background:var(--bg-input);border:1px solid var(--border-hi);color:var(--text);border-radius:10px;padding:12px 14px;font-family:var(--font-sans);font-size:14.5px;resize:none;min-height:46px;max-height:160px;line-height:1.4;transition:border-color .15s}
  .bot-input-row textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring)}
  .bot-input-row button{background:var(--accent);border:0;color:#fff;padding:0 22px;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;transition:background .15s}
  .bot-input-row button:hover:not(:disabled){background:var(--accent-hi)}
  .bot-input-row button:disabled{opacity:.5;cursor:not-allowed}
  .bot-prompts{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 14px;border-top:1px solid var(--border-soft)}
  .bot-prompts button{background:var(--bg-base);border:1px solid var(--border);color:var(--text-dim);padding:6px 12px;border-radius:20px;font-size:12.5px;cursor:pointer;transition:all .15s}
  .bot-prompts button:hover{color:var(--accent-hi);border-color:var(--accent)}
  .bot-empty{text-align:center;color:var(--text-mute);padding:60px 20px;font-size:14px}
  .bot-empty .big{font-size:34px;margin-bottom:10px}
</style>

<div class="bot-wrap" id="botWrap">
  <div class="bot-toolbar">
    <div class="left"><span class="dot"></span><span>DeepSeek connesso · accesso dati reale</span></div>
    <button type="button" id="botReset" title="Cancella cronologia">🗑️ Reset</button>
  </div>
  <div class="bot-msgs" id="botMsgs">
    <div class="bot-empty">
      <div class="big">📊</div>
      <div>Chiedi qualunque cosa sui dati del sito.</div>
      <div style="font-size:12px;margin-top:6px;color:var(--text-mute)">Storia cronologica salvata su disco — riprende ad ogni login.</div>
    </div>
  </div>
  <div class="bot-prompts" id="botPrompts">
    <button>Come va il sito negli ultimi 30 giorni?</button>
    <button>Quali sono le pagine più viste?</button>
    <button>Mostra il funnel di conversione</button>
    <button>Da dove arriva il traffico?</button>
    <button>Ultimi lead raccolti</button>
    <button>Promemoria scaduti</button>
    <button>Cerca conversazioni che parlano di "PrestaShop"</button>
  </div>
  <form class="bot-input-row" id="botForm" autocomplete="off">
    <textarea id="botInput" placeholder="Chiedi all'AI Analyst… (Invio per inviare, Shift+Invio per a capo)" rows="1" maxlength="4000"></textarea>
    <button type="submit" id="botSend">Invia</button>
  </form>
</div>

<script>
(function(){
  var CSRF = <?= json_encode($csrf) ?>;
  var msgsEl = document.getElementById('botMsgs');
  var input  = document.getElementById('botInput');
  var form   = document.getElementById('botForm');
  var btn    = document.getElementById('botSend');
  var prompts = document.getElementById('botPrompts');
  var resetBtn = document.getElementById('botReset');

  function scrollBottom(){ msgsEl.scrollTop = msgsEl.scrollHeight; }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function renderMarkdown(raw){
    var s = escapeHtml(raw || '');
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
    return s.split(/\n{2,}/).map(function(p){ return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  function renderMessage(role, content, toolTrace){
    var div = document.createElement('div');
    div.className = 'bot-msg ' + role;
    if (role === 'assistant') div.innerHTML = renderMarkdown(content || '');
    else div.textContent = content || '';
    msgsEl.appendChild(div);
    if (toolTrace && toolTrace.length){
      var t = document.createElement('div');
      t.className = 'bot-tool-trace';
      var lines = toolTrace.map(function(tt){
        var head = tt.tool + '(' + JSON.stringify(tt.args || {}) + ')';
        return tt.result_preview ? head + '\n  → ' + tt.result_preview : head;
      }).join('\n\n');
      t.innerHTML = '<details><summary>🔧 ' + toolTrace.length + ' tool · fonte dati</summary><pre>' + escapeHtml(lines) + '</pre></details>';
      msgsEl.appendChild(t);
    }
  }

  function showTyping(){
    var d = document.createElement('div');
    d.className = 'bot-typing';
    d.id = 'botTyping';
    d.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(d);
    scrollBottom();
  }
  function hideTyping(){
    var d = document.getElementById('botTyping');
    if (d) d.remove();
  }

  function clearEmpty(){
    var e = msgsEl.querySelector('.bot-empty');
    if (e) e.remove();
  }

  function send(text){
    if (!text.trim()) return;
    clearEmpty();
    renderMessage('user', text);
    input.value = '';
    autoResize();
    btn.disabled = true;
    showTyping();
    scrollBottom();

    fetch('api/ask-bot.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'ask', message: text, csrf: CSRF })
    }).then(function(r){
      if (r.status === 401) { location.href = 'login.php'; return null; }
      return r.json();
    }).then(function(d){
      hideTyping();
      btn.disabled = false;
      input.focus();
      if (!d) return;
      if (d.error){
        var e = document.createElement('div');
        e.className = 'bot-msg error';
        e.textContent = '⚠️ ' + (d.message || d.error);
        msgsEl.appendChild(e);
        scrollBottom();
        return;
      }
      renderMessage('assistant', d.reply || '(risposta vuota)', d.tool_trace);
      scrollBottom();
    }).catch(function(err){
      hideTyping();
      btn.disabled = false;
      var e = document.createElement('div');
      e.className = 'bot-msg error';
      e.textContent = '⚠️ Errore di rete: ' + err.message;
      msgsEl.appendChild(e);
      scrollBottom();
    });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    send(input.value);
  });

  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      send(input.value);
    }
  });

  function autoResize(){
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }
  input.addEventListener('input', autoResize);

  prompts.addEventListener('click', function(e){
    if (e.target.tagName === 'BUTTON') send(e.target.textContent);
  });

  resetBtn.addEventListener('click', function(){
    if (!confirm('Cancellare la cronologia di chat con l\'AI Analyst?')) return;
    fetch('api/ask-bot.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', csrf: CSRF })
    }).then(function(r){ return r.json(); })
      .then(function(){ msgsEl.innerHTML = '<div class="bot-empty"><div class="big">📊</div><div>Cronologia svuotata. Chiedi qualcosa.</div></div>'; });
  });

  // Load history on page mount.
  fetch('api/ask-bot.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'history' })
  }).then(function(r){ return r.json(); })
    .then(function(d){
      var hist = (d && d.history) || [];
      if (!hist.length) return;
      clearEmpty();
      hist.forEach(function(m){
        renderMessage(m.role, m.content || '', m.tool_trace || []);
      });
      scrollBottom();
    }).catch(function(){});
})();
</script>

<?php aai_admin_footer();
