<?php
require_once __DIR__ . '/../lib/storage.php';
require_once __DIR__ . '/../lib/util.php';
require_once __DIR__ . '/../lib/csrf.php';
require_once __DIR__ . '/../lib/ratelimit.php';

aai_require_post();
aai_check_origin();

$body = aai_read_body();
$sid  = (string)($body['session_id'] ?? '');
$role = (string)($body['role'] ?? '');
$content = aai_clean_text((string)($body['content'] ?? ''), 4000);
$csrf = (string)($body['csrf'] ?? '');

if (!$sid || !in_array($role, ['user', 'assistant'], true) || $content === '') {
    aai_json(['error' => 'bad_request'], 400);
}
if (!aai_csrf_verify($sid, $csrf)) aai_json(['error' => 'csrf'], 403);

aai_rate_limit_or_429('msg_session', $sid, AAI_RL_MSGS_PER_SESSION);

$path = aai_find_conv_path($sid);
if (!$path) aai_json(['error' => 'session_not_found'], 404);

$now = aai_now_iso();
$msgId = 'm' . substr(bin2hex(random_bytes(4)), 0, 6);

aai_atomic_update($path, function ($cur) use ($role, $content, $now, $msgId) {
    if (!is_array($cur) || !isset($cur['session_id'])) {
        throw new RuntimeException('corrupt session file');
    }
    $cur['messages'][] = [
        'id'        => $msgId,
        'role'      => $role,
        'content'   => $content,
        'timestamp' => $now,
    ];
    $cur['last_activity_at'] = $now;
    return $cur;
});

aai_atomic_update(AAI_INDEX, function ($cur) use ($sid, $now) {
    if (isset($cur[$sid])) {
        $cur[$sid]['last_activity_at'] = $now;
        $cur[$sid]['msg_count'] = ($cur[$sid]['msg_count'] ?? 0) + 1;
    }
    return $cur;
});

aai_json(['ok' => true, 'message_id' => $msgId]);
