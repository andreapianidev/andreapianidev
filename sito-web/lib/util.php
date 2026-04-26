<?php
require_once __DIR__ . '/config.php';

/** RFC 4122 v4 UUID. */
function aai_uuid_v4(): string {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

/** ISO-8601 timestamp UTC. */
function aai_now_iso(): string {
    return gmdate('Y-m-d\TH:i:s\Z');
}

/** Salted SHA-256 of client IP. */
function aai_hash_ip(?string $ip): string {
    if (!$ip) return '';
    return hash('sha256', AAI_IP_SALT . '|' . $ip);
}

/** Real client IP (respect single proxy if needed). */
function aai_client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '';
}

/** Validate phone (permissive). Returns normalized E.164-ish or null. */
function aai_normalize_phone(string $raw): ?string {
    $raw = trim($raw);
    if (!preg_match(AAI_PHONE_REGEX, $raw)) return null;
    $digits = preg_replace('/[^\d+]/', '', $raw);
    // If starts with + keep, else if 9-10 digits assume Italian +39
    if (str_starts_with($digits, '+')) return $digits;
    if (preg_match('/^3\d{8,9}$/', $digits) || preg_match('/^0\d{9,10}$/', $digits)) {
        return '+39' . ltrim($digits, '0');
    }
    return '+' . $digits;
}

/** JSON response helper. */
function aai_json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Reject non-POST. */
function aai_require_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') aai_json(['error' => 'method_not_allowed'], 405);
}

/** Read JSON body. */
function aai_read_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

/** Origin check. */
function aai_check_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $allowed = AAI_ALLOWED_ORIGIN;
    $ok = ($origin && str_starts_with($origin, $allowed))
       || ($referer && str_starts_with($referer, $allowed));
    if (!$ok) aai_json(['error' => 'origin_forbidden'], 403);
    header('Access-Control-Allow-Origin: ' . $allowed);
    header('Vary: Origin');
}

/** Device guess from User-Agent. */
function aai_guess_device(?string $ua): string {
    if (!$ua) return 'desktop';
    return preg_match('/Mobi|Android|iPhone|iPad|iPod/i', $ua) ? 'mobile' : 'desktop';
}

/**
 * Parse User-Agent into browser + OS family. Pure regex, no external libs.
 * Order matters: more specific patterns first (Edge before Chrome, Chrome before Safari).
 * Returns ['browser' => slug, 'os' => slug]. Slugs are stable keys for storage.
 */
function aai_parse_ua(?string $ua): array {
    if (!$ua) return ['browser' => 'unknown', 'os' => 'unknown'];

    // Browser detection — order matters
    if (preg_match('/Edg\//i', $ua))                       $browser = 'edge';
    elseif (preg_match('/OPR\/|Opera/i', $ua))             $browser = 'opera';
    elseif (preg_match('/SamsungBrowser/i', $ua))          $browser = 'samsung';
    elseif (preg_match('/Firefox|FxiOS/i', $ua))           $browser = 'firefox';
    elseif (preg_match('/CriOS/i', $ua))                   $browser = 'chrome';        // Chrome on iOS
    elseif (preg_match('/Chrome/i', $ua))                  $browser = 'chrome';
    elseif (preg_match('/Safari/i', $ua))                  $browser = 'safari';
    elseif (preg_match('/MSIE|Trident/i', $ua))            $browser = 'ie';
    elseif (preg_match('/bot|crawl|spider|slurp/i', $ua))  $browser = 'bot';
    else                                                    $browser = 'other';

    // OS detection
    if (preg_match('/Windows NT/i', $ua))               $os = 'windows';
    elseif (preg_match('/iPhone|iPad|iPod/i', $ua))     $os = 'ios';
    elseif (preg_match('/Android/i', $ua))              $os = 'android';
    elseif (preg_match('/Mac OS X|Macintosh/i', $ua))   $os = 'macos';
    elseif (preg_match('/CrOS/i', $ua))                 $os = 'chromeos';
    elseif (preg_match('/Linux/i', $ua))                $os = 'linux';
    else                                                 $os = 'other';

    return ['browser' => $browser, 'os' => $os];
}

/** Friendly metadata for browser/OS slugs. */
function aai_browser_meta(string $slug): array {
    static $map = [
        'chrome'  => ['Chrome',          '🟢', '#4285f4'],
        'safari'  => ['Safari',          '🧭', '#0fb5ee'],
        'firefox' => ['Firefox',         '🦊', '#ff7139'],
        'edge'    => ['Edge',            '🔷', '#0078d7'],
        'opera'   => ['Opera',           '🅾️', '#ff1b2d'],
        'samsung' => ['Samsung Browser', '📱', '#1428a0'],
        'ie'      => ['Internet Explorer','🟦', '#1ebbee'],
        'bot'     => ['Bot / Crawler',   '🤖', '#6b7280'],
        'other'   => ['Altro',           '🌐', '#8b5cf6'],
        'unknown' => ['Sconosciuto',     '❓', '#6b7280'],
    ];
    return $map[$slug] ?? ['Altro', '🌐', '#8b5cf6'];
}
function aai_os_meta(string $slug): array {
    static $map = [
        'windows'  => ['Windows',  '🪟', '#0078d7'],
        'macos'    => ['macOS',    '🍎', '#a2aaad'],
        'ios'      => ['iOS',      '📱', '#000000'],
        'android'  => ['Android',  '🤖', '#3ddc84'],
        'linux'    => ['Linux',    '🐧', '#fcc624'],
        'chromeos' => ['ChromeOS', '🟢', '#4285f4'],
        'other'    => ['Altro',    '💻', '#8b5cf6'],
        'unknown'  => ['Sconosciuto','❓','#6b7280'],
    ];
    return $map[$slug] ?? ['Altro', '💻', '#8b5cf6'];
}

/** Bucket a screen width into a stable category for aggregation. */
function aai_screen_bucket(?int $w): string {
    if (!$w || $w <= 0)   return 'unknown';
    if ($w < 480)         return 'mobile_xs';   // <480
    if ($w < 768)         return 'mobile';      // 480-767
    if ($w < 1024)        return 'tablet';      // 768-1023
    if ($w < 1366)        return 'laptop';      // 1024-1365
    if ($w < 1920)        return 'desktop';     // 1366-1919
    if ($w < 2560)        return 'desktop_hd';  // 1920-2559
    return 'desktop_4k';                         // 2560+
}
function aai_screen_meta(string $slug): array {
    static $map = [
        'mobile_xs'   => ['<480px',          '📱'],
        'mobile'      => ['480-767px',       '📱'],
        'tablet'      => ['768-1023px',      '📲'],
        'laptop'      => ['1024-1365px',     '💻'],
        'desktop'     => ['1366-1919px',     '🖥️'],
        'desktop_hd'  => ['1920-2559px',     '🖥️'],
        'desktop_4k'  => ['2560px+',         '🖥️'],
        'unknown'     => ['Sconosciuto',     '❓'],
    ];
    return $map[$slug] ?? ['Altro', '📐'];
}

/** Normalize a browser language tag (en-US → en, it-it → it). Returns 2-letter or 'unknown'. */
function aai_lang_bucket(?string $raw): string {
    if (!$raw) return 'unknown';
    $raw = strtolower(trim($raw));
    if (!preg_match('/^([a-z]{2})(?:[-_][a-z0-9]+)?$/', $raw, $m)) return 'unknown';
    return $m[1];
}
function aai_lang_meta(string $code): array {
    static $map = [
        'it' => ['Italiano',  '🇮🇹'],
        'en' => ['English',   '🇬🇧'],
        'de' => ['Deutsch',   '🇩🇪'],
        'fr' => ['Français',  '🇫🇷'],
        'es' => ['Español',   '🇪🇸'],
        'pt' => ['Português', '🇵🇹'],
        'ru' => ['Русский',   '🇷🇺'],
        'zh' => ['中文',       '🇨🇳'],
        'ja' => ['日本語',     '🇯🇵'],
        'ar' => ['العربية',   '🇸🇦'],
        'nl' => ['Nederlands','🇳🇱'],
        'pl' => ['Polski',    '🇵🇱'],
        'unknown' => ['Sconosciuto','❓'],
    ];
    return $map[$code] ?? [strtoupper($code), '🌐'];
}

/** Sanitize string (collapse, length cap, strip control chars). */
function aai_clean_text(string $s, int $max = 2000): string {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    $s = trim($s);
    if (mb_strlen($s) > $max) $s = mb_substr($s, 0, $max);
    return $s;
}

/** Constant-time string compare wrapper. */
function aai_eq(string $a, string $b): bool {
    return hash_equals($a, $b);
}

/**
 * Classify a referrer URL into a traffic source bucket (GA-style).
 * Returns ['source' => bucket, 'host' => normalized-host].
 * Internal referrers (same site) are bucketed as 'direct' so they don't
 * pollute the "where do visitors come from" view.
 */
function aai_classify_referrer(string $referrer, string $ownHost = 'www.andreapiani.com'): array {
    $referrer = trim($referrer);
    if ($referrer === '') return ['source' => 'direct', 'host' => ''];

    $host = parse_url($referrer, PHP_URL_HOST);
    if (!$host) return ['source' => 'direct', 'host' => ''];

    $h = strtolower($host);
    $h = preg_replace('/^www\./', '', $h) ?? $h;
    $own = preg_replace('/^www\./', '', strtolower($ownHost)) ?? $ownHost;

    // Internal navigation → treat as direct
    if ($h === $own || str_ends_with($h, '.' . $own)) {
        return ['source' => 'direct', 'host' => $h];
    }

    // Search engines
    if (preg_match('/(^|\.)google\./', $h))    return ['source' => 'google',     'host' => $h];
    if (str_contains($h, 'bing.com'))          return ['source' => 'bing',       'host' => $h];
    if (str_contains($h, 'duckduckgo.com'))    return ['source' => 'duckduckgo', 'host' => $h];
    if (preg_match('/(^|\.)yahoo\./', $h))     return ['source' => 'yahoo',      'host' => $h];
    if (str_contains($h, 'yandex.'))           return ['source' => 'yandex',     'host' => $h];
    if (str_contains($h, 'ecosia.org'))        return ['source' => 'ecosia',     'host' => $h];
    if (str_contains($h, 'baidu.com'))         return ['source' => 'baidu',      'host' => $h];

    // AI assistants (Claude/ChatGPT/Perplexity etc. - new traffic source)
    if (str_contains($h, 'chat.openai.com') || str_contains($h, 'chatgpt.com')) return ['source' => 'chatgpt',    'host' => $h];
    if (str_contains($h, 'perplexity.ai'))                                       return ['source' => 'perplexity', 'host' => $h];
    if (str_contains($h, 'claude.ai'))                                           return ['source' => 'claude',     'host' => $h];
    if (str_contains($h, 'gemini.google.com') || str_contains($h, 'bard.google.com')) return ['source' => 'gemini', 'host' => $h];

    // Social
    if (preg_match('/facebook|fb\.com|fb\.me/', $h))      return ['source' => 'facebook',  'host' => $h];
    if (str_contains($h, 'instagram'))                    return ['source' => 'instagram', 'host' => $h];
    if (preg_match('/^t\.co$|twitter\.com|^x\.com$/', $h))return ['source' => 'twitter',   'host' => $h];
    if (str_contains($h, 'linkedin'))                     return ['source' => 'linkedin',  'host' => $h];
    if (str_contains($h, 'youtube') || $h === 'youtu.be') return ['source' => 'youtube',   'host' => $h];
    if (str_contains($h, 'tiktok'))                       return ['source' => 'tiktok',    'host' => $h];
    if (str_contains($h, 'reddit'))                       return ['source' => 'reddit',    'host' => $h];
    if (str_contains($h, 'pinterest'))                    return ['source' => 'pinterest', 'host' => $h];
    if (str_contains($h, 'whatsapp'))                     return ['source' => 'whatsapp',  'host' => $h];
    if (str_contains($h, 'telegram') || $h === 't.me')    return ['source' => 'telegram',  'host' => $h];

    return ['source' => 'referral', 'host' => $h];
}

/**
 * Human-friendly metadata for a traffic source bucket.
 * Returns indexed array [0 => label, 1 => icon, 2 => color] — destructure with list().
 */
function aai_source_meta(string $source): array {
    static $map = [
        'google'     => ['Google',       '🔍', '#4285f4'],
        'bing'       => ['Bing',         '🔎', '#00809d'],
        'duckduckgo' => ['DuckDuckGo',   '🦆', '#de5833'],
        'yahoo'      => ['Yahoo',        '🔍', '#5f01d1'],
        'yandex'     => ['Yandex',       '🔍', '#ff0000'],
        'ecosia'     => ['Ecosia',       '🌳', '#36a566'],
        'baidu'      => ['Baidu',        '🔍', '#2319dc'],
        'chatgpt'    => ['ChatGPT',      '🤖', '#10a37f'],
        'perplexity' => ['Perplexity',   '🤖', '#20808d'],
        'claude'     => ['Claude',       '🤖', '#cc785c'],
        'gemini'     => ['Gemini',       '🤖', '#1a73e8'],
        'facebook'   => ['Facebook',     '📘', '#1877f2'],
        'instagram'  => ['Instagram',    '📷', '#e4405f'],
        'twitter'    => ['Twitter / X',  '𝕏', '#000000'],
        'linkedin'   => ['LinkedIn',     '💼', '#0a66c2'],
        'youtube'    => ['YouTube',      '📺', '#ff0000'],
        'tiktok'     => ['TikTok',       '🎵', '#010101'],
        'reddit'     => ['Reddit',       '👽', '#ff4500'],
        'pinterest'  => ['Pinterest',    '📌', '#bd081c'],
        'whatsapp'   => ['WhatsApp',     '💬', '#25d366'],
        'telegram'   => ['Telegram',     '✈️', '#26a5e4'],
        'direct'     => ['Diretto',      '➡️', '#6b7280'],
        'referral'   => ['Altro sito',   '🔗', '#8b5cf6'],
    ];
    return $map[$source] ?? [ucfirst($source), '🔗', '#8b5cf6'];
}
