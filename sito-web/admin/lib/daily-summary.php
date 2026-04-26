<?php
/**
 * Daily AI Summary — generation, caching, error tracking.
 *
 * Generates a hybrid (operativo + trend + azioni) summary once per day at 07:00
 * via cron, caches to data/stats/daily-summary/<YYYY-MM-DD>.json, and exposes
 * load helpers for the dashboard banner. Manual refresh is allowed (CSRF +
 * confirm dialog). Errors are persisted to last-error.json so the admin sees
 * a popup at next dashboard view.
 */

require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';
require_once __DIR__ . '/../../lib/deepseek.php';
require_once __DIR__ . '/bot-tools.php';

const AAI_SUMMARY_DIR        = AAI_STATS . '/daily-summary';
const AAI_SUMMARY_LAST_ERROR = AAI_SUMMARY_DIR . '/last-error.json';
const AAI_SUMMARY_LOCK_FILE  = AAI_LOCKS . '/daily-summary.lock';
const AAI_SUMMARY_SCHEMA_VER = 1;
const AAI_SUMMARY_TIMEOUT    = 60;
const AAI_SUMMARY_AUTO_FALLBACK_HOUR = 9; // after 09:00 dashboard auto-triggers if missing

/* ------------------------------------------------------------------ */
/* Paths & lock                                                       */
/* ------------------------------------------------------------------ */

function aai_summary_path(string $date): string {
    return AAI_SUMMARY_DIR . '/' . $date . '.json';
}

function aai_summary_ensure_dir(): void {
    if (!is_dir(AAI_SUMMARY_DIR)) @mkdir(AAI_SUMMARY_DIR, 0755, true);
    if (!is_dir(AAI_LOCKS))       @mkdir(AAI_LOCKS,       0755, true);
}

/**
 * Acquire non-blocking exclusive lock. Returns file handle or null if busy.
 * Caller MUST call aai_summary_release_lock($fh) in finally block.
 */
function aai_summary_acquire_lock() {
    aai_summary_ensure_dir();
    $fh = fopen(AAI_SUMMARY_LOCK_FILE, 'c');
    if (!$fh) return null;
    if (!flock($fh, LOCK_EX | LOCK_NB)) {
        fclose($fh);
        return null;
    }
    return $fh;
}

function aai_summary_release_lock($fh): void {
    if (!$fh) return;
    @flock($fh, LOCK_UN);
    @fclose($fh);
}

/* ------------------------------------------------------------------ */
/* Read helpers (used by dashboard render)                            */
/* ------------------------------------------------------------------ */

function aai_summary_load(string $date): ?array {
    $p = aai_summary_path($date);
    if (!file_exists($p)) return null;
    $data = aai_read_json($p, null);
    return is_array($data) ? $data : null;
}

/**
 * Best-available payload: today first, then most recent file in the directory.
 * Returns ['payload' => array|null, 'is_stale' => bool, 'used_date' => string|null].
 */
function aai_summary_load_best(string $today): array {
    $cur = aai_summary_load($today);
    if ($cur) return ['payload' => $cur, 'is_stale' => false, 'used_date' => $today];

    aai_summary_ensure_dir();
    $files = glob(AAI_SUMMARY_DIR . '/*.json') ?: [];
    $candidates = [];
    foreach ($files as $f) {
        $base = basename($f, '.json');
        if ($base === 'last-error') continue;
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $base)) $candidates[] = $base;
    }
    rsort($candidates);
    foreach ($candidates as $d) {
        $p = aai_summary_load($d);
        if ($p) return ['payload' => $p, 'is_stale' => true, 'used_date' => $d];
    }
    return ['payload' => null, 'is_stale' => false, 'used_date' => null];
}

function aai_summary_load_error(): ?array {
    if (!file_exists(AAI_SUMMARY_LAST_ERROR)) return null;
    $row = aai_read_json(AAI_SUMMARY_LAST_ERROR, null);
    return is_array($row) ? $row : null;
}

function aai_summary_save_error(string $msg, string $trigger, ?int $http = null): void {
    aai_summary_ensure_dir();
    aai_atomic_update(AAI_SUMMARY_LAST_ERROR, fn($_) => [
        'occurred_at'  => aai_now_iso(),
        'trigger'      => $trigger,
        'error'        => mb_substr($msg, 0, 600),
        'http_status'  => $http,
        'acknowledged' => false,
    ], []);
    @aai_append_line(AAI_EVENTS, json_encode([
        'ts'      => aai_now_iso(),
        'type'    => 'summary_error',
        'trigger' => $trigger,
        'error'   => mb_substr($msg, 0, 300),
    ], JSON_UNESCAPED_UNICODE));
}

function aai_summary_clear_error(): void {
    if (file_exists(AAI_SUMMARY_LAST_ERROR)) @unlink(AAI_SUMMARY_LAST_ERROR);
}

function aai_summary_ack_error(): void {
    if (!file_exists(AAI_SUMMARY_LAST_ERROR)) return;
    aai_atomic_update(AAI_SUMMARY_LAST_ERROR, function ($cur) {
        if (!is_array($cur)) return $cur;
        $cur['acknowledged'] = true;
        return $cur;
    }, []);
}

/* ------------------------------------------------------------------ */
/* Data snapshot for the prompt                                       */
/* ------------------------------------------------------------------ */

/**
 * Build the data dump fed to DeepSeek. Reuses bot-tools aggregators so the
 * numbers match what the AI Analyst sees. All errors are caught and reported
 * inside the snapshot rather than thrown.
 */
function aai_summary_collect_data(): array {
    $today      = gmdate('Y-m-d');
    $yesterday  = gmdate('Y-m-d', strtotime('-1 day'));
    $dayBefore  = gmdate('Y-m-d', strtotime('-2 days'));

    $yRow = aai_read_json(AAI_STATS . "/daily/{$yesterday}.json", []);
    $bRow = aai_read_json(AAI_STATS . "/daily/{$dayBefore}.json", []);

    $kpiYesterday = [
        'visits'        => (int)($yRow['page_views']['total'] ?? 0),
        'chats_opened'  => (int)($yRow['chat_open']           ?? 0),
        'chats_started' => (int)($yRow['chat_start']          ?? 0),
        'phones'        => (int)($yRow['phone_submitted']     ?? 0),
        'wa_clicks'     => (int)($yRow['whatsapp_click']      ?? 0),
    ];
    $kpiDayBefore = [
        'visits'        => (int)($bRow['page_views']['total'] ?? 0),
        'chats_opened'  => (int)($bRow['chat_open']           ?? 0),
        'chats_started' => (int)($bRow['chat_start']          ?? 0),
        'phones'        => (int)($bRow['phone_submitted']     ?? 0),
        'wa_clicks'     => (int)($bRow['whatsapp_click']      ?? 0),
    ];
    $deltaPct = function (int $cur, int $prev): ?float {
        if ($prev === 0) return $cur === 0 ? 0.0 : null;
        return round(($cur - $prev) * 100 / $prev, 1);
    };
    $vsDayBefore = [
        'visits_delta_pct'  => $deltaPct($kpiYesterday['visits'],        $kpiDayBefore['visits']),
        'chats_delta_pct'   => $deltaPct($kpiYesterday['chats_started'], $kpiDayBefore['chats_started']),
        'phones_delta_pct'  => $deltaPct($kpiYesterday['phones'],        $kpiDayBefore['phones']),
    ];

    $cmp7  = aai_safe(fn() => aai_bot_compare_periods(7));
    $cmp30 = aai_safe(fn() => aai_bot_compare_periods(30));
    $top   = aai_safe(fn() => aai_bot_top_pages(7, 10));
    $src   = aai_safe(fn() => aai_bot_sources(7));
    $dev   = aai_safe(fn() => aai_bot_devices(7));
    $fnl7  = aai_safe(fn() => aai_bot_funnel(7));
    $unans = aai_safe(fn() => aai_bot_unanswered_sessions(14, 5));
    $rem   = aai_safe(fn() => aai_bot_reminders('all', 50));

    $remOverdue  = 0; $remDueToday = 0; $remOpen = 0;
    if (is_array($rem['reminders'] ?? null)) {
        $now = time();
        $cutoff = strtotime('tomorrow');
        foreach ($rem['reminders'] as $r) {
            if (!empty($r['done'])) continue;
            $remOpen++;
            $due = strtotime($r['due_at'] ?? '');
            if ($due && $due < $now) $remOverdue++;
            elseif ($due && $due <= $cutoff) $remDueToday++;
        }
    }

    $newContactsYesterday = aai_safe_int(function () use ($yesterday) {
        $contacts = aai_read_json(AAI_CONTACTS, []);
        $n = 0;
        foreach ($contacts as $meta) {
            $first = substr((string)($meta['first_seen'] ?? ''), 0, 10);
            if ($first === $yesterday) $n++;
        }
        return $n;
    });

    return [
        'today'      => $today,
        'yesterday'  => $yesterday,
        'day_before' => $dayBefore,
        'yesterday_kpi'    => $kpiYesterday,
        'day_before_kpi'   => $kpiDayBefore,
        'vs_day_before'    => $vsDayBefore,
        'compare_7d'       => $cmp7,
        'compare_30d'      => $cmp30,
        'top_pages_7d'     => $top['top_pages'] ?? [],
        'sources_7d'       => $src['sources']   ?? [],
        'top_referrer_hosts_7d' => $src['top_referrer_hosts'] ?? [],
        'devices_7d'       => [
            'browser'        => array_slice($dev['browser']       ?? [], 0, 6, true),
            'os'             => array_slice($dev['os']            ?? [], 0, 6, true),
            'language'       => array_slice($dev['language']      ?? [], 0, 6, true),
            'screen_bucket'  => array_slice($dev['screen_bucket'] ?? [], 0, 8, true),
        ],
        'funnel_7d'        => $fnl7['funnel'] ?? [],
        'unanswered_sessions_14d' => $unans['sessions'] ?? [],
        'unanswered_count_14d'    => (int)($unans['count'] ?? 0),
        'new_contacts_yesterday'  => $newContactsYesterday,
        'reminders_open'   => $remOpen,
        'reminders_overdue'=> $remOverdue,
        'reminders_due_today' => $remDueToday,
    ];
}

function aai_safe(callable $fn): array {
    try { $r = $fn(); return is_array($r) ? $r : []; }
    catch (Throwable $e) { return ['_error' => $e->getMessage()]; }
}
function aai_safe_int(callable $fn): int {
    try { return (int)$fn(); } catch (Throwable $e) { return 0; }
}

/* ------------------------------------------------------------------ */
/* Generation                                                         */
/* ------------------------------------------------------------------ */

function aai_summary_system_prompt(): string {
    return <<<PROMPT
Sei l'analyst dati di Andrea Piani, freelance developer (sito andreapiani.com — app iOS/Android, Python, CRM, PrestaShop, web app).

Ricevi un dump JSON con statistiche del sito (KPI ieri, confronti 7gg e 30gg vs periodi precedenti, top pagine, sources, devices, funnel, lead non richiamati, contatti, reminders).

Genera un riassunto giornaliero in italiano, tono professionale e diretto, focalizzato su insight azionabili. Niente marketing, niente fluff. Sei uno strumento interno per Andrea.

REGOLE:
- Non inventare numeri. Cita solo dati presenti nel dump.
- Numeri italiani: punto migliaia (1.234), virgola decimali. Sotto 1000 nessun separatore.
- Se i numeri sono molto bassi o zero, dillo onestamente nelle azioni (es. "Traffico ancora basso, valuta push LinkedIn").
- Indica la finestra temporale quando citi un dato (es. "21 visite ieri", "+12% vs settimana prima").
- Le azioni devono essere concrete e basate sui dati: richiamare lead non risposti, pubblicare caso studio sulla pagina top, indagare cali, ecc.
- Se ci sono lead non richiamati (unanswered_sessions_14d) o reminders in overdue, dagli priorità alta nelle azioni.

OUTPUT: JSON object con esattamente questi 4 campi:
- "headline": stringa max 70 caratteri, sintesi in una frase
- "operativo": stringa 2-3 frasi su cosa è successo ieri (con delta vs giorno prima dove utile)
- "trend": stringa 2-3 frasi su andamento 7gg vs settimana precedente, top pagine in crescita o calo, source dominante
- "azioni": array di 1-3 stringhe, ogni elemento è un'azione concreta

Niente testo fuori dal JSON.
PROMPT;
}

/**
 * Run the full generation pipeline. Caller already holds the lock.
 * Returns the saved payload on success, throws RuntimeException on failure.
 */
function aai_summary_generate(string $trigger): array {
    aai_summary_ensure_dir();

    $snapshot = aai_summary_collect_data();
    $today    = $snapshot['today'];

    $messages = [
        ['role' => 'system', 'content' => aai_summary_system_prompt()],
        ['role' => 'user',   'content' => json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
    ];

    $resp = aai_deepseek_chat($messages, [], [
        'temperature' => 0.4,
        'max_tokens'  => 800,
        'response_format' => ['type' => 'json_object'],
    ]);

    $choice = $resp['choices'][0]['message']['content'] ?? '';
    if (!is_string($choice) || $choice === '') {
        throw new RuntimeException('empty_completion');
    }
    $parsed = json_decode($choice, true);
    if (!is_array($parsed)) {
        throw new RuntimeException('invalid_json: ' . mb_substr($choice, 0, 200));
    }

    $required = ['headline', 'operativo', 'trend', 'azioni'];
    foreach ($required as $f) {
        if (!array_key_exists($f, $parsed)) {
            throw new RuntimeException("missing_field: $f");
        }
    }
    $headline  = aai_clean_text((string)$parsed['headline'], 120);
    $operativo = aai_clean_text((string)$parsed['operativo'], 800);
    $trend     = aai_clean_text((string)$parsed['trend'], 800);
    $azioniRaw = is_array($parsed['azioni']) ? $parsed['azioni'] : [];
    $azioni    = [];
    foreach ($azioniRaw as $a) {
        $s = aai_clean_text((string)$a, 300);
        if ($s !== '') $azioni[] = $s;
        if (count($azioni) >= 3) break;
    }
    if (!$azioni) $azioni = ['Nessuna azione prioritaria suggerita oggi.'];

    $usage = $resp['usage'] ?? [];
    $payload = [
        'schema_version' => AAI_SUMMARY_SCHEMA_VER,
        'generated_at'   => aai_now_iso(),
        'date'           => $today,
        'trigger'        => $trigger,
        'model'          => $resp['model'] ?? AAI_DS_MODEL,
        'tokens_used'    => [
            'prompt'     => (int)($usage['prompt_tokens']     ?? 0),
            'completion' => (int)($usage['completion_tokens'] ?? 0),
            'total'      => (int)($usage['total_tokens']      ?? 0),
        ],
        'summary' => [
            'headline'  => $headline,
            'operativo' => $operativo,
            'trend'     => $trend,
            'azioni'    => $azioni,
        ],
        'data_snapshot' => $snapshot,
    ];

    aai_atomic_update(aai_summary_path($today), fn($_) => $payload, []);
    aai_summary_clear_error();
    return $payload;
}

/**
 * True if today's summary is missing AND we're past the auto-fallback hour.
 * Used by dashboard to decide whether to trigger a one-shot regeneration.
 */
function aai_summary_should_auto_generate(string $today): bool {
    if (file_exists(aai_summary_path($today))) return false;
    $hour = (int)date('G');
    return $hour >= AAI_SUMMARY_AUTO_FALLBACK_HOUR;
}
