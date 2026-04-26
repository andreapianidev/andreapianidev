<?php
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/util.php';

aai_admin_session_start();

if (aai_admin_is_logged_in()) { header('Location: index.php'); exit; }

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ip = aai_client_ip();
    if (aai_admin_is_throttled($ip)) {
        $err = 'Troppi tentativi falliti. Riprova tra qualche minuto.';
    } else {
        $u = trim($_POST['username'] ?? '');
        $p = (string)($_POST['password'] ?? '');
        $verified = aai_admin_verify($u, $p);
        aai_admin_record_attempt($ip, (bool)$verified);
        if ($verified) {
            session_regenerate_id(true);
            $_SESSION['aai_user']  = $verified;
            $_SESSION['aai_login_at'] = time();
            header('Location: index.php'); exit;
        }
        $err = 'Credenziali non valide.';
        usleep(500000); // small delay against brute-force
    }
}
?><!doctype html>
<html lang="it"><head>
<meta charset="utf-8">
<title>Login · Andrea AI Admin</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/admin.css">
</head><body>
<div class="adm-login-wrap">
  <div class="adm-card">
    <h1>🔐 Andrea AI Admin</h1>
    <?php if ($err): ?><div class="adm-flash adm-flash--err"><?= htmlspecialchars($err) ?></div><?php endif; ?>
    <form method="post" autocomplete="on">
      <div class="adm-form-row">
        <label class="adm-label">Username</label>
        <input class="adm-input" name="username" required autofocus>
      </div>
      <div class="adm-form-row">
        <label class="adm-label">Password</label>
        <input class="adm-input" type="password" name="password" required>
      </div>
      <button class="adm-btn" type="submit" style="width:100%">Accedi</button>
    </form>
  </div>
  <p style="text-align:center; color:var(--text-mute); font-size:12px; margin-top:14px">
    Crea il primo utente con <code>php lib/setup.php &lt;user&gt; &lt;password&gt;</code>
  </p>
</div>
<script src="assets/admin.js" defer></script>
</body></html>
