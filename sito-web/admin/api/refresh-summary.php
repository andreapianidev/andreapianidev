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

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$body = aai_read_body();
if (!aai_admin_csrf_check($body['csrf'] ?? null)) {
    http_response_code(403);
    echo json_encode(['error' => 'csrf_failed']);
    exit;
}

// --- Branch: ack last error ---
if (!empty($_GET['ack'])) {
    aai_summary_ack_error();
    echo json_encode(['ok' => true]);
    exit;
}

// --- Branch: regenerate ---
$today = gmdate('Y-m-d');
$auto  = !empty($body['auto']);

$lock = aai_summary_acquire_lock();
if (!$lock) {
    http_response_code(409);
    echo json_encode(['error' => 'lock_busy', 'message' => 'Generazione già in corso, riprova tra qualche secondo.']);
    exit;
}

try {
    if ($auto && file_exists(aai_summary_path($today))) {
        echo json_encode(['ok' => true, 'skipped' => true, 'reason' => 'already_exists']);
        exit;
    }
    $payload = aai_summary_generate($auto ? 'auto_fallback' : 'manual');
    echo json_encode([
        'ok'      => true,
        'payload' => $payload,
    ]);
} catch (Throwable $e) {
    aai_summary_save_error($e->getMessage(), $auto ? 'auto_fallback' : 'manual');
    http_response_code(500);
    echo json_encode(['error' => 'generation_failed', 'message' => $e->getMessage()]);
} finally {
    aai_summary_release_lock($lock);
}
