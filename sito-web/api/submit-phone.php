<?php
require_once __DIR__ . '/../lib/storage.php';
require_once __DIR__ . '/../lib/util.php';
require_once __DIR__ . '/../lib/csrf.php';

aai_require_post();
aai_check_origin();

$body    = aai_read_body();
$sid     = (string)($body['session_id'] ?? '');
$phoneIn = (string)($body['phone'] ?? '');
$trigger = (string)($body['trigger'] ?? 'manual_button');
$csrf    = (string)($body['csrf'] ?? '');

if (!$sid || !$phoneIn) aai_json(['error' => 'bad_request'], 400);
if (!aai_csrf_verify($sid, $csrf)) aai_json(['error' => 'csrf'], 403);
if (!in_array($trigger, ['ai_marker', 'rules_fallback', 'manual_button'], true)) {
    $trigger = 'manual_button';
}

$phone = aai_normalize_phone($phoneIn);
if (!$phone) aai_json(['error' => 'invalid_phone'], 422);

$path = aai_find_conv_path($sid);
if (!$path) aai_json(['error' => 'session_not_found'], 404);

$now = aai_now_iso();

aai_atomic_update($path, function ($cur) use ($phone, $trigger, $now) {
    $cur['phone'] = $phone;
    $cur['phone_collected_at'] = $now;
    $cur['phone_trigger'] = $trigger;
    $cur['last_activity_at'] = $now;
    return $cur;
});

aai_atomic_update(AAI_INDEX, function ($cur) use ($sid, $phone, $now) {
    if (isset($cur[$sid])) {
        $cur[$sid]['phone'] = $phone;
        $cur[$sid]['last_activity_at'] = $now;
    }
    return $cur;
});

aai_atomic_update(AAI_CONTACTS, function ($cur) use ($phone, $sid, $now) {
    $row = $cur[$phone] ?? [
        'phone'      => $phone,
        'first_seen' => $now,
        'sessions'   => [],
        'status'     => 'new',
        'notes'      => '',
        'contacted_back' => false,
    ];
    if (!in_array($sid, $row['sessions'] ?? [], true)) $row['sessions'][] = $sid;
    $row['last_seen'] = $now;
    $cur[$phone] = $row;
    return $cur;
});

aai_json(['ok' => true, 'phone' => $phone]);
