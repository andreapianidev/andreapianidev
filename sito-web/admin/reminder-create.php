<?php
require_once __DIR__ . '/../lib/storage.php';
require_once __DIR__ . '/../lib/util.php';
require_once __DIR__ . '/../lib/auth.php';

aai_admin_require();
aai_require_post();

$body = aai_read_body();
if (!aai_admin_csrf_check($body['csrf'] ?? '')) aai_json(['error' => 'csrf'], 403);

$sid = (string)($body['session_id'] ?? '');
$phone = trim((string)($body['phone'] ?? ''));
$dueRaw = trim((string)($body['due_at'] ?? ''));
$note = aai_clean_text((string)($body['note'] ?? ''), 500);

$due = strtotime($dueRaw);
if (!$due) aai_json(['error' => 'invalid_date'], 422);

$id = 'r' . bin2hex(random_bytes(6));
aai_atomic_update(AAI_REMIND, function ($cur) use ($id, $sid, $phone, $due, $note) {
    $cur[] = [
        'id'         => $id,
        'session_id' => $sid ?: null,
        'phone'      => $phone ?: null,
        'due_at'     => date('c', $due),
        'note'       => $note,
        'done'       => false,
        'created_at' => aai_now_iso(),
    ];
    return $cur;
});

aai_json(['ok' => true, 'id' => $id]);
