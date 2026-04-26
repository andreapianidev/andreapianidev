<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

$sid = $_GET['id'] ?? '';
if (!$sid) { http_response_code(400); echo 'Missing id'; exit; }
$path = aai_find_conv_path($sid);
if (!$path) { http_response_code(404); echo 'Not found'; exit; }

$flash = '';

// POST: update metadata
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }

    $newPhone = trim($_POST['phone'] ?? '');
    $normPhone = $newPhone ? aai_normalize_phone($newPhone) : null;
    $tags = array_values(array_filter(array_map('trim', explode(',', $_POST['tags'] ?? ''))));
    $status = in_array($_POST['status'] ?? '', ['open','closed','converted','spam'], true) ? $_POST['status'] : 'open';
    $notes = aai_clean_text($_POST['notes'] ?? '', 5000);
    $contactedBack = !empty($_POST['contacted_back']);

    aai_atomic_update($path, function ($cur) use ($normPhone, $tags, $status, $notes, $contactedBack) {
        if ($normPhone !== null && $normPhone !== ($cur['phone'] ?? null)) {
            $cur['phone'] = $normPhone;
            if (!$cur['phone_collected_at']) $cur['phone_collected_at'] = aai_now_iso();
        }
        $cur['tags'] = $tags;
        $cur['status'] = $status;
        $cur['notes'] = $notes;
        if ($contactedBack && !$cur['contacted_back']) {
            $cur['contacted_back'] = true;
            $cur['contacted_back_at'] = aai_now_iso();
        } elseif (!$contactedBack) {
            $cur['contacted_back'] = false;
            $cur['contacted_back_at'] = null;
        }
        return $cur;
    });

    aai_atomic_update(AAI_INDEX, function ($cur) use ($sid, $normPhone, $status) {
        if (isset($cur[$sid])) {
            if ($normPhone !== null) $cur[$sid]['phone'] = $normPhone;
            $cur[$sid]['status'] = $status;
        }
        return $cur;
    });

    header('Location: session.php?id=' . urlencode($sid) . '&saved=1'); exit;
}

// POST: delete one message
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_msg') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $mid = $_POST['message_id'] ?? '';
    aai_atomic_update($path, function ($cur) use ($mid) {
        $cur['messages'] = array_values(array_filter($cur['messages'] ?? [], fn($m) => ($m['id'] ?? '') !== $mid));
        return $cur;
    });
    header('Location: session.php?id=' . urlencode($sid) . '&msg_deleted=1'); exit;
}

// POST: delete entire conversation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_session') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $row = aai_read_json($path, []);
    $phone = $row['phone'] ?? null;
    @unlink($path);
    aai_atomic_update(AAI_INDEX, function ($cur) use ($sid) { unset($cur[$sid]); return $cur; });
    if ($phone) {
        aai_atomic_update(AAI_CONTACTS, function ($cur) use ($phone, $sid) {
            if (isset($cur[$phone]['sessions'])) {
                $cur[$phone]['sessions'] = array_values(array_filter($cur[$phone]['sessions'], fn($s) => $s !== $sid));
            }
            return $cur;
        });
    }
    header('Location: sessions.php?deleted=1'); exit;
}

$conv = aai_read_json($path, []);
$saved = !empty($_GET['saved']);
$msgDeleted = !empty($_GET['msg_deleted']);

aai_admin_header('Conversazione', 'sessions');
?>
<meta name="csrf" content="<?= aai_admin_csrf() ?>">

<a href="sessions.php" style="font-size:13px">← tutte le conversazioni</a>
<h1 class="adm-title">Conversazione <code style="font-size:14px"><?= aai_h(substr($sid, 0, 8)) ?></code></h1>

<?php if ($saved): ?><div class="adm-flash adm-flash--ok">✓ Modifiche salvate.</div><?php endif; ?>
<?php if ($msgDeleted): ?><div class="adm-flash adm-flash--ok">✓ Messaggio eliminato.</div><?php endif; ?>

<?php
$phoneClean = preg_replace('/[^\d]/', '', $conv['phone'] ?? '');
$waUrl = $phoneClean ? "https://wa.me/{$phoneClean}?text=" . rawurlencode("Ciao, sono Andrea Piani — riprendo dalla nostra chat sul sito.") : null;
?>

<div class="adm-actions">
  <?php if ($waUrl): ?>
    <a class="adm-btn adm-btn--success" target="_blank" href="<?= aai_h($waUrl) ?>">📲 Apri WhatsApp</a>
    <a class="adm-btn adm-btn--ghost" href="tel:<?= aai_h($conv['phone']) ?>">📞 Chiama</a>
    <button class="adm-btn adm-btn--ghost" type="button" data-copy="<?= aai_h($conv['phone']) ?>">📋 Copia numero</button>
  <?php endif; ?>
  <button class="adm-btn adm-btn--ghost" type="button"
          onclick="openReminderModal('<?= aai_h($sid) ?>', '<?= aai_h($conv['phone'] ?? '') ?>')">⏰ Promemoria</button>
  <a class="adm-btn adm-btn--ghost" href="export.php?session=<?= urlencode($sid) ?>&format=json">📥 Export JSON</a>
  <form method="post" style="display:inline">
    <input type="hidden" name="action" value="delete_session">
    <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
    <button class="adm-btn adm-btn--danger" type="submit"
            data-confirm="Cancellare DEFINITIVAMENTE questa conversazione?">🗑 Elimina chat</button>
  </form>
</div>

<div class="adm-side-grid">
  <div>
    <h2 class="adm-h2">💬 Messaggi (<?= count($conv['messages'] ?? []) ?>)</h2>
    <div class="adm-card">
      <?php if (empty($conv['messages'])): ?>
        <div style="color:#6b7280">Nessun messaggio ancora.</div>
      <?php else: ?>
        <div class="adm-msg-list">
        <?php foreach ($conv['messages'] as $m): ?>
          <div class="adm-msg adm-msg--<?= aai_h($m['role'] ?? 'assistant') ?>">
            <div><?= nl2br(aai_h($m['content'] ?? '')) ?></div>
            <div class="adm-msg-meta">
              <span><?= aai_h($m['role'] ?? '') ?> · <?= aai_fmt_dt($m['timestamp'] ?? null) ?></span>
              <form method="post" style="display:inline">
                <input type="hidden" name="action" value="delete_msg">
                <input type="hidden" name="message_id" value="<?= aai_h($m['id'] ?? '') ?>">
                <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
                <button class="adm-msg-del" type="submit" data-confirm="Cancellare questo singolo messaggio?">🗑 elimina</button>
              </form>
            </div>
          </div>
        <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <aside>
    <h2 class="adm-h2">⚙️ Metadata</h2>
    <div class="adm-card">
      <form method="post">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">

        <div class="adm-form-row">
          <label class="adm-label">Telefono</label>
          <input class="adm-input" name="phone" value="<?= aai_h($conv['phone'] ?? '') ?>" placeholder="+39…">
        </div>

        <div class="adm-form-row">
          <label class="adm-label">Status</label>
          <select class="adm-select" name="status">
            <?php foreach (['open','closed','converted','spam'] as $s): ?>
              <option value="<?= $s ?>" <?= ($conv['status'] ?? 'open') === $s ? 'selected' : '' ?>><?= $s ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="adm-form-row">
          <label class="adm-label">Tag (separati da virgola)</label>
          <input class="adm-input" name="tags" value="<?= aai_h(implode(', ', $conv['tags'] ?? [])) ?>" placeholder="lead caldo, ios">
        </div>

        <div class="adm-form-row">
          <label class="adm-label">Note</label>
          <textarea class="adm-textarea" name="notes" placeholder="Annotazioni private…"><?= aai_h($conv['notes'] ?? '') ?></textarea>
        </div>

        <div class="adm-form-row">
          <label style="display:flex; gap:8px; align-items:center">
            <input type="checkbox" name="contacted_back" value="1" <?= !empty($conv['contacted_back']) ? 'checked' : '' ?>>
            <span>Ricontattato</span>
            <?php if (!empty($conv['contacted_back_at'])): ?>
              <small style="color:#6b7280">(<?= aai_fmt_dt($conv['contacted_back_at']) ?>)</small>
            <?php endif; ?>
          </label>
        </div>

        <button class="adm-btn" type="submit" style="width:100%">Salva</button>
      </form>
    </div>

    <h2 class="adm-h2">🔍 Tecnico</h2>
    <div class="adm-card" style="font-size:13px; line-height:1.7">
      <div><strong>Iniziata:</strong> <?= aai_fmt_dt($conv['started_at'] ?? null) ?></div>
      <div><strong>Ultima att.:</strong> <?= aai_fmt_dt($conv['last_activity_at'] ?? null) ?></div>
      <div><strong>Pagina:</strong> <a href="<?= aai_h($conv['page_url'] ?? '#') ?>" target="_blank" rel="noopener">
          <?= aai_h(parse_url($conv['page_url'] ?? '/', PHP_URL_PATH) ?: '/') ?></a></div>
      <div><strong>Referrer:</strong> <?= aai_h($conv['referrer'] ?: '—') ?></div>
      <div><strong>Device:</strong> <?= aai_h($conv['device'] ?? '—') ?></div>
      <div><strong>UA:</strong> <small><?= aai_h($conv['user_agent'] ?? '') ?></small></div>
      <div><strong>IP hash:</strong> <small><?= aai_h(substr($conv['ip_hash'] ?? '', 0, 16)) ?>…</small></div>
      <?php if (!empty($conv['phone_trigger'])): ?>
        <div><strong>Trigger telefono:</strong> <?= aai_h($conv['phone_trigger']) ?> @ <?= aai_fmt_dt($conv['phone_collected_at'] ?? null) ?></div>
      <?php endif; ?>
    </div>
  </aside>
</div>

<?php aai_admin_footer();
