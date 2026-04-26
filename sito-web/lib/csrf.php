<?php
require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/util.php';

/**
 * CSRF tokens are tied to the session_id created at start-session.
 * Stored in a small KV file so widget API can verify them.
 * (Index-level fields would also work; separate file keeps hot path slim.)
 */

define('AAI_CSRF_FILE', AAI_DATA . '/csrf.json');
define('AAI_CSRF_TTL_SEC', 6 * 3600); // 6h

function aai_csrf_create(string $sessionId): string {
    $token = bin2hex(random_bytes(24));
    aai_atomic_update(AAI_CSRF_FILE, function ($cur) use ($sessionId, $token) {
        $now = time();
        // GC old
        foreach ($cur as $sid => $row) {
            if (!is_array($row) || ($row['exp'] ?? 0) < $now) unset($cur[$sid]);
        }
        $cur[$sessionId] = ['t' => $token, 'exp' => $now + AAI_CSRF_TTL_SEC];
        return $cur;
    });
    return $token;
}

function aai_csrf_verify(string $sessionId, string $token): bool {
    if (!$sessionId || !$token) return false;
    $cur = aai_read_json(AAI_CSRF_FILE, []);
    $row = $cur[$sessionId] ?? null;
    if (!is_array($row)) return false;
    if (($row['exp'] ?? 0) < time()) return false;
    return aai_eq((string)$row['t'], $token);
}
