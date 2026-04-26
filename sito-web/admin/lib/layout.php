<?php
require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';
require_once __DIR__ . '/../../lib/auth.php';

function aai_asset_ver(string $rel): string {
    $p = __DIR__ . '/../' . $rel;
    return is_file($p) ? (string)filemtime($p) : '1';
}

function aai_admin_header(string $title, string $current = ''): void {
    aai_admin_session_start();
    $reminders = aai_read_json(AAI_REMIND, []);
    $now = time();
    $overdue = 0;
    foreach ($reminders as $r) {
        if (empty($r['done']) && !empty($r['due_at']) && strtotime($r['due_at']) <= $now) $overdue++;
    }
    $nav = [
        'index'      => ['Dashboard',   'index.php'],
        'stats'      => ['Statistiche', 'stats.php'],
        'bot'        => ['🤖 AI Analyst','bot.php'],
        'sessions'   => ['Conversazioni','sessions.php'],
        'contacts'   => ['Contatti',    'contacts.php'],
        'reminders'  => ['Promemoria',  'reminders.php'],
        'export'     => ['Export',      'export.php'],
        'settings'   => ['Impostazioni','settings.php'],
    ];
    ?><!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title><?= htmlspecialchars($title) ?> · Andrea AI Admin</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<?php
?>
<link rel="stylesheet" href="assets/admin.css?v=<?= aai_asset_ver('assets/admin.css') ?>">
<link rel="stylesheet" href="assets/bot-widget.css?v=<?= aai_asset_ver('assets/bot-widget.css') ?>">
</head>
<body data-page="<?= htmlspecialchars($current) ?>">
<header class="adm-top">
  <button type="button" class="adm-burger" aria-label="Menu" aria-expanded="false" aria-controls="adm-drawer">
    <span></span><span></span><span></span>
  </button>
  <div class="adm-brand">🤖 Andrea AI · Admin</div>
  <nav class="adm-nav" id="adm-drawer">
    <?php foreach ($nav as $k => [$label, $url]): ?>
      <a href="<?= $url ?>" class="<?= $current === $k ? 'is-active' : '' ?>">
        <?= htmlspecialchars($label) ?>
        <?php if ($k === 'reminders' && $overdue): ?><span class="adm-badge"><?= $overdue ?></span><?php endif; ?>
      </a>
    <?php endforeach; ?>
    <div class="adm-nav-foot">
      <span><?= htmlspecialchars($_SESSION['aai_user'] ?? '') ?></span>
      <a href="logout.php">Logout</a>
    </div>
  </nav>
  <div class="adm-user">
    <span><?= htmlspecialchars($_SESSION['aai_user'] ?? '') ?></span>
    <a href="logout.php">Logout</a>
  </div>
</header>
<div class="adm-drawer-backdrop" hidden></div>
<main class="adm-main"<?= in_array($current, ['index','stats'], true) ? ' data-autorefresh="60"' : '' ?>>
<?php
}

function aai_admin_footer(): void {
    ?></main>
<footer class="adm-foot">v1 · GDPR retention 12 mesi · <a href="settings.php">impostazioni</a></footer>
<script src="assets/admin.js?v=<?= aai_asset_ver('assets/admin.js') ?>"></script>
<script>
(function(){
  var PING_MS = 60000;
  function ping(){
    if (document.hidden) return;
    fetch('ping.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(function(r){ if (r.status === 401) location.href = 'login.php'; })
      .catch(function(){});
  }
  setInterval(ping, PING_MS);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) ping(); });

  var main = document.querySelector('main.adm-main[data-autorefresh]');
  if (!main) return;
  var REFRESH_MS = (parseInt(main.dataset.autorefresh, 10) || 60) * 1000;

  function execScripts(container){
    container.querySelectorAll('script').forEach(function(old){
      var s = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) {
        s.setAttribute(old.attributes[i].name, old.attributes[i].value);
      }
      s.text = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
  }

  function refresh(){
    if (document.hidden) return;
    fetch(location.href, { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Autorefresh': '1' } })
      .then(function(r){
        if (r.status === 401) { location.href = 'login.php'; return null; }
        if (!r.ok) return null;
        return r.text();
      })
      .then(function(html){
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('main.adm-main');
        if (!fresh) return;
        var current = document.querySelector('main.adm-main');
        var sx = window.scrollX, sy = window.scrollY;
        current.innerHTML = fresh.innerHTML;
        execScripts(current);
        window.scrollTo(sx, sy);
      })
      .catch(function(){});
  }
  setInterval(refresh, REFRESH_MS);
})();
</script>
<?php if (($GLOBALS['_aaiHideBotWidget'] ?? false) !== true): ?>
<script>window.AAI_ADMIN_CSRF = <?= json_encode(aai_admin_csrf()) ?>;</script>
<script src="assets/bot-widget.js?v=<?= aai_asset_ver('assets/bot-widget.js') ?>" defer></script>
<?php endif; ?>
</body></html><?php
}

/** Helpers used by views */
function aai_status_badge(string $status): string {
    // Soft pastel pills (bg + border + text) — sober dark luxe style.
    $palette = [
        'open'      => ['#3b82f6', 'rgba(59,130,246,.14)',  'rgba(59,130,246,.32)'],   // info
        'closed'    => ['#9ca3af', 'rgba(156,163,175,.12)', 'rgba(156,163,175,.28)'],  // muted
        'converted' => ['#10b981', 'rgba(16,185,129,.14)',  'rgba(16,185,129,.32)'],   // success
        'spam'      => ['#ef4444', 'rgba(239,68,68,.14)',   'rgba(239,68,68,.32)'],    // danger
    ];
    [$fg, $bg, $bd] = $palette[$status] ?? $palette['closed'];
    $style = "background:$bg;color:$fg;border:1px solid $bd";
    return "<span class='adm-pill' style='$style'>" . htmlspecialchars($status) . "</span>";
}

function aai_h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

function aai_fmt_dt(?string $iso): string {
    if (!$iso) return '—';
    $t = strtotime($iso);
    return $t ? date('d/m/Y H:i', $t) : '—';
}

function aai_fmt_relative(?string $iso): string {
    if (!$iso) return '';
    $diff = time() - strtotime($iso);
    if ($diff < 60) return 'ora';
    if ($diff < 3600) return floor($diff/60) . 'min fa';
    if ($diff < 86400) return floor($diff/3600) . 'h fa';
    if ($diff < 86400*30) return floor($diff/86400) . 'g fa';
    return date('d/m/Y', strtotime($iso));
}
