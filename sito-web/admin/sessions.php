<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

$index = aai_read_json(AAI_INDEX, []);

// Filters
$fStatus = $_GET['status'] ?? '';
$fHasPhone = $_GET['has_phone'] ?? '';
$fQuery = trim($_GET['q'] ?? '');
$fTag = trim($_GET['tag'] ?? '');

$rows = [];
foreach ($index as $sid => $r) {
    if ($fStatus && ($r['status'] ?? '') !== $fStatus) continue;
    if ($fHasPhone === 'yes' && empty($r['phone'])) continue;
    if ($fHasPhone === 'no' && !empty($r['phone'])) continue;
    if ($fQuery) {
        $hay = ($r['page_url'] ?? '') . ' ' . ($r['phone'] ?? '');
        if (stripos($hay, $fQuery) === false) {
            // expensive fallback: search inside conversation file
            $path = AAI_DATA . '/' . ($r['path'] ?? '');
            $body = is_file($path) ? file_get_contents($path) : '';
            if (stripos($body, $fQuery) === false) continue;
        }
    }
    if ($fTag) {
        $path = AAI_DATA . '/' . ($r['path'] ?? '');
        $row = aai_read_json($path, []);
        if (!in_array($fTag, $row['tags'] ?? [], true)) continue;
    }
    $rows[$sid] = $r;
}

uasort($rows, fn($a, $b) => strcmp($b['last_activity_at'] ?? '', $a['last_activity_at'] ?? ''));

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 50;
$total = count($rows);
$pages = max(1, (int)ceil($total / $perPage));
$slice = array_slice($rows, ($page - 1) * $perPage, $perPage, true);

aai_admin_header('Conversazioni', 'sessions');
?>
<h1 class="adm-title">Conversazioni (<?= $total ?>)</h1>

<form class="adm-filter-bar" method="get">
  <div>
    <label class="adm-label">Cerca</label>
    <input class="adm-input" name="q" value="<?= aai_h($fQuery) ?>" placeholder="testo, telefono, pagina">
  </div>
  <div>
    <label class="adm-label">Status</label>
    <select class="adm-select" name="status">
      <option value="">tutti</option>
      <?php foreach (['open','closed','converted','spam'] as $s): ?>
        <option value="<?= $s ?>" <?= $fStatus === $s ? 'selected' : '' ?>><?= $s ?></option>
      <?php endforeach; ?>
    </select>
  </div>
  <div>
    <label class="adm-label">Telefono</label>
    <select class="adm-select" name="has_phone">
      <option value="">tutti</option>
      <option value="yes" <?= $fHasPhone === 'yes' ? 'selected' : '' ?>>solo con telefono</option>
      <option value="no"  <?= $fHasPhone === 'no'  ? 'selected' : '' ?>>solo anonime</option>
    </select>
  </div>
  <div>
    <label class="adm-label">Tag</label>
    <input class="adm-input" name="tag" value="<?= aai_h($fTag) ?>" placeholder="lead caldo, ios…">
  </div>
  <div><button class="adm-btn">Filtra</button></div>
  <div><a class="adm-btn adm-btn--ghost" href="sessions.php">Reset</a></div>
</form>

<?php if (!$slice): ?>
  <div class="adm-empty">Nessuna conversazione corrisponde ai filtri.</div>
<?php else: ?>
  <table class="adm-table">
    <thead><tr>
      <th>Data</th><th>Pagina</th><th>Status</th><th>Telefono</th>
      <th>Device</th><th>Msg</th><th></th>
    </tr></thead>
    <tbody>
    <?php foreach ($slice as $sid => $r): ?>
      <tr>
        <td data-label="Data">
          <?= aai_fmt_dt($r['started_at'] ?? null) ?><br>
          <small style="color:#9ca3af"><?= aai_fmt_relative($r['last_activity_at'] ?? null) ?></small>
        </td>
        <td data-label="Pagina"><a href="<?= aai_h($r['page_url'] ?? '#') ?>" target="_blank" rel="noopener">
            <?= aai_h(parse_url($r['page_url'] ?? '/', PHP_URL_PATH) ?: '/') ?></a></td>
        <td data-label="Status"><?= aai_status_badge($r['status'] ?? 'open') ?></td>
        <td data-label="Telefono"><?= aai_h($r['phone'] ?? '—') ?></td>
        <td data-label="Device"><?= aai_h($r['device'] ?? '—') ?></td>
        <td data-label="Messaggi"><?= (int)($r['msg_count'] ?? 0) ?></td>
        <td><a class="adm-btn adm-btn--small adm-btn--ghost" href="session.php?id=<?= urlencode($sid) ?>">Apri</a></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>

  <?php if ($pages > 1): ?>
    <div class="adm-pager">
      <?php for ($i = 1; $i <= $pages; $i++): ?>
        <?php if ($i === $page): ?>
          <span class="is-current"><?= $i ?></span>
        <?php else:
          $q = $_GET; $q['page'] = $i; ?>
          <a href="?<?= http_build_query($q) ?>"><?= $i ?></a>
        <?php endif; ?>
      <?php endfor; ?>
    </div>
  <?php endif; ?>
<?php endif; ?>

<?php aai_admin_footer();
