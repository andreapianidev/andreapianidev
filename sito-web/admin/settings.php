<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

$flash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'change_password') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $current = $_POST['current'] ?? '';
    $new = $_POST['new'] ?? '';
    if (strlen($new) < 12) { $flash = ['err','Nuova password troppo corta (min 12).']; }
    else {
        $username = $_SESSION['aai_user'];
        if (!aai_admin_verify($username, $current)) { $flash = ['err', 'Password attuale errata.']; }
        else {
            aai_atomic_update(AAI_USERS, function ($cur) use ($username, $new) {
                foreach ($cur as &$u) if (($u['username'] ?? '') === $username) {
                    $u['password_hash'] = password_hash($new, PASSWORD_ARGON2ID);
                    $u['updated_at'] = aai_now_iso();
                }
                return $cur;
            });
            $flash = ['ok', 'Password aggiornata.'];
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'rotate_token') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $username = $_SESSION['aai_user'];
    aai_atomic_update(AAI_USERS, function ($cur) use ($username) {
        foreach ($cur as &$u) if (($u['username'] ?? '') === $username) {
            $u['api_token'] = bin2hex(random_bytes(32));
            $u['updated_at'] = aai_now_iso();
        }
        return $cur;
    });
    $flash = ['ok','Token API ruotato. Aggiorna PHP_API_TOKEN su Vercel.'];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'run_purge') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    // Run inline
    $url = '/api/cron/purge.php?token=' . urlencode(AAI_CRON_TOKEN);
    $flash = ['ok', 'Lancia manualmente: ' . $url . ' (in produzione gira via cron settimanale).'];
}

$users = aai_read_json(AAI_USERS, []);
$me = null;
foreach ($users as $u) if (($u['username'] ?? '') === ($_SESSION['aai_user'] ?? '')) $me = $u;

aai_admin_header('Impostazioni', 'settings');
?>
<h1 class="adm-title">Impostazioni</h1>

<?php if ($flash): ?>
  <div class="adm-flash adm-flash--<?= $flash[0] === 'err' ? 'err' : 'ok' ?>"><?= aai_h($flash[1]) ?></div>
<?php endif; ?>

<h2 class="adm-h2">🔑 Cambia password</h2>
<div class="adm-card" style="max-width:480px">
  <form method="post">
    <input type="hidden" name="action" value="change_password">
    <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
    <div class="adm-form-row">
      <label class="adm-label">Password attuale</label>
      <input class="adm-input" type="password" name="current" required autocomplete="current-password">
    </div>
    <div class="adm-form-row">
      <label class="adm-label">Nuova password (min 12)</label>
      <input class="adm-input" type="password" name="new" required minlength="12" autocomplete="new-password">
    </div>
    <button class="adm-btn" type="submit">Aggiorna</button>
  </form>
</div>

<h2 class="adm-h2">🔌 API token (per dashboard Vercel)</h2>
<div class="adm-card">
  <p>Questo token consente alla dashboard Vercel di leggere le statistiche aggregate (read-only). <strong>Non condividerlo</strong>.</p>
  <div style="font-family:var(--font-mono); background:var(--bg-input); color:var(--accent-hi); border:1px solid var(--border); padding:10px 14px; border-radius:7px; word-break:break-all; font-size:12.5px">
    <?= aai_h($me['api_token'] ?? '(non impostato)') ?>
  </div>
  <div style="margin-top:12px; display:flex; gap:8px">
    <button class="adm-btn adm-btn--ghost" type="button" data-copy="<?= aai_h($me['api_token'] ?? '') ?>">📋 Copia token</button>
    <form method="post" style="display:inline">
      <input type="hidden" name="action" value="rotate_token">
      <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
      <button class="adm-btn adm-btn--danger" type="submit"
              data-confirm="Ruotare il token? La dashboard Vercel smetterà di funzionare finché non aggiorni PHP_API_TOKEN su Vercel.">🔄 Ruota token</button>
    </form>
  </div>
</div>

<h2 class="adm-h2">🧹 Manutenzione</h2>
<div class="adm-card">
  <p>La purge automatica gira via cron settimanale e applica le retention (12 mesi conv., 90gg eventi). Puoi anche eseguirla manualmente.</p>
  <p><strong>URL cron (configura su cron-job.org o crontab):</strong></p>
  <div style="font-family:ui-monospace,monospace; background:#f3f4f6; padding:10px; border-radius:6px; font-size:13px">
    https://www.andreapiani.com/api/cron/purge.php?token=&lt;AAI_CRON_TOKEN&gt;
  </div>
  <form method="post" style="margin-top:12px">
    <input type="hidden" name="action" value="run_purge">
    <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
    <button class="adm-btn adm-btn--ghost" type="submit">Mostra URL purge</button>
  </form>
</div>

<h2 class="adm-h2">ℹ️ Sistema</h2>
<div class="adm-card" style="font-size:13px;line-height:1.8">
  <div><strong>Utente:</strong> <?= aai_h($_SESSION['aai_user']) ?></div>
  <div><strong>PHP:</strong> <?= aai_h(PHP_VERSION) ?></div>
  <div><strong>Data dir:</strong> <?= aai_h(AAI_DATA) ?></div>
  <div><strong>Conversazioni salvate:</strong> <?= count(aai_read_json(AAI_INDEX, [])) ?></div>
  <div><strong>Contatti totali:</strong> <?= count(aai_read_json(AAI_CONTACTS, [])) ?></div>
  <div><strong>Promemoria attivi:</strong>
    <?= count(array_filter(aai_read_json(AAI_REMIND, []), fn($r) => empty($r['done']))) ?></div>
</div>

<?php aai_admin_footer();
