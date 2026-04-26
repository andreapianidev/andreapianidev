<?php
require_once __DIR__ . '/../lib/storage.php';
require_once __DIR__ . '/../lib/util.php';
require_once __DIR__ . '/../lib/csrf.php';
require_once __DIR__ . '/../lib/ratelimit.php';

aai_require_post();
aai_check_origin();

$ip = aai_client_ip();
$ipHash = aai_hash_ip($ip);
aai_rate_limit_or_429('new_session', $ipHash, AAI_RL_NEW_SESSIONS_PER_IP);

$body = aai_read_body();
$pageUrl  = aai_clean_text((string)($body['page_url']  ?? ''), 500);
$referrer = aai_clean_text((string)($body['referrer'] ?? ''), 500);
$ua       = aai_clean_text((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 500);
$device   = in_array(($body['device'] ?? null), ['mobile','desktop'], true)
    ? $body['device'] : aai_guess_device($ua);

$sid = aai_uuid_v4();
$now = aai_now_iso();

$session = [
    'session_id'        => $sid,
    'started_at'        => $now,
    'last_activity_at'  => $now,
    'phone'             => null,
    'phone_collected_at'=> null,
    'phone_trigger'     => null,
    'page_url'          => $pageUrl,
    'referrer'          => $referrer,
    'user_agent'        => $ua,
    'ip_hash'           => $ipHash,
    'device'            => $device,
    'status'            => 'open',
    'tags'              => [],
    'notes'             => '',
    'contacted_back'    => false,
    'contacted_back_at' => null,
    'messages'          => [],
];

$path = aai_conv_path($sid, $now);
aai_atomic_update($path, fn() => $session);

// Update master index
aai_atomic_update(AAI_INDEX, function ($cur) use ($sid, $now, $pageUrl, $device, $path) {
    $cur[$sid] = [
        'started_at'       => $now,
        'last_activity_at' => $now,
        'page_url'         => $pageUrl,
        'device'           => $device,
        'phone'            => null,
        'msg_count'        => 0,
        'status'           => 'open',
        'path'             => 'conversations/' . basename($path),
    ];
    return $cur;
});

$csrf = aai_csrf_create($sid);
aai_json(['session_id' => $sid, 'csrf_token' => $csrf]);
