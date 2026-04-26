<?php
/**
 * Admin daily-summary refresh + error-ack endpoint.
 *
 * POST   /admin/api/refresh-summary.php          → regenerate today's summary
 *   body: { "csrf": "...", "auto": false }
 *   "auto": true is the dashboard one-shot fallback (silently no-op if file
 *   already exists, used to avoid double-charge if two tabs trigger together).
 *
 * POST   /admin/api/refresh-summary.php?ack=1    → mark last-error as seen
 *   body: { "csrf": "..." }
 */

require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../lib/daily-summary.php';

aai_admin_require();
aai_require_post();

// Detect if the client wants JSON (fetch) or HTML (plain form submit fallback).
$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false
          || stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;

if ($wantsJson) {
    header('Content-Type: application/json; charset=utf-8');
}
header('Cache-Control: no-store');

$body = $wantsJson ? aai_read_body() : $_POST;
$csrf = $body['csrf'] ?? ($_POST['csrf'] ?? null);

function aai_refresh_respond_err(bool $json, int $code, string $key, string $msg): void {
    if ($json) {
        http_response_code($code);
        echo json_encode(['error' => $key, 'message' => $msg]);
    } else {
        header('Location: /admin/index.php?summary_err=' . urlencode($msg), true, 302);
    }
    exit;
}

function aai_refresh_respond_ok(bool $json, array $extra = []): void {
    if ($json) {
        echo json_encode(array_merge(['ok' => true], $extra));
    } else {
        header('Location: /admin/index.php?summary_ok=1', true, 302);
    }
    exit;
}

if (!aai_admin_csrf_check($csrf)) {
    aai_refresh_respond_err($wantsJson, 403, 'csrf_failed', 'CSRF token non valido');
}

// --- Branch: ack last error ---
if (!empty($_GET['ack'])) {
    aai_summary_ack_error();
    aai_refresh_respond_ok($wantsJson);
}

// --- Branch: regenerate ---
$lock = aai_summary_acquire_lock();
if (!$lock) {
    aai_refresh_respond_err($wantsJson, 409, 'lock_busy', 'Generazione già in corso, riprova tra qualche secondo');
}

try {
    $payload = aai_summary_generate('manual');
    aai_refresh_respond_ok($wantsJson, ['payload' => $payload]);
} catch (Throwable $e) {
    aai_summary_save_error($e->getMessage(), 'manual');
    aai_refresh_respond_err($wantsJson, 500, 'generation_failed', $e->getMessage());
} finally {
    aai_summary_release_lock($lock);
}
