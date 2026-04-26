<?php
require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/util.php';

define('AAI_RL_FILE', AAI_DATA . '/ratelimit.json');

/**
 * Sliding-window rate limit, file-backed.
 * Returns true if action is allowed; false if limit exceeded.
 */
function aai_rate_limit(string $bucket, string $key, int $maxPerMinute): bool {
    $now = time();
    $allowed = true;
    aai_atomic_update(AAI_RL_FILE, function ($cur) use ($bucket, $key, $maxPerMinute, $now, &$allowed) {
        $cutoff = $now - 60;
        // GC entries older than 5 min across all buckets
        foreach ($cur as $b => $keys) {
            if (!is_array($keys)) { unset($cur[$b]); continue; }
            foreach ($keys as $k => $stamps) {
                if (!is_array($stamps)) { unset($cur[$b][$k]); continue; }
                $cur[$b][$k] = array_values(array_filter($stamps, fn($s) => $s > $now - 300));
                if (!$cur[$b][$k]) unset($cur[$b][$k]);
            }
            if (!$cur[$b]) unset($cur[$b]);
        }
        $bucketArr = $cur[$bucket][$key] ?? [];
        $recent = array_values(array_filter($bucketArr, fn($s) => $s > $cutoff));
        if (count($recent) >= $maxPerMinute) {
            $allowed = false;
        } else {
            $recent[] = $now;
            $cur[$bucket][$key] = $recent;
            $allowed = true;
        }
        return $cur;
    });
    return $allowed;
}

function aai_rate_limit_or_429(string $bucket, string $key, int $max): void {
    if (!aai_rate_limit($bucket, $key, $max)) aai_json(['error' => 'rate_limited'], 429);
}
