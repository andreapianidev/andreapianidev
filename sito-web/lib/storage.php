<?php
require_once __DIR__ . '/config.php';

/**
 * Atomic JSON file update with flock-based locking.
 * Reads current contents, passes to $callback, writes result back.
 * Returns the value $callback returned.
 */
function aai_atomic_update(string $path, callable $callback, $defaultIfMissing = []) {
    $lockPath = AAI_LOCKS . '/' . md5($path) . '.lock';
    if (!is_dir(AAI_LOCKS)) mkdir(AAI_LOCKS, 0755, true);
    $lock = fopen($lockPath, 'c');
    if (!$lock) throw new RuntimeException("Cannot open lock for $path");
    if (!flock($lock, LOCK_EX)) { fclose($lock); throw new RuntimeException("Cannot acquire lock"); }

    try {
        $current = $defaultIfMissing;
        if (file_exists($path)) {
            $raw = file_get_contents($path);
            if ($raw !== false && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $current = $decoded;
            }
        }
        $next = $callback($current);
        if (!is_dir(dirname($path))) mkdir(dirname($path), 0755, true);
        $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
        $json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) throw new RuntimeException("Cannot encode JSON for $path");
        if (file_put_contents($tmp, $json) === false) throw new RuntimeException("Cannot write tmp file");
        if (!rename($tmp, $path)) { @unlink($tmp); throw new RuntimeException("Cannot rename tmp"); }
        return $next;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/**
 * Read JSON file, return decoded array (or default).
 * Read does not need exclusive lock; uses shared lock.
 */
function aai_read_json(string $path, $default = []) {
    if (!file_exists($path)) return $default;
    $f = fopen($path, 'r');
    if (!$f) return $default;
    flock($f, LOCK_SH);
    $raw = stream_get_contents($f);
    flock($f, LOCK_UN);
    fclose($f);
    if ($raw === '' || $raw === false) return $default;
    $d = json_decode($raw, true);
    return is_array($d) ? $d : $default;
}

/** Append a single line to a file (events.jsonl). */
function aai_append_line(string $path, string $line): void {
    if (!is_dir(dirname($path))) mkdir(dirname($path), 0755, true);
    $f = fopen($path, 'a');
    if (!$f) throw new RuntimeException("Cannot open $path for append");
    flock($f, LOCK_EX);
    fwrite($f, rtrim($line, "\n") . "\n");
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
}

/** Build conversation file path from session_id and started_at. */
function aai_conv_path(string $sessionId, string $startedAt): string {
    $date = substr($startedAt, 0, 10);
    return AAI_CONV . "/{$date}_{$sessionId}.json";
}

/** Find conversation file by session_id (scans dir, falls back if date unknown). */
function aai_find_conv_path(string $sessionId): ?string {
    $idx = aai_read_json(AAI_INDEX, []);
    if (isset($idx[$sessionId]['path'])) {
        $p = AAI_DATA . '/' . $idx[$sessionId]['path'];
        if (file_exists($p)) return $p;
    }
    foreach (glob(AAI_CONV . "/*_{$sessionId}.json") ?: [] as $p) {
        return $p;
    }
    return null;
}
