<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

// Single-session export
if (!empty($_GET['session'])) {
    $sid = $_GET['session'];
    $path = aai_find_conv_path($sid);
    if (!$path) { http_response_code(404); exit('not found'); }
    $fmt = $_GET['format'] ?? 'json';
    $row = aai_read_json($path, []);
    if ($fmt === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="chat-' . $sid . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['timestamp','role','content']);
        foreach (($row['messages'] ?? []) as $m) {
            fputcsv($out, [$m['timestamp'] ?? '', $m['role'] ?? '', $m['content'] ?? '']);
        }
        fclose($out); exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="chat-' . $sid . '.json"');
    echo json_encode($row, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
}

// Bulk export
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!aai_admin_csrf_check($_POST['csrf'] ?? '')) { http_response_code(403); exit('csrf'); }

    $from = $_POST['from'] ?? '';
    $to = $_POST['to'] ?? '';
    $fStatus = $_POST['status'] ?? '';
    $fHasPhone = $_POST['has_phone'] ?? '';
    $fmt = $_POST['format'] ?? 'json';

    $index = aai_read_json(AAI_INDEX, []);
    $rows = [];
    foreach ($index as $sid => $r) {
        $started = $r['started_at'] ?? '';
        if ($from && $started < $from) continue;
        if ($to && $started > $to . 'T23:59:59Z') continue;
        if ($fStatus && ($r['status'] ?? '') !== $fStatus) continue;
        if ($fHasPhone === 'yes' && empty($r['phone'])) continue;
        if ($fHasPhone === 'no' && !empty($r['phone'])) continue;
        $path = AAI_DATA . '/' . ($r['path'] ?? '');
        $full = aai_read_json($path, null);
        if ($full) $rows[] = $full;
    }

    $stamp = date('Ymd-His');
    if ($fmt === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="andreaai-export-' . $stamp . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['session_id','started_at','phone','status','tags','page_url','msg_count','contacted_back','notes']);
        foreach ($rows as $r) {
            fputcsv($out, [
                $r['session_id'] ?? '', $r['started_at'] ?? '', $r['phone'] ?? '',
                $r['status'] ?? '', implode('|', $r['tags'] ?? []),
                $r['page_url'] ?? '', count($r['messages'] ?? []),
                !empty($r['contacted_back']) ? 'si' : 'no',
                str_replace(["\n","\r"], ' ', $r['notes'] ?? ''),
            ]);
        }
        fclose($out); exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="andreaai-export-' . $stamp . '.json"');
    echo json_encode(['exported_at' => date('c'), 'count' => count($rows), 'sessions' => $rows], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

aai_admin_header('Export', 'export');
?>
<h1 class="adm-title">Esportazione dati</h1>

<div class="adm-card">
  <p>Esporta conversazioni filtrate in JSON o CSV. Utile per backup o per rispondere a richieste GDPR di accesso (art. 15).</p>
  <form method="post">
    <input type="hidden" name="csrf" value="<?= aai_admin_csrf() ?>">
    <div class="adm-form-grid">
      <div class="adm-form-row">
        <label class="adm-label">Da</label>
        <input class="adm-input" type="date" name="from">
      </div>
      <div class="adm-form-row">
        <label class="adm-label">A</label>
        <input class="adm-input" type="date" name="to">
      </div>
    </div>
    <div class="adm-form-grid">
      <div class="adm-form-row">
        <label class="adm-label">Status</label>
        <select class="adm-select" name="status">
          <option value="">tutti</option>
          <?php foreach (['open','closed','converted','spam'] as $s): ?>
            <option value="<?= $s ?>"><?= $s ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="adm-form-row">
        <label class="adm-label">Telefono</label>
        <select class="adm-select" name="has_phone">
          <option value="">tutti</option>
          <option value="yes">solo con telefono</option>
          <option value="no">solo anonime</option>
        </select>
      </div>
    </div>
    <div class="adm-form-row">
      <label class="adm-label">Formato</label>
      <select class="adm-select" name="format">
        <option value="json">JSON (completo)</option>
        <option value="csv">CSV (sintetico)</option>
      </select>
    </div>
    <button class="adm-btn" type="submit">📥 Scarica export</button>
  </form>
</div>

<?php aai_admin_footer();
