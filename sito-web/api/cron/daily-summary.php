<?php
/**
 * Daily AI summary cron endpoint.
 *
 * Schedule (cron-job.org or similar) GET to:
 *   https://www.andreapiani.com/api/cron/daily-summary.php?token=<AAI_CRON_TOKEN>
 * at 07:00 Europe/Rome every day.
 *
 * Token-protected, lock-protected, idempotent (safe to call twice in a row —
 * second call still rewrites today's file but DeepSeek will be hit again, so
 * cron-job.org should NOT retry on 200; only on 5xx).
 */

require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';
require_once __DIR__ . '/../../admin/lib/daily-summary.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$token = $_GET['token'] ?? '';
if (!$token || !aai_eq(AAI_CRON_TOKEN, $token)) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$lock = aai_summary_acquire_lock();
if (!$lock) {
    http_response_code(409);
    echo json_encode(['error' => 'lock_busy']);
    exit;
}

try {
    $payload = aai_summary_generate('cron');
    echo json_encode([
        'ok'           => true,
        'date'         => $payload['date'],
        'tokens_used'  => $payload['tokens_used']['total'],
        'generated_at' => $payload['generated_at'],
    ]);
} catch (Throwable $e) {
    aai_summary_save_error($e->getMessage(), 'cron');
    http_response_code(500);
    echo json_encode(['error' => 'generation_failed', 'message' => $e->getMessage()]);
} finally {
    aai_summary_release_lock($lock);
}
