<?php
require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/util.php';

/** Initialize a hardened PHP session for the admin panel. */
function aai_admin_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('aai_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/admin/',
        'secure'   => !empty($_SERVER['HTTPS']) || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

/** True if an admin is logged in. */
function aai_admin_is_logged_in(): bool {
    aai_admin_session_start();
    return !empty($_SESSION['aai_user']);
}

/** Require login or redirect/JSON. */
function aai_admin_require(string $loginPath = '/admin/login.php'): void {
    if (!aai_admin_is_logged_in()) {
        if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
            aai_json(['error' => 'auth_required'], 401);
        }
        header('Location: ' . $loginPath);
        exit;
    }
}

/** Verify credentials. Returns username on success, null otherwise. */
function aai_admin_verify(string $username, string $password): ?string {
    $users = aai_read_json(AAI_USERS, []);
    foreach ($users as $u) {
        if (!is_array($u)) continue;
        if (($u['username'] ?? '') === $username && password_verify($password, $u['password_hash'] ?? '')) {
            return $username;
        }
    }
    return null;
}

/** Login throttling per IP. */
function aai_admin_record_attempt(string $ip, bool $success): void {
    $now = time();
    aai_atomic_update(AAI_LOGINS, function ($cur) use ($ip, $now, $success) {
        $cur[$ip] = $cur[$ip] ?? ['fails' => [], 'last_success' => null];
        // GC fails older than window
        $cur[$ip]['fails'] = array_values(array_filter(
            $cur[$ip]['fails'] ?? [],
            fn($t) => $t > $now - AAI_LOGIN_WINDOW_SEC
        ));
        if ($success) $cur[$ip]['last_success'] = $now;
        else $cur[$ip]['fails'][] = $now;
        return $cur;
    });
}

function aai_admin_is_throttled(string $ip): bool {
    $cur = aai_read_json(AAI_LOGINS, []);
    $row = $cur[$ip] ?? null;
    if (!is_array($row)) return false;
    $now = time();
    $fails = array_filter($row['fails'] ?? [], fn($t) => $t > $now - AAI_LOGIN_WINDOW_SEC);
    return count($fails) >= AAI_LOGIN_MAX_ATTEMPTS;
}

/** CSRF for admin forms. */
function aai_admin_csrf(): string {
    aai_admin_session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
    return $_SESSION['csrf'];
}
function aai_admin_csrf_check(?string $token): bool {
    aai_admin_session_start();
    return $token && !empty($_SESSION['csrf']) && aai_eq($_SESSION['csrf'], $token);
}
