<?php
require_once __DIR__ . '/lib/layout.php';
aai_admin_require();

$days = (int)($_GET['days'] ?? 30);
if (!in_array($days, [7, 30, 90], true)) $days = 30;

// Aggregate over the requested window
$totals = [
    'page_views' => 0, 'chat_open' => 0, 'consent_accept' => 0,
    'chat_start' => 0, 'phone_form_shown' => 0, 'phone_submitted' => 0,
    'whatsapp_click' => 0, 'unique_sessions' => 0, 'unique_visitors' => 0,
    'device' => ['mobile' => 0, 'desktop' => 0],
];
$byPage = [];
$trend = [];
$sources = []; $referrerHosts = [];
$browsers = []; $oses = []; $langs = []; $screens = [];

for ($i = $days - 1; $i >= 0; $i--) {
    $d = gmdate('Y-m-d', strtotime("-$i days"));
    $row = aai_read_json(AAI_STATS . "/daily/{$d}.json", null);
    $point = ['date' => $d, 'views' => 0, 'chat_starts' => 0, 'phones' => 0, 'wa' => 0];
    if ($row) {
        $point['views']       = (int)($row['page_views']['total'] ?? 0);
        $point['chat_starts'] = (int)($row['chat_start'] ?? 0);
        $point['phones']      = (int)($row['phone_submitted'] ?? 0);
        $point['wa']          = (int)($row['whatsapp_click'] ?? 0);

        $totals['page_views']      += $point['views'];
        $totals['chat_open']       += (int)($row['chat_open'] ?? 0);
        $totals['consent_accept']  += (int)($row['consent_accept'] ?? 0);
        $totals['chat_start']      += $point['chat_starts'];
        $totals['phone_form_shown']+= (int)($row['phone_form_shown'] ?? 0);
        $totals['phone_submitted'] += $point['phones'];
        $totals['whatsapp_click']  += $point['wa'];
        $totals['unique_sessions'] += is_array($row['unique_sessions'] ?? null) ? count($row['unique_sessions']) : (int)($row['unique_sessions'] ?? 0);
        $totals['unique_visitors'] += is_array($row['unique_visitors'] ?? null) ? count($row['unique_visitors']) : (int)($row['unique_visitors'] ?? 0);
        $totals['device']['mobile']  += (int)($row['device']['mobile']  ?? 0);
        $totals['device']['desktop'] += (int)($row['device']['desktop'] ?? 0);
        foreach (($row['page_views']['by_page'] ?? []) as $page => $count) {
            $byPage[$page] = ($byPage[$page] ?? 0) + (int)$count;
        }
        foreach (($row['sources']         ?? []) as $k => $v) $sources[$k]        = ($sources[$k]        ?? 0) + (int)$v;
        foreach (($row['referrer_hosts']  ?? []) as $k => $v) $referrerHosts[$k]  = ($referrerHosts[$k]  ?? 0) + (int)$v;
        foreach (($row['browser']         ?? []) as $k => $v) $browsers[$k]       = ($browsers[$k]       ?? 0) + (int)$v;
        foreach (($row['os']              ?? []) as $k => $v) $oses[$k]           = ($oses[$k]           ?? 0) + (int)$v;
        foreach (($row['lang']            ?? []) as $k => $v) $langs[$k]          = ($langs[$k]          ?? 0) + (int)$v;
        foreach (($row['screen']          ?? []) as $k => $v) $screens[$k]        = ($screens[$k]        ?? 0) + (int)$v;
    }
    $trend[] = $point;
}
arsort($sources); arsort($referrerHosts);
arsort($browsers); arsort($oses); arsort($langs); arsort($screens);

arsort($byPage);
$topPages = array_slice($byPage, 0, 20, true);

$pct = fn($n, $d) => $d > 0 ? round($n * 100 / $d, 1) : 0;
$rates = [
    'open_from_view'    => $pct($totals['chat_open'], $totals['page_views']),
    'consent_from_open' => $pct($totals['consent_accept'], $totals['chat_open']),
    'start_from_consent'=> $pct($totals['chat_start'], $totals['consent_accept']),
    'phone_from_start'  => $pct($totals['phone_submitted'], $totals['chat_start']),
    'wa_from_view'      => $pct($totals['whatsapp_click'], $totals['page_views']),
];

$totalDeviceSessions = $totals['device']['mobile'] + $totals['device']['desktop'];
$mobilePct = $pct($totals['device']['mobile'], $totalDeviceSessions);

aai_admin_header('Statistiche', 'stats');
?>
<h1 class="adm-title">Statistiche</h1>

<div class="adm-filter-bar">
  <a class="adm-btn adm-btn--<?= $days===7  ? '' : 'ghost' ?>" href="?days=7">Ultimi 7 giorni</a>
  <a class="adm-btn adm-btn--<?= $days===30 ? '' : 'ghost' ?>" href="?days=30">Ultimi 30 giorni</a>
  <a class="adm-btn adm-btn--<?= $days===90 ? '' : 'ghost' ?>" href="?days=90">Ultimi 90 giorni</a>
</div>

<div class="adm-kpi-grid">
  <div class="adm-kpi"><div class="adm-kpi-label">Visite</div>
    <div class="adm-kpi-value"><?= number_format($totals['page_views'], 0, ',', '.') ?></div>
    <div class="adm-kpi-sub"><?= $totals['unique_visitors'] ?> visitatori unici</div></div>
  <div class="adm-kpi"><div class="adm-kpi-label">Chat aperte</div>
    <div class="adm-kpi-value"><?= $totals['chat_open'] ?></div>
    <div class="adm-kpi-sub"><?= $rates['open_from_view'] ?>% delle visite</div></div>
  <div class="adm-kpi"><div class="adm-kpi-label">Chat avviate</div>
    <div class="adm-kpi-value"><?= $totals['chat_start'] ?></div>
    <div class="adm-kpi-sub"><?= $rates['start_from_consent'] ?>% dei consensi</div></div>
  <div class="adm-kpi"><div class="adm-kpi-label">Telefoni raccolti</div>
    <div class="adm-kpi-value"><?= $totals['phone_submitted'] ?></div>
    <div class="adm-kpi-sub"><?= $rates['phone_from_start'] ?>% delle chat</div></div>
  <div class="adm-kpi"><div class="adm-kpi-label">Click WhatsApp</div>
    <div class="adm-kpi-value"><?= $totals['whatsapp_click'] ?></div>
    <div class="adm-kpi-sub"><?= $rates['wa_from_view'] ?>% delle visite</div></div>
  <div class="adm-kpi"><div class="adm-kpi-label">Mobile</div>
    <div class="adm-kpi-value"><?= $mobilePct ?>%</div>
    <div class="adm-kpi-sub"><?= $totals['device']['mobile'] ?> sessioni</div></div>
</div>

<h2 class="adm-h2">📈 Trend ultimi <?= $days ?> giorni</h2>
<div class="adm-card">
  <canvas id="trendChart" height="300"></canvas>
</div>

<h2 class="adm-h2">🚦 Funnel di conversione</h2>
<div class="adm-card">
  <?php
  $maxFunnel = max($totals['page_views'], 1);
  $steps = [
      ['Visite',          $totals['page_views'],       100],
      ['Chat aperte',     $totals['chat_open'],        $pct($totals['chat_open'], $maxFunnel)],
      ['Consenso privacy',$totals['consent_accept'],   $pct($totals['consent_accept'], $maxFunnel)],
      ['Chat avviate',    $totals['chat_start'],       $pct($totals['chat_start'], $maxFunnel)],
      ['Telefoni',        $totals['phone_submitted'],  $pct($totals['phone_submitted'], $maxFunnel)],
      ['Click WhatsApp',  $totals['whatsapp_click'],   $pct($totals['whatsapp_click'], $maxFunnel)],
  ];
  ?>
  <div class="adm-funnel">
    <?php foreach ($steps as [$label, $value, $width]): ?>
      <div class="adm-funnel-row">
        <div class="adm-funnel-label"><?= aai_h($label) ?></div>
        <div class="adm-funnel-bar-wrap">
          <div class="adm-funnel-bar" style="width: <?= max($width, 1) ?>%"></div>
        </div>
        <div class="adm-funnel-value">
          <strong><?= $value ?></strong>
          <span class="adm-funnel-pct"><?= $width ?>%</span>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>

<?php
function aai_stats_breakdown(string $title, array $items, int $totalViews, callable $metaFn, ?array $extraHosts = null): void {
    ?>
  <div class="adm-card">
    <h3 class="adm-card-title"><?= $title ?></h3>
    <?php if (!$items): ?>
      <div class="adm-empty adm-empty--inline">Nessun dato in questo periodo.</div>
    <?php else:
      $maxV = max($items) ?: 1; ?>
      <div class="adm-source-list">
        <?php foreach ($items as $slug => $cnt):
          $meta  = $metaFn((string)$slug);
          $label = $meta[0] ?? (string)$slug;
          $icon  = $meta[1] ?? '•';
          $color = $meta[2] ?? '#8b5cf6';
          $pct   = round($cnt * 100 / max($totalViews, 1));
          $w     = round($cnt * 100 / $maxV);
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
      <?php if (!empty($extraHosts)):
        $list = $extraHosts; arsort($list); $list = array_slice($list, 0, 5, true); ?>
        <div class="adm-host-detail">
          <div class="adm-mini-label">Top host esterni</div>
          <?php foreach ($list as $host => $hc): ?>
            <div class="adm-host-row"><code><?= aai_h($host) ?></code><span><?= $hc ?></span></div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    <?php endif; ?>
  </div>
    <?php
}
?>

<h2 class="adm-h2">🌐 Sorgenti di traffico</h2>
<?php aai_stats_breakdown('Sorgenti ultimi ' . $days . ' giorni', $sources, $totals['page_views'], 'aai_source_meta', $referrerHosts); ?>

<h2 class="adm-h2">🖥️ Dispositivi visitatori</h2>
<div class="adm-grid-2">
  <?php aai_stats_breakdown('🌐 Browser',         $browsers, $totals['page_views'], 'aai_browser_meta'); ?>
  <?php aai_stats_breakdown('💻 Sistema operativo', $oses,    $totals['page_views'], 'aai_os_meta'); ?>
</div>
<div class="adm-grid-2">
  <?php aai_stats_breakdown('🗣️ Lingua browser',    $langs,   $totals['page_views'], 'aai_lang_meta'); ?>
  <?php aai_stats_breakdown('📐 Risoluzione',       $screens, $totals['page_views'], 'aai_screen_meta'); ?>
</div>

<h2 class="adm-h2">📄 Top pagine (<?= count($byPage) ?> totali)</h2>
<?php if (!$topPages): ?>
  <div class="adm-empty">Nessuna pagina visitata in questo periodo.</div>
<?php else: ?>
  <table class="adm-table">
    <thead><tr><th>Pagina</th><th style="text-align:right">Visite</th><th></th></tr></thead>
    <tbody>
    <?php $maxTop = max($topPages) ?: 1; foreach ($topPages as $page => $count): ?>
      <tr>
        <td data-label="Pagina"><code style="font-size:12px"><?= aai_h($page) ?></code></td>
        <td data-label="Visite" style="text-align:right"><strong><?= $count ?></strong></td>
        <td data-label="Bar" style="width:35%">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
            <div style="background:#2563eb;height:100%;width: <?= $count / $maxTop * 100 ?>%"></div>
          </div>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
const trendData = <?= json_encode($trend, JSON_UNESCAPED_UNICODE) ?>;
const _css = getComputedStyle(document.documentElement);
const COL_TEXT_DIM = (_css.getPropertyValue('--text-dim') || '').trim() || '#9ba3af';
const COL_BORDER   = (_css.getPropertyValue('--border')   || '').trim() || '#1f232c';
Chart.defaults.color = COL_TEXT_DIM;
Chart.defaults.borderColor = COL_BORDER;
Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
Chart.defaults.font.size = 12;

(function(){ var c = document.getElementById('trendChart'); if (window.Chart && Chart.getChart) { var prev = Chart.getChart(c); if (prev) prev.destroy(); } })();
new Chart(document.getElementById('trendChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: trendData.map(d => d.date.slice(5)),
    datasets: [
      { label: 'Visite',         data: trendData.map(d => d.views),       borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.12)', tension: 0.3, fill: true,  borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#6366f1', order: 4 },
      { label: 'Chat avviate',   data: trendData.map(d => d.chat_starts), borderColor: '#10b981', tension: 0.3, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#10b981', order: 3 },
      { label: 'Telefoni',       data: trendData.map(d => d.phones),      borderColor: '#f59e0b', tension: 0.3, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#f59e0b', pointStyle: 'rectRot', order: 1 },
      { label: 'Click WhatsApp', data: trendData.map(d => d.wa),          borderColor: '#ef4444', tension: 0.3, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#ef4444', order: 2 },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16 } },
      tooltip: {
        backgroundColor: 'rgba(18,20,26,.96)',
        borderColor: COL_BORDER, borderWidth: 1,
        titleColor: '#e6e8ec', bodyColor: '#e6e8ec',
        padding: 10, cornerRadius: 8, boxPadding: 4,
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, color: COL_TEXT_DIM }, grid: { color: 'rgba(255,255,255,.04)', drawBorder: false } },
      x: { ticks: { color: COL_TEXT_DIM }, grid: { display: false } }
    },
  },
});
</script>

<?php aai_admin_footer();
