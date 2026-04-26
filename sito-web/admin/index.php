<?php
require_once __DIR__ . '/lib/layout.php';
require_once __DIR__ . '/lib/daily-summary.php';
aai_admin_require();

$today = gmdate('Y-m-d');
$yesterday = gmdate('Y-m-d', strtotime('-1 day'));
$daily = aai_read_json(AAI_STATS . "/daily/{$today}.json", []);
$yest  = aai_read_json(AAI_STATS . "/daily/{$yesterday}.json", []);
$index = aai_read_json(AAI_INDEX, []);
$reminders = aai_read_json(AAI_REMIND, []);

// Sort sessions by last_activity desc
uasort($index, fn($a, $b) => strcmp($b['last_activity_at'] ?? '', $a['last_activity_at'] ?? ''));
$recent = array_slice($index, 0, 10, true);

// Reminders due today (or overdue)
$now = time();
$todayCutoff = strtotime('tomorrow');
$dueToday = array_filter($reminders, fn($r) => empty($r['done'])
    && !empty($r['due_at']) && strtotime($r['due_at']) <= $todayCutoff);
usort($dueToday, fn($a,$b) => strcmp($a['due_at'], $b['due_at']));

// 7-day visit trend
$trend = [];
for ($i = 6; $i >= 0; $i--) {
    $d = gmdate('Y-m-d', strtotime("-$i days"));
    $r = aai_read_json(AAI_STATS . "/daily/{$d}.json", []);
    $trend[] = [
        'date'  => $d,
        'views' => (int)($r['page_views']['total'] ?? 0),
        'chats' => (int)($r['chat_start'] ?? 0),
        'wa'    => (int)($r['whatsapp_click'] ?? 0),
    ];
}

// One-time backfill of today's traffic sources + hourly from events.jsonl if missing
$needsSources = !isset($daily['sources']);
$needsHourly  = !isset($daily['hourly']) || (is_array($daily['hourly']) && count($daily['hourly']) !== 24);
if (($needsSources || $needsHourly) && file_exists(AAI_EVENTS)) {
    $sources = []; $hosts = []; $hourly = array_fill(0, 24, 0);
    $f = @fopen(AAI_EVENTS, 'r');
    if ($f) {
        $needle = '"ts":"' . $today;
        while (($line = fgets($f)) !== false) {
            if (strpos($line, $needle) === false) continue;
            $e = json_decode($line, true);
            if (!is_array($e) || ($e['type'] ?? '') !== 'page_view') continue;
            $ref = (string)($e['extra']['referrer'] ?? '');
            $cls = aai_classify_referrer($ref);
            $sources[$cls['source']] = ($sources[$cls['source']] ?? 0) + 1;
            if ($cls['host'] !== '' && $cls['source'] !== 'direct') {
                $hosts[$cls['host']] = ($hosts[$cls['host']] ?? 0) + 1;
            }
            $hr = (int)substr($e['ts'] ?? '', 11, 2);
            if ($hr >= 0 && $hr < 24) $hourly[$hr]++;
        }
        fclose($f);
    }
    if ($sources || array_sum($hourly) > 0) {
        aai_atomic_update(AAI_STATS . "/daily/{$today}.json", function ($cur) use ($sources, $hosts, $hourly, $needsSources, $needsHourly) {
            if ($needsSources && $sources) { $cur['sources'] = $sources; $cur['referrer_hosts'] = $hosts; }
            if ($needsHourly  && array_sum($hourly) > 0) { $cur['hourly'] = $hourly; }
            return $cur;
        }, []);
        if ($needsSources) { $daily['sources'] = $sources; $daily['referrer_hosts'] = $hosts; }
        if ($needsHourly)  { $daily['hourly']  = $hourly; }
    }
}

// Top pages today
$topPages = $daily['page_views']['by_page'] ?? [];
arsort($topPages);
$topPages = array_slice($topPages, 0, 8, true);

// Sources today (sorted desc)
$sources = $daily['sources'] ?? [];
arsort($sources);

// Browser / OS / lang / screen breakdowns
$browsers = $daily['browser'] ?? []; arsort($browsers);
$oses     = $daily['os']      ?? []; arsort($oses);
$langs    = $daily['lang']    ?? []; arsort($langs);
$screens  = $daily['screen']  ?? []; arsort($screens);

// Hourly today (24 buckets)
$hourly = $daily['hourly'] ?? array_fill(0, 24, 0);
$maxHourly = max($hourly) ?: 1;
$peakHour = array_search($maxHourly, $hourly);
if ($peakHour === false || $maxHourly <= 0) $peakHour = null;

// Device split
$devMobile  = (int)($daily['device']['mobile']  ?? 0);
$devDesktop = (int)($daily['device']['desktop'] ?? 0);
$devTotal   = $devMobile + $devDesktop;
$mobilePct  = $devTotal > 0 ? round($devMobile * 100 / $devTotal) : 0;

// KPI today + delta vs yesterday
$kpiToday = [
    'views'  => (int)($daily['page_views']['total'] ?? 0),
    'open'   => (int)($daily['chat_open'] ?? 0),
    'start'  => (int)($daily['chat_start'] ?? 0),
    'phone'  => (int)($daily['phone_submitted'] ?? 0),
    'wa'     => (int)($daily['whatsapp_click'] ?? 0),
];
$kpiYest = [
    'views'  => (int)($yest['page_views']['total'] ?? 0),
    'open'   => (int)($yest['chat_open'] ?? 0),
    'start'  => (int)($yest['chat_start'] ?? 0),
    'phone'  => (int)($yest['phone_submitted'] ?? 0),
    'wa'     => (int)($yest['whatsapp_click'] ?? 0),
];

function aai_delta_html(int $cur, int $prev): string {
    if ($prev === 0 && $cur === 0) return '<span class="adm-delta adm-delta--flat">— vs ieri</span>';
    if ($prev === 0) return '<span class="adm-delta adm-delta--up">▲ nuovo</span>';
    $d = ($cur - $prev) * 100 / $prev;
    if ($d > 0)  return '<span class="adm-delta adm-delta--up">▲ ' . round($d) . '% vs ieri</span>';
    if ($d < 0)  return '<span class="adm-delta adm-delta--down">▼ ' . abs(round($d)) . '% vs ieri</span>';
    return '<span class="adm-delta adm-delta--flat">— invariato</span>';
}

// Sessions by status (across all index)
$statusCounts = ['open' => 0, 'closed' => 0, 'converted' => 0, 'spam' => 0];
foreach ($index as $r) {
    $s = $r['status'] ?? 'open';
    if (!isset($statusCounts[$s])) $statusCounts[$s] = 0;
    $statusCounts[$s]++;
}
$totalSessions = array_sum($statusCounts);

// Hot pages: pages that generated chat (msg_count > 0) — across all sessions
$pageHeat = [];
foreach ($index as $r) {
    $path = parse_url($r['page_url'] ?? '/', PHP_URL_PATH) ?: '/';
    if (!isset($pageHeat[$path])) $pageHeat[$path] = ['sessions' => 0, 'chats' => 0, 'phones' => 0];
    $pageHeat[$path]['sessions']++;
    if (($r['msg_count'] ?? 0) > 0) $pageHeat[$path]['chats']++;
    if (!empty($r['phone'])) $pageHeat[$path]['phones']++;
}
uasort($pageHeat, fn($a, $b) => ($b['chats'] * 100 + $b['phones']) - ($a['chats'] * 100 + $a['phones']));
$hotPages = array_slice(array_filter($pageHeat, fn($p) => $p['sessions'] > 0), 0, 6, true);

// Live activity feed: tail last 20 events from events.jsonl
function aai_tail_events(int $n = 20): array {
    if (!file_exists(AAI_EVENTS)) return [];
    $size = filesize(AAI_EVENTS);
    if ($size === 0) return [];
    $f = fopen(AAI_EVENTS, 'r');
    if (!$f) return [];
    $chunk = 8192;
    $buf = '';
    $pos = $size;
    while ($pos > 0 && substr_count($buf, "\n") < $n + 2) {
        $read = min($chunk, $pos);
        $pos -= $read;
        fseek($f, $pos);
        $buf = fread($f, $read) . $buf;
    }
    fclose($f);
    $lines = array_values(array_filter(explode("\n", $buf), fn($l) => trim($l) !== ''));
    $lines = array_slice($lines, -$n);
    $out = [];
    foreach ($lines as $line) {
        $e = json_decode($line, true);
        if (is_array($e)) $out[] = $e;
    }
    return array_reverse($out);
}
$activity = aai_tail_events(15);

$eventMeta = [
    'page_view'        => ['👁',  'Visita pagina',     '#6366f1'],
    'chat_open'        => ['💬',  'Widget aperto',     '#a78bfa'],
    'consent_accept'   => ['✓',   'Consenso privacy',  '#10b981'],
    'chat_start'       => ['🚀',  'Chat avviata',      '#10b981'],
    'phone_form_shown' => ['📋',  'Form telefono',     '#f59e0b'],
    'phone_submitted'  => ['⭐',  'TELEFONO LASCIATO', '#f59e0b'],
    'phone_dismissed'  => ['✗',   'Form chiuso',       '#6b7280'],
    'whatsapp_click'   => ['📲',  'Click WhatsApp',    '#ef4444'],
    'chat_reset'       => ['↻',   'Chat resettata',    '#6b7280'],
    'chat_close'       => ['×',   'Widget chiuso',     '#6b7280'],
];

// Mini funnel today
$funnelToday = [
    ['Visite',         $kpiToday['views']],
    ['Chat aperte',    $kpiToday['open']],
    ['Chat avviate',   $kpiToday['start']],
    ['Telefoni',       $kpiToday['phone']],
];
$funnelMax = max(1, $kpiToday['views']);

// Daily AI summary — load best available (today, else most recent stale)
$summaryToday = gmdate('Y-m-d');
$summaryBundle = aai_summary_load_best($summaryToday);
$summaryError = aai_summary_load_error();
$summaryShouldAuto = aai_summary_should_auto_generate($summaryToday);
$summaryCsrf = aai_admin_csrf();
$summaryFlashOk  = !empty($_GET['summary_ok']);
$summaryFlashErr = isset($_GET['summary_err']) ? (string)$_GET['summary_err'] : '';

aai_admin_header('Dashboard', 'index');
?>
<h1 class="adm-title">
  <span class="adm-glitch" data-text="Dashboard">Dashboard</span>
  <span class="adm-title-sub">// oggi <?= aai_h(date('d/m/Y')) ?> · <?= aai_h(date('H:i')) ?> <span class="adm-blink">▮</span></span>
</h1>

<?php
$sumPayload = $summaryBundle['payload'];
$sumStale   = $summaryBundle['is_stale'];
$sumDate    = $summaryBundle['used_date'];
$showErrorPopup = is_array($summaryError) && empty($summaryError['acknowledged']);
?>
<?php if ($summaryFlashErr): ?>
  <div class="adm-aisum-flash adm-aisum-flash--err">
    ⚠ Errore generazione riassunto AI: <?= aai_h($summaryFlashErr) ?>
    <a href="index.php" class="adm-aisum-flash-close" aria-label="Chiudi">×</a>
  </div>
<?php elseif ($summaryFlashOk): ?>
  <div class="adm-aisum-flash adm-aisum-flash--ok">
    ✓ Riassunto AI rigenerato.
    <a href="index.php" class="adm-aisum-flash-close" aria-label="Chiudi">×</a>
  </div>
<?php endif; ?>
<section class="adm-aisum<?= $sumPayload ? '' : ' adm-aisum--empty' ?><?= $sumStale ? ' adm-aisum--stale' : '' ?>"
         data-aisum-csrf="<?= aai_h($summaryCsrf) ?>"
         data-aisum-show-error="<?= $showErrorPopup ? '1' : '0' ?>"
         <?php if ($showErrorPopup): ?>data-aisum-error="<?= aai_h($summaryError['error'] ?? '') ?>"<?php endif; ?>>
  <div class="adm-aisum-head">
    <span class="adm-aisum-badge" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z"/></svg>
      <span>AI</span>
    </span>
    <h2 class="adm-aisum-headline">
      <?php if ($sumPayload): ?>
        <?= aai_h($sumPayload['summary']['headline'] ?? '') ?>
      <?php else: ?>
        Nessun riassunto disponibile
      <?php endif; ?>
    </h2>
    <form method="post" action="api/refresh-summary.php" class="adm-aisum-refresh-form"
          onsubmit="return confirm('Generare nuovo riassunto AI? Costa 1 chiamata API DeepSeek.');">
      <input type="hidden" name="csrf" value="<?= aai_h($summaryCsrf) ?>">
      <button type="submit" class="adm-aisum-refresh" title="Rigenera riassunto AI" aria-label="Rigenera riassunto">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
      </button>
    </form>
  </div>

  <?php if ($sumPayload): ?>
    <div class="adm-aisum-body">
      <div class="adm-aisum-section">
        <div class="adm-aisum-label">▸ Operativo</div>
        <p class="adm-aisum-text"><?= aai_h($sumPayload['summary']['operativo'] ?? '') ?></p>
      </div>
      <div class="adm-aisum-section">
        <div class="adm-aisum-label">▸ Trend</div>
        <p class="adm-aisum-text"><?= aai_h($sumPayload['summary']['trend'] ?? '') ?></p>
      </div>
      <div class="adm-aisum-section">
        <div class="adm-aisum-label">▸ Azioni consigliate</div>
        <ul class="adm-aisum-actions">
          <?php foreach (($sumPayload['summary']['azioni'] ?? []) as $az): ?>
            <li><?= aai_h((string)$az) ?></li>
          <?php endforeach; ?>
        </ul>
      </div>
    </div>
    <div class="adm-aisum-foot">
      <span>Generato <?= aai_h(date('d/m H:i', strtotime($sumPayload['generated_at'] ?? 'now'))) ?></span>
      <span>·</span>
      <span><?= aai_h($sumPayload['model'] ?? 'deepseek') ?></span>
      <span>·</span>
      <span><?= aai_h(aai_fmt_relative($sumPayload['generated_at'] ?? null)) ?></span>
      <?php if ($sumStale && $sumDate): ?>
        <span class="adm-aisum-stale-tag">⚠ riassunto del <?= aai_h(date('d/m', strtotime($sumDate))) ?></span>
      <?php endif; ?>
    </div>
  <?php else: ?>
    <div class="adm-aisum-empty-body">
      <p>Il riassunto AI di oggi non è ancora stato generato.</p>
      <form method="post" action="api/refresh-summary.php"
            onsubmit="return confirm('Generare riassunto AI? Costa 1 chiamata API DeepSeek.');">
        <input type="hidden" name="csrf" value="<?= aai_h($summaryCsrf) ?>">
        <button type="submit" class="adm-btn adm-btn--primary">✨ Genera ora</button>
      </form>
    </div>
  <?php endif; ?>
</section>

<div class="adm-kpi-grid">
<?php $fmt = fn($n) => number_format((int)$n, 0, ',', '.'); ?>
  <div class="adm-kpi" style="--kpi-color:#6366f1">
    <div class="adm-kpi-label">▸ Visite oggi</div>
    <div class="adm-kpi-value" data-counter="<?= $kpiToday['views'] ?>"><?= $fmt($kpiToday['views']) ?></div>
    <div class="adm-kpi-sub"><?= aai_delta_html($kpiToday['views'], $kpiYest['views']) ?></div>
  </div>
  <div class="adm-kpi" style="--kpi-color:#a78bfa">
    <div class="adm-kpi-label">▸ Chat aperte</div>
    <div class="adm-kpi-value" data-counter="<?= $kpiToday['open'] ?>"><?= $fmt($kpiToday['open']) ?></div>
    <div class="adm-kpi-sub"><?= aai_delta_html($kpiToday['open'], $kpiYest['open']) ?></div>
  </div>
  <div class="adm-kpi" style="--kpi-color:#10b981">
    <div class="adm-kpi-label">▸ Chat avviate</div>
    <div class="adm-kpi-value" data-counter="<?= $kpiToday['start'] ?>"><?= $fmt($kpiToday['start']) ?></div>
    <div class="adm-kpi-sub"><?= aai_delta_html($kpiToday['start'], $kpiYest['start']) ?></div>
  </div>
  <div class="adm-kpi" style="--kpi-color:#f59e0b">
    <div class="adm-kpi-label">▸ Telefoni</div>
    <div class="adm-kpi-value" data-counter="<?= $kpiToday['phone'] ?>"><?= $fmt($kpiToday['phone']) ?></div>
    <div class="adm-kpi-sub"><?= aai_delta_html($kpiToday['phone'], $kpiYest['phone']) ?></div>
  </div>
  <div class="adm-kpi" style="--kpi-color:#ef4444">
    <div class="adm-kpi-label">▸ Click WhatsApp</div>
    <div class="adm-kpi-value" data-counter="<?= $kpiToday['wa'] ?>"><?= $fmt($kpiToday['wa']) ?></div>
    <div class="adm-kpi-sub"><?= aai_delta_html($kpiToday['wa'], $kpiYest['wa']) ?></div>
  </div>
</div>

<h2 class="adm-h2">▸ Trend ultimi 7 giorni <span class="adm-h2-tag">live</span></h2>
<div class="adm-card adm-card--neon">
  <canvas id="trendChart" height="280"></canvas>
  <div id="trendChartFallback" style="display:none; padding:24px; color:#6b7280; font-family:var(--mono); font-size:13px; text-align:center;">
    ⚠ Grafico non disponibile (Chart.js non caricato — verifica adblock o connessione).
    <br><br>
    <strong style="color:var(--c-cyan)">Dati 7 giorni:</strong>
    <?php foreach ($trend as $t): ?>
      <div style="display:inline-block; margin:6px 10px; min-width:80px;">
        <code><?= aai_h(substr($t['date'], 5)) ?></code>:
        <strong style="color:#6366f1"><?= $t['views'] ?></strong> visite
      </div>
    <?php endforeach; ?>
  </div>
</div>

<?php $hourlySum = array_sum($hourly); $hasHourlyData = $hourlySum > 0; ?>
<h2 class="adm-h2">▸ Attività oraria oggi <?php if ($peakHour !== null): ?><span class="adm-h2-tag">picco h<?= sprintf('%02d', $peakHour) ?></span><?php endif; ?></h2>
<div class="adm-card adm-card--neon">
  <?php if (!$hasHourlyData && $kpiToday['views'] > 0): ?>
    <div style="padding:24px; color:#6b7280; font-family:var(--mono); font-size:13px; text-align:center;">
      ⓘ Distribuzione oraria non ancora disponibile per le <?= $kpiToday['views'] ?> visite di oggi.
      <br>
      <span style="color:#4b5563">I prossimi page_view popoleranno questa fascia in tempo reale.</span>
    </div>
  <?php elseif (!$hasHourlyData): ?>
    <div style="padding:24px; color:#6b7280; font-family:var(--mono); font-size:13px; text-align:center;">
      Nessuna visita registrata oggi.
    </div>
  <?php else: ?>
    <div class="adm-hourly">
      <?php foreach ($hourly as $h => $cnt):
        $pct = round($cnt * 100 / $maxHourly);
        $isPeak = $h === $peakHour && $cnt > 0;
        $isCurrent = (int)gmdate('H') === $h;
      ?>
        <div class="adm-hour-col<?= $isPeak ? ' is-peak' : '' ?><?= $isCurrent ? ' is-current' : '' ?>" title="<?= sprintf('%02d:00', $h) ?> UTC · <?= $cnt ?> visite">
          <div class="adm-hour-bar-wrap">
            <div class="adm-hour-bar" style="height:<?= max($cnt > 0 ? 4 : 0, $pct) ?>%"></div>
          </div>
          <div class="adm-hour-label"><?= sprintf('%02d', $h) ?></div>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="adm-hour-legend">
      <span>0 visite</span>
      <span class="adm-hour-spacer">orario UTC ·  <strong><?= $hourlySum ?></strong> visite totali oggi</span>
      <span><?= $maxHourly ?> visite</span>
    </div>
  <?php endif; ?>
</div>

<div class="adm-grid-2">

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">🚦 Funnel oggi</h3>
    <div class="adm-funnel">
      <?php foreach ($funnelToday as [$label, $value]):
        $w = round($value * 100 / $funnelMax);
        $pct = $funnelMax > 0 ? round($value * 100 / $funnelMax) : 0;
      ?>
        <div class="adm-funnel-row">
          <div class="adm-funnel-label"><?= aai_h($label) ?></div>
          <div class="adm-funnel-bar-wrap"><div class="adm-funnel-bar" style="width:<?= max($w, 1) ?>%"></div></div>
          <div class="adm-funnel-value">
            <strong><?= $value ?></strong>
            <span class="adm-funnel-pct"><?= $pct ?>%</span>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">📊 Sessioni per status <span class="adm-card-subhead">tutto storico</span></h3>
    <?php if (!$totalSessions): ?>
      <div class="adm-empty adm-empty--inline">Nessuna sessione registrata.</div>
    <?php else:
      $statusMeta = [
        'open'      => ['Aperte',     '#3b82f6', '🔵'],
        'closed'    => ['Chiuse',     '#6b7280', '⚪'],
        'converted' => ['Convertite', '#10b981', '🟢'],
        'spam'      => ['Spam',       '#ef4444', '🔴'],
      ];
    ?>
      <div class="adm-source-list">
        <?php foreach ($statusCounts as $st => $cnt):
          if ($cnt === 0) continue;
          [$label, $color, $icon] = $statusMeta[$st] ?? [$st, '#6b7280', '•'];
          $pct = round($cnt * 100 / $totalSessions);
        ?>
          <div class="adm-source-row">
            <div class="adm-source-head">
              <span class="adm-source-icon"><?= $icon ?></span>
              <span class="adm-source-label"><?= aai_h($label) ?></span>
              <span class="adm-source-count"><?= $cnt ?></span>
              <span class="adm-source-pct"><?= $pct ?>%</span>
            </div>
            <div class="adm-bar">
              <div class="adm-bar-fill" style="width:<?= $pct ?>%; background:<?= aai_h($color) ?>"></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
      <div class="adm-host-detail">
        <div class="adm-mini-label">Totale sessioni</div>
        <div style="font-size:24px; font-weight:600; color:var(--text); font-variant-numeric:tabular-nums;"><?= $totalSessions ?></div>
      </div>
    <?php endif; ?>
  </div>

</div>

<div class="adm-grid-3">

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">🌐 Sorgenti oggi</h3>
    <?php if (!$sources): ?>
      <div class="adm-empty adm-empty--inline">Nessuna sorgente registrata oggi.</div>
    <?php else: ?>
      <?php $maxSrc = max($sources) ?: 1; ?>
      <div class="adm-source-list">
        <?php foreach ($sources as $src => $cnt):
          [$srcLabel, $srcIcon, $srcColor] = aai_source_meta($src);
          $pct  = round($cnt * 100 / max($kpiToday['views'], 1));
          $w    = round($cnt * 100 / $maxSrc);
        ?>
          <div class="adm-source-row">
            <div class="adm-source-head">
              <span class="adm-source-icon"><?= $srcIcon ?></span>
              <span class="adm-source-label"><?= aai_h($srcLabel) ?></span>
              <span class="adm-source-count"><?= $cnt ?></span>
              <span class="adm-source-pct"><?= $pct ?>%</span>
            </div>
            <div class="adm-bar">
              <div class="adm-bar-fill" style="width:<?= $w ?>%; background:<?= aai_h($srcColor) ?>"></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
      <?php if (!empty($daily['referrer_hosts'])):
        $hostsList = $daily['referrer_hosts']; arsort($hostsList);
        $hostsList = array_slice($hostsList, 0, 5, true); ?>
        <div class="adm-host-detail">
          <div class="adm-mini-label">Top host esterni</div>
          <?php foreach ($hostsList as $host => $hc): ?>
            <div class="adm-host-row"><code><?= aai_h($host) ?></code><span><?= $hc ?></span></div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    <?php endif; ?>
  </div>

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">📄 Top pagine oggi</h3>
    <?php if (!$topPages): ?>
      <div class="adm-empty adm-empty--inline">Nessuna visita ancora oggi.</div>
    <?php else: ?>
      <?php $maxPage = max($topPages) ?: 1; ?>
      <div class="adm-source-list">
        <?php foreach ($topPages as $page => $cnt):
          $w = round($cnt * 100 / $maxPage);
          $shown = $page === '' ? '/' : $page;
          $shown = strlen($shown) > 32 ? substr($shown, 0, 30) . '…' : $shown;
        ?>
          <div class="adm-source-row">
            <div class="adm-source-head">
              <span class="adm-source-label"><code><?= aai_h($shown) ?></code></span>
              <span class="adm-source-count"><?= $cnt ?></span>
            </div>
            <div class="adm-bar">
              <div class="adm-bar-fill" style="width:<?= $w ?>%; background:linear-gradient(90deg,#6366f1,#a78bfa)"></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">📱 Device oggi</h3>
    <?php if (!$devTotal): ?>
      <div class="adm-empty adm-empty--inline">Nessun dispositivo rilevato oggi.</div>
    <?php else: ?>
      <div class="adm-device-stack">
        <div class="adm-device-row">
          <div class="adm-device-head">
            <span>📱 Mobile</span>
            <strong><?= $devMobile ?></strong>
            <span class="adm-source-pct"><?= $mobilePct ?>%</span>
          </div>
          <div class="adm-bar">
            <div class="adm-bar-fill" style="width:<?= $mobilePct ?>%; background:linear-gradient(90deg,#ef4444,#a78bfa)"></div>
          </div>
        </div>
        <div class="adm-device-row">
          <div class="adm-device-head">
            <span>💻 Desktop</span>
            <strong><?= $devDesktop ?></strong>
            <span class="adm-source-pct"><?= 100 - $mobilePct ?>%</span>
          </div>
          <div class="adm-bar">
            <div class="adm-bar-fill" style="width:<?= 100 - $mobilePct ?>%; background:linear-gradient(90deg,#6366f1,#10b981)"></div>
          </div>
        </div>
      </div>
      <div class="adm-device-donut">
        <svg viewBox="0 0 120 120" width="140" height="140" style="margin-top:14px">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#1f2937" stroke-width="14"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#donutGrad)" stroke-width="14"
                  stroke-dasharray="<?= round($mobilePct * 326.7 / 100, 1) ?> 326.7"
                  stroke-dashoffset="0" transform="rotate(-90 60 60)" stroke-linecap="round"
                  class="adm-donut-arc"/>
          <defs><linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#a78bfa"/>
          </linearGradient></defs>
          <text x="60" y="58" text-anchor="middle" fill="#d1d9e0" font-size="22" font-weight="700"><?= $mobilePct ?>%</text>
          <text x="60" y="76" text-anchor="middle" fill="#6b7280" font-size="10" letter-spacing="2">MOBILE</text>
        </svg>
      </div>
    <?php endif; ?>
  </div>

</div>

<?php
// Helper to render a generic ranked list card (browser / os / lang / screen)
function aai_render_breakdown(string $title, array $items, int $totalViews, callable $metaFn): void {
    ?>
  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title"><?= $title ?></h3>
    <?php if (!$items): ?>
      <div class="adm-empty adm-empty--inline">Nessun dato oggi.</div>
    <?php else:
      $maxV = max($items) ?: 1; ?>
      <div class="adm-source-list">
        <?php foreach ($items as $slug => $cnt):
          $meta = $metaFn((string)$slug);
          $label = $meta[0] ?? (string)$slug;
          $icon  = $meta[1] ?? '•';
          $color = $meta[2] ?? '#8b5cf6';
          $pct  = round($cnt * 100 / max($totalViews, 1));
          $w    = round($cnt * 100 / $maxV);
        ?>
          <div class="adm-source-row">
            <div class="adm-source-head">
              <span class="adm-source-icon"><?= $icon ?></span>
              <span class="adm-source-label"><?= aai_h($label) ?></span>
              <span class="adm-source-count"><?= $cnt ?></span>
              <span class="adm-source-pct"><?= $pct ?>%</span>
            </div>
            <div class="adm-bar">
              <div class="adm-bar-fill" style="width:<?= $w ?>%; background:<?= aai_h($color) ?>"></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
    <?php
}
?>

<h2 class="adm-h2">▸ Visitatori oggi <span class="adm-h2-tag">browser · OS · lingua · risoluzione</span></h2>
<div class="adm-grid-2">
  <?php aai_render_breakdown('🌐 Browser oggi',         $browsers, $kpiToday['views'], 'aai_browser_meta'); ?>
  <?php aai_render_breakdown('💻 Sistema operativo',     $oses,     $kpiToday['views'], 'aai_os_meta'); ?>
</div>
<div class="adm-grid-2">
  <?php aai_render_breakdown('🗣️ Lingua browser',        $langs,    $kpiToday['views'], 'aai_lang_meta'); ?>
  <?php aai_render_breakdown('📐 Risoluzione schermo',   $screens,  $kpiToday['views'], 'aai_screen_meta'); ?>
</div>

<div class="adm-grid-2">

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">🔥 Pagine che generano chat <span class="adm-card-subhead">tutto storico</span></h3>
    <?php if (!$hotPages || array_sum(array_column($hotPages, 'chats')) === 0): ?>
      <div class="adm-empty adm-empty--inline">Nessuna chat ancora avviata da una pagina.</div>
    <?php else: ?>
      <table class="adm-table" style="margin:0">
        <thead><tr><th>Pagina</th><th style="text-align:right">Sessioni</th><th style="text-align:right">Chat</th><th style="text-align:right">Tel</th><th style="text-align:right">Conv.%</th></tr></thead>
        <tbody>
        <?php foreach ($hotPages as $path => $stats):
          if ($stats['sessions'] === 0) continue;
          $convRate = round($stats['chats'] * 100 / $stats['sessions']);
          $shown = strlen($path) > 28 ? substr($path, 0, 26) . '…' : $path;
        ?>
          <tr>
            <td data-label="Pagina"><code><?= aai_h($shown) ?></code></td>
            <td data-label="Sessioni" style="text-align:right"><?= $stats['sessions'] ?></td>
            <td data-label="Chat" style="text-align:right"><strong style="color:var(--c-violet)"><?= $stats['chats'] ?></strong></td>
            <td data-label="Tel" style="text-align:right"><?= $stats['phones'] > 0 ? '<strong style="color:var(--c-amber)">' . $stats['phones'] . '</strong>' : '—' ?></td>
            <td data-label="Conv.%" style="text-align:right"><span class="adm-source-pct"><?= $convRate ?>%</span></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>

  <div class="adm-card adm-card--neon">
    <h3 class="adm-card-title">⚡ Live activity feed <span class="adm-card-subhead">ultimi 15 eventi</span></h3>
    <?php if (!$activity): ?>
      <div class="adm-empty adm-empty--inline">Nessuna attività registrata.</div>
    <?php else: ?>
      <div class="adm-activity">
        <?php foreach ($activity as $e):
          $type = $e['type'] ?? 'page_view';
          $meta = $eventMeta[$type] ?? ['•', $type, '#6b7280'];
          [$icon, $label, $color] = $meta;
          $page = parse_url($e['page'] ?? '/', PHP_URL_PATH) ?: '/';
          if (strlen($page) > 24) $page = substr($page, 0, 22) . '…';
          $rel = aai_fmt_relative($e['ts'] ?? null);
          $dev = $e['device'] ?? '';
        ?>
          <div class="adm-activity-row" style="--evt-color:<?= aai_h($color) ?>">
            <div class="adm-activity-icon"><?= $icon ?></div>
            <div class="adm-activity-body">
              <div class="adm-activity-label"><?= aai_h($label) ?></div>
              <div class="adm-activity-meta">
                <code><?= aai_h($page) ?></code>
                <?php if ($dev === 'mobile'): ?><span class="adm-activity-tag">📱</span><?php elseif ($dev === 'desktop'): ?><span class="adm-activity-tag">💻</span><?php endif; ?>
              </div>
            </div>
            <div class="adm-activity-time"><?= aai_h($rel) ?></div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

</div>

<h2 class="adm-h2">▸ Da ricontattare oggi <span class="adm-h2-tag adm-h2-tag--alert"><?= count($dueToday) ?></span></h2>
<?php if (!$dueToday): ?>
  <div class="adm-empty">Nessun promemoria in scadenza. Tutto in ordine.</div>
<?php else: ?>
  <table class="adm-table">
    <thead><tr><th>Scadenza</th><th>Telefono</th><th>Nota</th><th>Sessione</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($dueToday as $r): ?>
      <tr>
        <td data-label="Scadenza"><?= aai_fmt_dt($r['due_at']) ?>
          <?= strtotime($r['due_at']) < time() ? '<span class="adm-pill" style="background:#ef4444">scaduto</span>' : '' ?>
        </td>
        <td data-label="Telefono"><?= aai_h($r['phone'] ?? '—') ?></td>
        <td data-label="Nota"><?= aai_h($r['note'] ?? '') ?></td>
        <td data-label="Sessione">
          <?php if (!empty($r['session_id'])): ?>
            <a href="session.php?id=<?= urlencode($r['session_id']) ?>">apri chat</a>
          <?php else: ?>—<?php endif; ?>
        </td>
        <td>
          <?php if (!empty($r['phone'])): ?>
            <a class="adm-btn adm-btn--success adm-btn--small" target="_blank"
               href="https://wa.me/<?= aai_h(preg_replace('/[^\d]/','', $r['phone'])) ?>">📲 WA</a>
          <?php endif; ?>
          <a class="adm-btn adm-btn--ghost adm-btn--small" href="reminders.php?done=<?= aai_h($r['id'] ?? '') ?>"
             data-confirm="Marcare come fatto?">✓ Fatto</a>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>

<h2 class="adm-h2">▸ Ultime conversazioni</h2>
<?php if (!$recent): ?>
  <div class="adm-empty">Nessuna conversazione registrata. Sarà popolata appena qualcuno scrive ad Andrea AI.</div>
<?php else: ?>
  <table class="adm-table">
    <thead><tr><th>Quando</th><th>Pagina</th><th>Status</th><th>Telefono</th><th>Msg</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($recent as $sid => $r): ?>
      <tr>
        <td data-label="Quando"><?= aai_fmt_relative($r['last_activity_at'] ?? null) ?></td>
        <td data-label="Pagina"><?= aai_h(parse_url($r['page_url'] ?? '/', PHP_URL_PATH) ?: '/') ?></td>
        <td data-label="Status"><?= aai_status_badge($r['status'] ?? 'open') ?></td>
        <td data-label="Telefono"><?= aai_h($r['phone'] ?? '—') ?></td>
        <td data-label="Messaggi"><?= (int)($r['msg_count'] ?? 0) ?></td>
        <td><a href="session.php?id=<?= urlencode($sid) ?>">apri →</a></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        onerror="document.getElementById('trendChart').style.display='none'; document.getElementById('trendChartFallback').style.display='block';"></script>
<script>
(function () {
  const canvas = document.getElementById('trendChart');
  const fallback = document.getElementById('trendChartFallback');
  function showFallback(reason) {
    if (canvas) canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
    console.warn('[admin dashboard] trend chart fallback:', reason);
  }
  if (typeof Chart === 'undefined') { showFallback('Chart.js not loaded (CDN blocked?)'); return; }
  if (!canvas) { showFallback('canvas#trendChart missing'); return; }
  try {
    const trendData = <?= json_encode($trend, JSON_UNESCAPED_UNICODE) ?>;
    if (Chart.getChart) { const prev = Chart.getChart(canvas); if (prev) prev.destroy(); }
    const ctx = canvas.getContext('2d');
    const FONT_FAMILY = "'Inter', system-ui, -apple-system, sans-serif";
    const TXT_DIM = '#9ba3af';
    const TXT     = '#e6e8ec';
    const GRID    = 'rgba(255,255,255,.04)';

    const gradViews = ctx.createLinearGradient(0, 0, 0, 280);
    gradViews.addColorStop(0, 'rgba(99,102,241,.32)');
    gradViews.addColorStop(1, 'rgba(99,102,241,0)');
    const gradChats = ctx.createLinearGradient(0, 0, 0, 280);
    gradChats.addColorStop(0, 'rgba(167,139,250,.26)');
    gradChats.addColorStop(1, 'rgba(167,139,250,0)');

    new Chart(ctx, {
  type: 'line',
  data: {
    labels: trendData.map(d => d.date.slice(5)),
    datasets: [
      { label: 'Visite',         data: trendData.map(d => d.views), borderColor: '#6366f1', backgroundColor: gradViews, tension: 0.35, fill: true, borderWidth: 2, pointBackgroundColor: '#6366f1', pointRadius: 0, pointHoverRadius: 5 },
      { label: 'Chat avviate',   data: trendData.map(d => d.chats), borderColor: '#a78bfa', backgroundColor: gradChats, tension: 0.35, fill: true, borderWidth: 2, pointBackgroundColor: '#a78bfa', pointRadius: 0, pointHoverRadius: 5 },
      { label: 'Click WhatsApp', data: trendData.map(d => d.wa),    borderColor: '#ef4444', tension: 0.35, borderWidth: 2, pointBackgroundColor: '#ef4444', pointRadius: 0, pointHoverRadius: 5 },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: TXT_DIM, font: { family: FONT_FAMILY, size: 12 }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16 } },
      tooltip: {
        backgroundColor: 'rgba(18,20,26,.96)',
        borderColor: 'rgba(99,102,241,.32)',
        borderWidth: 1,
        titleColor: TXT,
        bodyColor: TXT,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        titleFont: { family: FONT_FAMILY, weight: '600' },
        bodyFont:  { family: FONT_FAMILY },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: TXT_DIM, font: { family: FONT_FAMILY } },
        grid: { color: GRID, drawBorder: false },
      },
      x: {
        ticks: { color: TXT_DIM, font: { family: FONT_FAMILY } },
        grid: { display: false },
      },
    },
  },
});
  } catch (err) { showFallback(err && err.message ? err.message : err); }
})();
</script>

<?php aai_admin_footer();
