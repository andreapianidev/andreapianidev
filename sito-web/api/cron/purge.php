<?php
/**
 * Weekly retention purge.
 * Call via:  https://www.andreapiani.com/data/cron/purge.php?token=<AAI_CRON_TOKEN>
 * (the /data/.htaccess blocks direct access, so move this to /api/cron/ if running over HTTP,
 *  OR call from CLI: php data/cron/purge.php <token>)
 */

require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';

$token = $_GET['token'] ?? ($argv[1] ?? '');
if (!$token || !aai_eq(AAI_CRON_TOKEN, $token)) {
    http_response_code(401); echo "unauthorized\n"; exit;
}

$convCutoff   = time() - AAI_CONV_RETENTION_DAYS   * 86400;
$eventsCutoff = time() - AAI_EVENTS_RETENTION_DAYS * 86400;
$dailyCutoff  = time() - AAI_EVENTS_RETENTION_DAYS * 86400;
$logFile = AAI_DATA . '/cron/purge.log';

$report = ['ts' => aai_now_iso(), 'conv_deleted' => 0, 'events_kept' => 0, 'daily_deleted' => 0, 'index_compacted' => 0];

// 1. Delete old conversation files
foreach (glob(AAI_CONV . "/*.json") ?: [] as $p) {
    $row = aai_read_json($p, null);
    if (!$row) continue;
    $last = strtotime($row['last_activity_at'] ?? $row['started_at'] ?? '0');
    if ($last && $last < $convCutoff) {
        $sid = $row['session_id'] ?? '';
        unlink($p);
        $report['conv_deleted']++;
        // Remove from index
        if ($sid) {
            aai_atomic_update(AAI_INDEX, function ($cur) use ($sid) { unset($cur[$sid]); return $cur; });
        }
    }
}

// 2. Truncate events.jsonl to last N days
if (file_exists(AAI_EVENTS)) {
    $tmp = AAI_EVENTS . '.tmp';
    $in  = fopen(AAI_EVENTS, 'r');
    $out = fopen($tmp, 'w');
    flock($in, LOCK_SH);
    while (($line = fgets($in)) !== false) {
        $row = json_decode($line, true);
        if (!is_array($row)) continue;
        $ts = strtotime($row['ts'] ?? '0');
        if ($ts && $ts >= $eventsCutoff) {
            fwrite($out, $line);
            $report['events_kept']++;
        }
    }
    flock($in, LOCK_UN); fclose($in); fclose($out);
    rename($tmp, AAI_EVENTS);
}

// 3. Delete old daily/* files
foreach (glob(AAI_STATS . "/daily/*.json") ?: [] as $p) {
    $base = basename($p, '.json');
    $ts = strtotime($base);
    if ($ts && $ts < $dailyCutoff) {
        unlink($p);
        $report['daily_deleted']++;
    }
}

// 3b. Delete old daily-summary/* files (90-day retention, dated YYYY-MM-DD.json)
$report['daily_summary_deleted'] = 0;
foreach (glob(AAI_STATS . "/daily-summary/*.json") ?: [] as $p) {
    $base = basename($p, '.json');
    if ($base === 'last-error') continue;
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $base)) continue;
    $ts = strtotime($base);
    if ($ts && $ts < $dailyCutoff) {
        unlink($p);
        $report['daily_summary_deleted']++;
    }
}

// 4. Compact index.json (drop entries whose conv file no longer exists)
aai_atomic_update(AAI_INDEX, function ($cur) use (&$report) {
    foreach ($cur as $sid => $meta) {
        $path = AAI_DATA . '/' . ($meta['path'] ?? '');
        if (!file_exists($path)) { unset($cur[$sid]); $report['index_compacted']++; }
    }
    return $cur;
});

// 5. GC ratelimit / csrf / login_attempts (drop expired entries)
aai_atomic_update(AAI_DATA . '/csrf.json', function ($cur) {
    $now = time();
    foreach ($cur as $k => $v) if (!is_array($v) || ($v['exp'] ?? 0) < $now) unset($cur[$k]);
    return $cur;
}, []);

file_put_contents($logFile, json_encode($report) . "\n", FILE_APPEND);
header('Content-Type: application/json');
echo json_encode($report, JSON_PRETTY_PRINT);
