<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

// POST: GDPR delete-by-phone
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_all') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $phone = $_POST['phone'] ?? '';
    if ($phone) {
        $contacts = aai_read_json(AAI_CONTACTS, []);
        $sessions = $contacts[$phone]['sessions'] ?? [];
        foreach ($sessions as $sid) {
            $p = aai_find_conv_path($sid);
            if ($p) @unlink($p);
            aai_atomic_update(AAI_INDEX, function ($cur) use ($sid) { unset($cur[$sid]); return $cur; });
        }
        aai_atomic_update(AAI_CONTACTS, function ($cur) use ($phone) { unset($cur[$phone]); return $cur; });
    }
    header('Location: contacts.php?gdpr_done=1'); exit;
}

// POST: update contact metadata
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update_contact') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }
    $phone = $_POST['phone'] ?? '';
    $notes = aai_clean_text($_POST['notes'] ?? '', 5000);
    $status = in_array($_POST['status'] ?? '', ['new','active','customer','dnc'], true) ? $_POST['status'] : 'new';
    $contactedBack = !empty($_POST['contacted_back']);
    aai_atomic_update(AAI_CONTACTS, function ($cur) use ($phone, $notes, $status, $contactedBack) {
        if (isset($cur[$phone])) {
            $cur[$phone]['notes'] = $notes;
            $cur[$phone]['status'] = $status;
            $cur[$phone]['contacted_back'] = $contactedBack;
            if ($contactedBack) $cur[$phone]['contacted_back_at'] = aai_now_iso();
        }
        return $cur;
    });
    header('Location: contacts.php?id=' . urlencode($phone) . '&saved=1'); exit;
}

$contacts = aai_read_json(AAI_CONTACTS, []);
$selected = $_GET['id'] ?? '';
$contact = $selected ? ($contacts[$selected] ?? null) : null;

aai_admin_header('Contatti', 'contacts');
?>
<h1 class="adm-title">Contatti (<?= count($contacts) ?>)</h1>

<?php if (!empty($_GET['gdpr_done'])): ?>
  <div class="adm-flash adm-flash--ok">✓ Tutti i dati associati al numero sono stati cancellati (GDPR art. 17).</div>
<?php endif; ?>

<?php if ($contact): ?>
  <a href="contacts.php" style="font-size:13px">← tutti i contatti</a>
  <h2 class="adm-h2">📇 <?= aai_h($selected) ?></h2>

  <?php if (!empty($_GET['saved'])): ?><div class="adm-flash adm-flash--ok">Salvato.</div><?php endif; ?>

  <?php
  $phoneClean = preg_replace('/[^\d]/', '', $selected);
  $waUrl = "https://wa.me/{$phoneClean}";
  ?>

  <div class="adm-actions">
    <a class="adm-btn adm-btn--success" target="_blank" href="<?= aai_h($waUrl) ?>">📲 WhatsApp</a>
    <a class="adm-btn adm-btn--ghost" href="tel:<?= aai_h($selected) ?>">📞 Chiama</a>
    <button class="adm-btn adm-btn--ghost" type="button" data-copy="<?= aai_h($selected) ?>">📋 Copia</button>
  </div>

  <div class="adm-side-grid">
    <div>
      <h2 class="adm-h2">Sessioni di questo contatto (<?= count($contact['sessions'] ?? []) ?>)</h2>
      <table class="adm-table">
        <thead><tr><th>Quando</th><th>Pagina</th><th>Status</th><th>Msg</th><th></th></tr></thead>
        <tbody>
        <?php
        $idx = aai_read_json(AAI_INDEX, []);
        foreach ($contact['sessions'] ?? [] as $sid):
            $r = $idx[$sid] ?? null;
            if (!$r) continue;
        ?>
          <tr>
            <td data-label="Quando"><?= aai_fmt_dt($r['started_at'] ?? null) ?></td>
            <td data-label="Pagina"><?= aai_h(parse_url($r['page_url'] ?? '/', PHP_URL_PATH) ?: '/') ?></td>
            <td data-label="Status"><?= aai_status_badge($r['status'] ?? 'open') ?></td>
            <td data-label="Messaggi"><?= (int)($r['msg_count'] ?? 0) ?></td>
            <td><a href="session.php?id=<?= urlencode($sid) ?>">apri</a></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <aside>
      <h2 class="adm-h2">Metadata contatto</h2>
      <div class="adm-card">
        <form method="post">
          <input type="hidden" name="action" value="update_contact">
          <input type="hidden" name="phone" value="<?= aai_h($selected) ?>">
          <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">

          <div class="adm-form-row">
            <label class="adm-label">Status contatto</label>
            <select class="adm-select" name="status">
              <?php foreach (['new'=>'Nuovo','active'=>'Attivo','customer'=>'Cliente','dnc'=>'Non contattare'] as $k=>$v): ?>
                <option value="<?= $k ?>" <?= ($contact['status'] ?? 'new') === $k ? 'selected' : '' ?>><?= $v ?></option>
              <?php endforeach; ?>
            </select>
          </div>

          <div class="adm-form-row">
            <label class="adm-label">Note</label>
            <textarea class="adm-textarea" name="notes"><?= aai_h($contact['notes'] ?? '') ?></textarea>
          </div>

          <div class="adm-form-row">
            <label style="display:flex;gap:8px;align-items:center">
              <input type="checkbox" name="contacted_back" value="1" <?= !empty($contact['contacted_back']) ? 'checked' : '' ?>>
              <span>Ricontattato</span>
            </label>
          </div>
          <button class="adm-btn" type="submit" style="width:100%">Salva</button>
        </form>
      </div>

      <div class="adm-card" style="font-size:13px;line-height:1.7">
        <div><strong>Primo contatto:</strong> <?= aai_fmt_dt($contact['first_seen'] ?? null) ?></div>
        <div><strong>Ultimo:</strong> <?= aai_fmt_dt($contact['last_seen'] ?? null) ?></div>
      </div>

      <h2 class="adm-h2" style="color:#991b1b">⚠️ GDPR</h2>
      <div class="adm-card" style="background:#fef2f2; border-color:#fecaca">
        <p style="margin-top:0;font-size:13px">
          Cancella in modo <strong>irreversibile</strong> tutte le conversazioni e l'entry contatto associate a questo numero. Da usare per richieste di diritto all'oblio (art. 17 GDPR).
        </p>
        <form method="post">
          <input type="hidden" name="action" value="delete_all">
          <input type="hidden" name="phone" value="<?= aai_h($selected) ?>">
          <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
          <button class="adm-btn adm-btn--danger" type="submit"
                  data-confirm="Sei SICURO? Cancello tutte le chat associate a <?= aai_h($selected) ?>. Operazione irreversibile.">
            🗑 Cancella tutto su questo numero
          </button>
        </form>
      </div>
    </aside>
  </div>
<?php else: ?>
  <?php if (!$contacts): ?>
    <div class="adm-empty">Nessun contatto raccolto ancora.</div>
  <?php else: ?>
    <table class="adm-table">
      <thead><tr><th>Telefono</th><th>Status</th><th>Sessioni</th><th>Primo contatto</th><th>Ultimo</th><th></th></tr></thead>
      <tbody>
      <?php
      uasort($contacts, fn($a,$b) => strcmp($b['last_seen'] ?? '', $a['last_seen'] ?? ''));
      foreach ($contacts as $phone => $c): ?>
        <tr>
          <td data-label="Telefono"><strong><?= aai_h($phone) ?></strong>
            <?= !empty($c['contacted_back']) ? ' <span class="adm-pill" style="background:#10b981">ricontattato</span>' : '' ?></td>
          <td data-label="Status"><?= aai_h($c['status'] ?? 'new') ?></td>
          <td data-label="Sessioni"><?= count($c['sessions'] ?? []) ?></td>
          <td data-label="Primo contatto"><?= aai_fmt_relative($c['first_seen'] ?? null) ?></td>
          <td data-label="Ultimo"><?= aai_fmt_relative($c['last_seen'] ?? null) ?></td>
          <td><a class="adm-btn adm-btn--small adm-btn--ghost" href="?id=<?= urlencode($phone) ?>">Apri</a></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
<?php endif; ?>

<?php aai_admin_footer();
