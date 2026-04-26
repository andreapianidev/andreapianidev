<?php
require_once __DIR__ . '/../lib/storage.php';
require_once __DIR__ . '/../lib/util.php';
require_once __DIR__ . '/../lib/csrf.php';
require_once __DIR__ . '/../lib/ratelimit.php';

aai_require_post();
aai_check_origin();

$body = aai_read_body();
$sid     = (string)($body['session_id'] ?? '');
$type    = (string)($body['event_type'] ?? '');
$payload = is_array($body['payload'] ?? null) ? $body['payload'] : [];
$csrf    = (string)($body['csrf'] ?? '');

$ALLOWED = [
    'page_view','chat_open','consent_accept','chat_start',
    'phone_form_shown','phone_submitted','phone_dismissed',
    'whatsapp_click','chat_reset','chat_close',
];
if (!in_array($type, $ALLOWED, true)) aai_json(['error' => 'unknown_event'], 400);

// page_view & whatsapp_click can fire without a session (analytics.js on every page)
$requiresSession = !in_array($type, ['page_view','whatsapp_click'], true);
if ($requiresSession) {
    if (!$sid || !aai_csrf_verify($sid, $csrf)) aai_json(['error' => 'csrf'], 403);
}

$ipHash = aai_hash_ip(aai_client_ip());
aai_rate_limit_or_429('event', $sid ?: $ipHash, 120);

$now = aai_now_iso();
$today = substr($now, 0, 10);

// Append raw event
$evt = [
    'ts'      => $now,
    'type'    => $type,
    'sid'     => $sid ?: null,
    'ip_hash' => $ipHash,
    'page'    => aai_clean_text((string)($payload['page_url'] ?? ''), 500),
    'device'  => in_array(($payload['device'] ?? null), ['mobile','desktop'], true)
                  ? $payload['device'] : aai_guess_device($_SERVER['HTTP_USER_AGENT'] ?? ''),
    'extra'   => array_diff_key($payload, array_flip(['page_url','device'])),
];
aai_append_line(AAI_EVENTS, json_encode($evt, JSON_UNESCAPED_UNICODE));

// Pre-compute client classification (only used for page_view, but cheap)
$uaParsed = aai_parse_ua($_SERVER['HTTP_USER_AGENT'] ?? null);
$screenW  = isset($body['payload']['screen_w']) ? (int)$body['payload']['screen_w'] : 0;
$screenBucket = aai_screen_bucket($screenW);
$langBucket   = aai_lang_bucket((string)($body['payload']['lang'] ?? ''));

// Increment daily counters
$dailyPath = AAI_STATS . "/daily/{$today}.json";
aai_atomic_update($dailyPath, function ($cur) use ($type, $evt, $today, $uaParsed, $screenBucket, $langBucket) {
    if (!isset($cur['date'])) {
        $cur = [
            'date'          => $today,
            'page_views'    => ['total' => 0, 'by_page' => []],
            'chat_open'     => 0,
            'consent_accept'=> 0,
            'chat_start'    => 0,
            'phone_form_shown' => 0,
            'phone_submitted'  => 0,
            'phone_dismissed'  => 0,
            'whatsapp_click'   => 0,
            'chat_reset'       => 0,
            'chat_close'       => 0,
            'unique_sessions'  => [],
            'unique_visitors'  => [],
            'device'           => ['mobile' => 0, 'desktop' => 0],
            'browser'          => [],
            'os'               => [],
            'lang'             => [],
            'screen'           => [],
        ];
    }
    if ($type === 'page_view') {
        $cur['page_views']['total'] = ($cur['page_views']['total'] ?? 0) + 1;
        $key = $evt['page'] !== '' ? parse_url($evt['page'], PHP_URL_PATH) ?: '/' : '/';
        $cur['page_views']['by_page'][$key] = ($cur['page_views']['by_page'][$key] ?? 0) + 1;

        // Aggregate traffic source from referrer (GA-style)
        $ref = (string)($evt['extra']['referrer'] ?? '');
        $cls = aai_classify_referrer($ref);
        if (!isset($cur['sources'])) $cur['sources'] = [];
        $cur['sources'][$cls['source']] = ($cur['sources'][$cls['source']] ?? 0) + 1;
        if ($cls['host'] !== '' && $cls['source'] !== 'direct') {
            if (!isset($cur['referrer_hosts'])) $cur['referrer_hosts'] = [];
            $cur['referrer_hosts'][$cls['host']] = ($cur['referrer_hosts'][$cls['host']] ?? 0) + 1;
        }

        // Hourly buckets (UTC hour 00-23)
        $hr = (int)substr($evt['ts'], 11, 2);
        if (!isset($cur['hourly']) || count($cur['hourly']) !== 24) $cur['hourly'] = array_fill(0, 24, 0);
        $cur['hourly'][$hr] = ($cur['hourly'][$hr] ?? 0) + 1;

        // Browser / OS / language / screen aggregation (page_view only)
        if (!isset($cur['browser']))  $cur['browser']  = [];
        if (!isset($cur['os']))       $cur['os']       = [];
        if (!isset($cur['lang']))     $cur['lang']     = [];
        if (!isset($cur['screen']))   $cur['screen']   = [];
        $cur['browser'][$uaParsed['browser']] = ($cur['browser'][$uaParsed['browser']] ?? 0) + 1;
        $cur['os'][$uaParsed['os']]           = ($cur['os'][$uaParsed['os']] ?? 0) + 1;
        $cur['lang'][$langBucket]             = ($cur['lang'][$langBucket] ?? 0) + 1;
        $cur['screen'][$screenBucket]         = ($cur['screen'][$screenBucket] ?? 0) + 1;
    } else {
        $cur[$type] = ($cur[$type] ?? 0) + 1;
    }
    if ($evt['sid']) $cur['unique_sessions'][$evt['sid']] = 1;
    if ($evt['ip_hash']) $cur['unique_visitors'][$evt['ip_hash']] = 1;
    if (!empty($evt['device'])) $cur['device'][$evt['device']] = ($cur['device'][$evt['device']] ?? 0) + 1;
    return $cur;
}, []);

aai_json(['ok' => true]);
