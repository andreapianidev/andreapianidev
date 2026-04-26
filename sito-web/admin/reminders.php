<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

// Mark done from query string (small action)
if (!empty($_GET['done'])) {
    $id = $_GET['done'];
    aai_atomic_update(AAI_REMIND, function ($cur) use ($id) {
        foreach ($cur as &$r) if (($r['id'] ?? '') === $id) { $r['done'] = true; $r['done_at'] = aai_now_iso(); }
        return $cur;
    });
    header('Location: reminders.php?ok=1'); exit;
}
if (!empty($_GET['delete'])) {
    if (!aai_admin_csrf_check($_GET['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $id = $_GET['delete'];
    aai_atomic_update(AAI_REMIND, fn($cur) => array_values(array_filter($cur, fn($r) => ($r['id'] ?? '') !== $id)));
    header('Location: reminders.php?ok=1'); exit;
}

$reminders = aai_read_json(AAI_REMIND, []);
$filter = $_GET['filter'] ?? 'pending';

usort($reminders, fn($a,$b) => strcmp($a['due_at'] ?? '', $b['due_at'] ?? ''));

$now = time();
$counts = ['pending' => 0, 'overdue' => 0, 'today' => 0, 'done' => 0];
foreach ($reminders as $r) {
    $due = strtotime($r['due_at'] ?? '0');
    if (!empty($r['done'])) { $counts['done']++; continue; }
    if ($due && $due < $now) $counts['overdue']++;
    if ($due && $due >= strtotime('today') && $due < strtotime('tomorrow')) $counts['today']++;
    $counts['pending']++;
}

$filtered = array_filter($reminders, function ($r) use ($filter, $now) {
    $due = strtotime($r['due_at'] ?? '0');
    if ($filter === 'done') return !empty($r['done']);
    if ($filter === 'overdue') return empty($r['done']) && $due && $due < $now;
    if ($filter === 'today') return empty($r['done']) && $due
        && $due >= strtotime('today') && $due < strtotime('tomorrow');
    return empty($r['done']);
});

aai_admin_header('Promemoria', 'reminders');
?>
<h1 class="adm-title">Promemoria</h1>

<?php if (!empty($_GET['ok'])): ?><div class="adm-flash adm-flash--ok">✓ Aggiornato.</div><?php endif; ?>

<div class="adm-filter-bar">
  <a class="adm-btn adm-btn--<?= $filter==='pending' ? '' : 'ghost' ?>" href="?filter=pending">In sospeso (<?= $counts['pending'] ?>)</a>
  <a class="adm-btn adm-btn--<?= $filter==='today' ? '' : 'ghost' ?>" href="?filter=today">Oggi (<?= $counts['today'] ?>)</a>
  <a class="adm-btn adm-btn--<?= $filter==='overdue' ? 'danger' : 'ghost' ?>" href="?filter=overdue">Scaduti (<?= $counts['overdue'] ?>)</a>
  <a class="adm-btn adm-btn--<?= $filter==='done' ? '' : 'ghost' ?>" href="?filter=done">Fatti (<?= $counts['done'] ?>)</a>
</div>

<?php if (!$filtered): ?>
  <div class="adm-empty">Nessun promemoria in questa vista.</div>
<?php else: ?>
  <table class="adm-table">
    <thead><tr><th>Scadenza</th><th>Telefono</th><th>Nota</th><th>Sessione</th><th>Status</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($filtered as $r): ?>
      <?php $overdue = empty($r['done']) && !empty($r['due_at']) && strtotime($r['due_at']) < $now; ?>
      <tr>
        <td data-label="Scadenza"><?= aai_fmt_dt($r['due_at'] ?? null) ?>
          <?= $overdue ? '<br><span class="adm-pill" style="background:#ef4444">scaduto</span>' : '' ?></td>
        <td data-label="Telefono"><?= aai_h($r['phone'] ?? '—') ?></td>
        <td data-label="Nota"><?= aai_h($r['note'] ?? '') ?></td>
        <td data-label="Sessione">
          <?php if (!empty($r['session_id'])): ?>
            <a href="session.php?id=<?= urlencode($r['session_id']) ?>">apri chat</a>
          <?php else: ?>—<?php endif; ?>
        </td>
        <td data-label="Status"><?= !empty($r['done']) ? '✓ fatto' : '⏳ in sospeso' ?></td>
        <td>
          <?php if (!empty($r['phone'])): ?>
            <a class="adm-btn adm-btn--small adm-btn--success" target="_blank"
               href="https://wa.me/<?= aai_h(preg_replace('/[^\d]/','', $r['phone'])) ?>">📲</a>
          <?php endif; ?>
          <?php if (empty($r['done'])): ?>
            <a class="adm-btn adm-btn--small adm-btn--ghost" href="?done=<?= urlencode($r['id']) ?>"
               data-confirm="Marca come fatto?">✓</a>
          <?php endif; ?>
          <a class="adm-btn adm-btn--small adm-btn--danger"
             href="?delete=<?= urlencode($r['id']) ?>&csrf=<?= aai_admin_csrf() ?>"
             data-confirm="Cancellare promemoria?">🗑</a>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>

<?php aai_admin_footer();
