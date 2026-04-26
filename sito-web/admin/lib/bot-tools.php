<?php
/**
 * Tool schemas + handlers for the admin AI analyst bot.
 *
 * Each tool reads real data from data/* files and returns a compact JSON
 * structure. Schemas follow OpenAI function-calling format (DeepSeek-compat).
 *
 * Adding a tool: append to aai_bot_tool_schemas() and add a case in aai_bot_dispatch_tool().
 */

require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';

/** Returns the tool schema array passed to DeepSeek. */
function aai_bot_tool_schemas(): array {
    return [
        ['type'=>'function','function'=>[
            'name'=>'get_overview',
            'description'=>"Aggregated KPIs for the last N days: page views, unique visitors, chat opens, chat starts, phones submitted, WhatsApp clicks, mobile %, and full-funnel conversion rates. Use first when asked 'how is the site doing'.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','enum'=>[7,30,90],'description'=>'Window size in days'],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_trend',
            'description'=>"Daily time series for the last N days. Returns one point per day with views, chat_starts, phones, whatsapp_clicks. Use to spot growth/drops.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','minimum'=>1,'maximum'=>180],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_top_pages',
            'description'=>"Top pages by views over a window. Returns page URL + view count, descending.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','minimum'=>1,'maximum'=>180],
                    'limit'=>['type'=>'integer','minimum'=>1,'maximum'=>50,'default'=>15],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_traffic_sources',
            'description'=>"Traffic source breakdown (Google, social, AI assistants, direct, referral) over a window. Includes top referrer hosts.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','minimum'=>1,'maximum'=>180],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_devices',
            'description'=>"Visitor device breakdown over a window: browser, OS, screen-size bucket, language. Useful to understand who visits.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','minimum'=>1,'maximum'=>180],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_hourly_distribution',
            'description'=>"Hour-of-day visit distribution for a single date (0-23 buckets). Use to find peak hours.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'date'=>['type'=>'string','description'=>'YYYY-MM-DD'],
                ],
                'required'=>['date'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_recent_sessions',
            'description'=>"Recent chat sessions (most recent first) with metadata: id, started_at, last_activity_at, status, msg_count, has_phone, phone, phone_trigger, first_user_message. Use when asked about leads or recent conversations.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'limit'=>['type'=>'integer','minimum'=>1,'maximum'=>50,'default'=>20],
                    'status'=>['type'=>'string','enum'=>['any','open','closed','converted','spam'],'default'=>'any'],
                    'with_phone_only'=>['type'=>'boolean','default'=>false],
                ],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_session_detail',
            'description'=>"Full conversation transcript + metadata for one session id. Returns messages array. Use when user asks 'what did session X talk about'.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'session_id'=>['type'=>'string'],
                ],
                'required'=>['session_id'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'search_sessions',
            'description'=>"Substring search across user messages in conversations from the last N days. Returns matching sessions with the matched message snippet. Case-insensitive.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'query'=>['type'=>'string','minLength'=>2],
                    'days'=>['type'=>'integer','minimum'=>1,'maximum'=>365,'default'=>90],
                    'limit'=>['type'=>'integer','minimum'=>1,'maximum'=>30,'default'=>15],
                ],
                'required'=>['query'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_contacts',
            'description'=>"All collected phone contacts with first_seen, last_seen, session count, and last source page.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'limit'=>['type'=>'integer','minimum'=>1,'maximum'=>200,'default'=>50],
                ],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_reminders',
            'description'=>"Follow-up reminders. Filter by state (overdue, due_today, upcoming, done, all).",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'filter'=>['type'=>'string','enum'=>['overdue','due_today','upcoming','done','all'],'default'=>'all'],
                    'limit'=>['type'=>'integer','minimum'=>1,'maximum'=>100,'default'=>30],
                ],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_funnel',
            'description'=>"Conversion funnel over N days: views → chat_open → consent_accept → chat_start → phone_form_shown → phone_submitted → whatsapp_click. Includes per-step drop-off %.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','enum'=>[7,30,90]],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'compare_periods',
            'description'=>"Compare current N-day window vs the immediately prior N-day window. Returns absolute totals and % delta for views, chat_start, phone_submitted, whatsapp_click. Use when asked 'how does this week compare to last' or for trend deltas.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','enum'=>[7,14,30,90]],
                ],
                'required'=>['days'],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'get_unanswered_sessions',
            'description'=>"Sessions with at least one user message in the last N days that have NO phone collected and NO reminder set. These are potentially lost leads worth following up. Returns most recent first.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'days'=>['type'=>'integer','minimum'=>1,'maximum'=>90,'default'=>14],
                    'limit'=>['type'=>'integer','minimum'=>1,'maximum'=>30,'default'=>15],
                ],
            ],
        ]],
        ['type'=>'function','function'=>[
            'name'=>'create_reminder',
            'description'=>"Create a follow-up reminder. Provide due_at as a relative expression like '+2 days', '+1 hour', 'tomorrow 10:00', or absolute 'YYYY-MM-DD HH:MM'. At least one of session_id or phone is required. Note is a short free-text. Use only when user explicitly asks to create a reminder.",
            'parameters'=>[
                'type'=>'object',
                'properties'=>[
                    'session_id'=>['type'=>'string'],
                    'phone'=>['type'=>'string'],
                    'due_at'=>['type'=>'string','description'=>'Relative or absolute date/time. Parsed via strtotime.'],
                    'note'=>['type'=>'string','maxLength'=>500],
                ],
                'required'=>['due_at','note'],
            ],
        ]],
    ];
}

/** Dispatch a tool call. $args is decoded array of arguments. */
function aai_bot_dispatch_tool(string $name, array $args): array {
    switch ($name) {
        case 'get_overview':            return aai_bot_overview((int)($args['days'] ?? 30));
        case 'get_trend':               return aai_bot_trend((int)($args['days'] ?? 30));
        case 'get_top_pages':           return aai_bot_top_pages((int)($args['days'] ?? 30), (int)($args['limit'] ?? 15));
        case 'get_traffic_sources':     return aai_bot_sources((int)($args['days'] ?? 30));
        case 'get_devices':             return aai_bot_devices((int)($args['days'] ?? 30));
        case 'get_hourly_distribution': return aai_bot_hourly((string)($args['date'] ?? gmdate('Y-m-d')));
        case 'get_recent_sessions':     return aai_bot_recent_sessions((int)($args['limit'] ?? 20), (string)($args['status'] ?? 'any'), !empty($args['with_phone_only']));
        case 'get_session_detail':      return aai_bot_session_detail((string)($args['session_id'] ?? ''));
        case 'search_sessions':         return aai_bot_search_sessions((string)($args['query'] ?? ''), (int)($args['days'] ?? 90), (int)($args['limit'] ?? 15));
        case 'get_contacts':            return aai_bot_contacts((int)($args['limit'] ?? 50));
        case 'get_reminders':           return aai_bot_reminders((string)($args['filter'] ?? 'all'), (int)($args['limit'] ?? 30));
        case 'get_funnel':              return aai_bot_funnel((int)($args['days'] ?? 30));
        case 'compare_periods':         return aai_bot_compare_periods((int)($args['days'] ?? 7));
        case 'get_unanswered_sessions': return aai_bot_unanswered_sessions((int)($args['days'] ?? 14), (int)($args['limit'] ?? 15));
        case 'create_reminder':         return aai_bot_create_reminder($args);
    }
    return ['error' => 'unknown_tool: ' . $name];
}

/* ---------- Implementations ---------- */

function _aai_bot_iter_days(int $days, int $offsetDays = 0): array {
    static $cache = [];
    $out = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $d = gmdate('Y-m-d', strtotime('-' . ($i + $offsetDays) . ' days'));
        if (!array_key_exists($d, $cache)) {
            $row = aai_read_json(AAI_STATS . "/daily/{$d}.json", null);
            $cache[$d] = is_array($row) ? $row : null;
        }
        $out[$d] = $cache[$d];
    }
    return $out;
}

function aai_bot_overview(int $days): array {
    $days = in_array($days, [7,30,90], true) ? $days : 30;
    $totals = ['page_views'=>0,'chat_open'=>0,'consent_accept'=>0,'chat_start'=>0,
               'phone_form_shown'=>0,'phone_submitted'=>0,'whatsapp_click'=>0,
               'unique_visitors'=>0,'mobile'=>0,'desktop'=>0];
    foreach (_aai_bot_iter_days($days) as $row) {
        if (!$row) continue;
        $totals['page_views']       += (int)($row['page_views']['total'] ?? 0);
        $totals['chat_open']        += (int)($row['chat_open'] ?? 0);
        $totals['consent_accept']   += (int)($row['consent_accept'] ?? 0);
        $totals['chat_start']       += (int)($row['chat_start'] ?? 0);
        $totals['phone_form_shown'] += (int)($row['phone_form_shown'] ?? 0);
        $totals['phone_submitted']  += (int)($row['phone_submitted'] ?? 0);
        $totals['whatsapp_click']   += (int)($row['whatsapp_click'] ?? 0);
        $totals['unique_visitors']  += is_array($row['unique_visitors'] ?? null) ? count($row['unique_visitors']) : (int)($row['unique_visitors'] ?? 0);
        $totals['mobile']           += (int)($row['device']['mobile']  ?? 0);
        $totals['desktop']          += (int)($row['device']['desktop'] ?? 0);
    }
    $pct = fn($n,$d) => $d > 0 ? round($n*100/$d, 2) : 0;
    $devTotal = $totals['mobile'] + $totals['desktop'];
    return [
        'window_days'    => $days,
        'totals'         => $totals,
        'rates_pct'      => [
            'chat_open_from_views'    => $pct($totals['chat_open'], $totals['page_views']),
            'consent_from_open'       => $pct($totals['consent_accept'], $totals['chat_open']),
            'start_from_consent'      => $pct($totals['chat_start'], $totals['consent_accept']),
            'phone_from_start'        => $pct($totals['phone_submitted'], $totals['chat_start']),
            'wa_from_views'           => $pct($totals['whatsapp_click'], $totals['page_views']),
            'mobile_share'            => $pct($totals['mobile'], $devTotal),
        ],
    ];
}

function aai_bot_trend(int $days): array {
    $days = max(1, min(180, $days));
    $series = [];
    foreach (_aai_bot_iter_days($days) as $date => $row) {
        $series[] = [
            'date'        => $date,
            'views'       => (int)($row['page_views']['total'] ?? 0),
            'chat_starts' => (int)($row['chat_start'] ?? 0),
            'phones'      => (int)($row['phone_submitted'] ?? 0),
            'wa_clicks'   => (int)($row['whatsapp_click'] ?? 0),
        ];
    }
    return ['days' => $days, 'series' => $series];
}

function aai_bot_top_pages(int $days, int $limit): array {
    $days = max(1, min(180, $days));
    $limit = max(1, min(50, $limit));
    $agg = [];
    foreach (_aai_bot_iter_days($days) as $row) {
        if (!$row) continue;
        foreach (($row['page_views']['by_page'] ?? []) as $p => $c) {
            $agg[$p] = ($agg[$p] ?? 0) + (int)$c;
        }
    }
    arsort($agg);
    $top = array_slice($agg, 0, $limit, true);
    $out = [];
    foreach ($top as $page => $count) $out[] = ['page' => $page, 'views' => $count];
    return ['days' => $days, 'top_pages' => $out];
}

function aai_bot_sources(int $days): array {
    $days = max(1, min(180, $days));
    $sources = []; $hosts = [];
    foreach (_aai_bot_iter_days($days) as $row) {
        if (!$row) continue;
        foreach (($row['sources'] ?? []) as $k => $v)        $sources[$k] = ($sources[$k] ?? 0) + (int)$v;
        foreach (($row['referrer_hosts'] ?? []) as $k => $v) $hosts[$k]   = ($hosts[$k] ?? 0) + (int)$v;
    }
    arsort($sources); arsort($hosts);
    $hosts = array_slice($hosts, 0, 20, true);
    $sourceList = []; foreach ($sources as $k => $v) $sourceList[] = ['source' => $k, 'visits' => $v];
    $hostList = [];   foreach ($hosts as $k => $v)   $hostList[]   = ['host' => $k,   'visits' => $v];
    return ['days' => $days, 'sources' => $sourceList, 'top_referrer_hosts' => $hostList];
}

function aai_bot_devices(int $days): array {
    $days = max(1, min(180, $days));
    $b = []; $o = []; $l = []; $s = [];
    foreach (_aai_bot_iter_days($days) as $row) {
        if (!$row) continue;
        foreach (($row['browser'] ?? []) as $k => $v) $b[$k] = ($b[$k] ?? 0) + (int)$v;
        foreach (($row['os']      ?? []) as $k => $v) $o[$k] = ($o[$k] ?? 0) + (int)$v;
        foreach (($row['lang']    ?? []) as $k => $v) $l[$k] = ($l[$k] ?? 0) + (int)$v;
        foreach (($row['screen']  ?? []) as $k => $v) $s[$k] = ($s[$k] ?? 0) + (int)$v;
    }
    arsort($b); arsort($o); arsort($l); arsort($s);
    return ['days'=>$days,'browser'=>$b,'os'=>$o,'language'=>$l,'screen_bucket'=>$s];
}

function aai_bot_hourly(string $date): array {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) return ['error'=>'invalid_date'];
    $row = aai_read_json(AAI_STATS . "/daily/{$date}.json", null);
    $hourly = is_array($row['hourly'] ?? null) ? $row['hourly'] : null;

    if (!$hourly && file_exists(AAI_EVENTS)) {
        $hourly = array_fill(0, 24, 0);
        $needle = '"ts":"' . $date;
        $f = @fopen(AAI_EVENTS, 'r');
        if ($f) {
            while (($line = fgets($f)) !== false) {
                if (strpos($line, $needle) === false) continue;
                $e = json_decode($line, true);
                if (!is_array($e) || ($e['type'] ?? '') !== 'page_view') continue;
                $hr = (int)substr($e['ts'] ?? '', 11, 2);
                if ($hr >= 0 && $hr < 24) $hourly[$hr]++;
            }
            fclose($f);
        }
    }
    if (!is_array($hourly)) $hourly = array_fill(0, 24, 0);
    return ['date'=>$date,'hourly'=>$hourly,'peak_hour'=>array_search(max($hourly), $hourly)];
}

function aai_bot_recent_sessions(int $limit, string $status, bool $withPhoneOnly): array {
    $limit = max(1, min(50, $limit));
    $idx = aai_read_json(AAI_INDEX, []);
    uasort($idx, fn($a,$b) => strcmp($b['last_activity_at'] ?? '', $a['last_activity_at'] ?? ''));
    $out = [];
    foreach ($idx as $sid => $meta) {
        if ($status !== 'any' && ($meta['status'] ?? '') !== $status) continue;
        if ($withPhoneOnly && empty($meta['phone'])) continue;

        $convPath = aai_find_conv_path($sid);
        $firstUserMsg = '';
        if ($convPath) {
            $conv = aai_read_json($convPath, []);
            foreach (($conv['messages'] ?? []) as $m) {
                if (($m['role'] ?? '') === 'user') {
                    $firstUserMsg = mb_substr((string)($m['content'] ?? ''), 0, 200);
                    break;
                }
            }
        }
        $out[] = [
            'session_id'        => $sid,
            'started_at'        => $meta['started_at'] ?? null,
            'last_activity_at'  => $meta['last_activity_at'] ?? null,
            'status'            => $meta['status'] ?? null,
            'msg_count'         => (int)($meta['msg_count'] ?? 0),
            'has_phone'         => !empty($meta['phone']),
            'phone'             => $meta['phone'] ?? null,
            'phone_trigger'     => $meta['phone_trigger'] ?? null,
            'first_page'        => $meta['first_page'] ?? null,
            'first_user_msg'    => $firstUserMsg,
        ];
        if (count($out) >= $limit) break;
    }
    return ['count' => count($out), 'sessions' => $out];
}

function aai_bot_session_detail(string $sid): array {
    $sid = trim($sid);
    if ($sid === '') return ['error'=>'session_id_required'];
    $path = aai_find_conv_path($sid);
    if (!$path) return ['error'=>'not_found'];
    $conv = aai_read_json($path, []);
    $msgs = [];
    foreach (($conv['messages'] ?? []) as $m) {
        $msgs[] = [
            'role'    => $m['role'] ?? '',
            'content' => mb_substr((string)($m['content'] ?? ''), 0, 4000),
            'ts'      => $m['ts'] ?? null,
        ];
    }
    return [
        'session_id'  => $sid,
        'metadata'    => [
            'started_at'        => $conv['started_at'] ?? null,
            'status'            => $conv['status'] ?? null,
            'phone'             => $conv['phone'] ?? null,
            'phone_trigger'     => $conv['phone_trigger'] ?? null,
            'first_page'        => $conv['first_page'] ?? null,
            'user_agent'        => $conv['user_agent'] ?? null,
            'language'          => $conv['language'] ?? null,
        ],
        'messages'    => $msgs,
        'msg_count'   => count($msgs),
    ];
}

function aai_bot_search_sessions(string $query, int $days, int $limit): array {
    $query = trim($query);
    if (mb_strlen($query) < 2) return ['error'=>'query_too_short'];
    $days = max(1, min(365, $days));
    $limit = max(1, min(30, $limit));
    $needle = mb_strtolower($query);
    $cutoff = strtotime("-$days days");

    $files = glob(AAI_CONV . '/*.json') ?: [];
    rsort($files);
    $hits = [];
    foreach ($files as $path) {
        if (count($hits) >= $limit) break;
        $base = basename($path);
        if (preg_match('/^(\d{4}-\d{2}-\d{2})_/', $base, $m)) {
            if (strtotime($m[1]) < $cutoff) continue;
        }
        $conv = aai_read_json($path, []);
        if (!$conv) continue;
        foreach (($conv['messages'] ?? []) as $msg) {
            if (($msg['role'] ?? '') !== 'user') continue;
            $c = (string)($msg['content'] ?? '');
            if (mb_strpos(mb_strtolower($c), $needle) !== false) {
                $hits[] = [
                    'session_id' => $conv['session_id'] ?? str_replace('.json', '', preg_replace('/^\d{4}-\d{2}-\d{2}_/', '', $base)),
                    'started_at' => $conv['started_at'] ?? null,
                    'phone'      => $conv['phone'] ?? null,
                    'snippet'    => mb_substr($c, 0, 300),
                    'ts'         => $msg['ts'] ?? null,
                ];
                break;
            }
        }
    }
    return ['query'=>$query,'days'=>$days,'count'=>count($hits),'hits'=>$hits];
}

function aai_bot_contacts(int $limit): array {
    $limit = max(1, min(200, $limit));
    $contacts = aai_read_json(AAI_CONTACTS, []);
    uasort($contacts, fn($a,$b) => strcmp($b['last_seen'] ?? '', $a['last_seen'] ?? ''));
    $out = [];
    foreach ($contacts as $phone => $meta) {
        $out[] = [
            'phone'         => $phone,
            'first_seen'    => $meta['first_seen'] ?? null,
            'last_seen'     => $meta['last_seen']  ?? null,
            'session_count' => count($meta['sessions'] ?? []),
            'last_page'     => $meta['last_page']  ?? null,
        ];
        if (count($out) >= $limit) break;
    }
    return ['total' => count($contacts), 'contacts' => $out];
}

function aai_bot_reminders(string $filter, int $limit): array {
    $limit = max(1, min(100, $limit));
    $rem = aai_read_json(AAI_REMIND, []);
    $now = time();
    $todayCutoff = strtotime('tomorrow');
    $out = [];
    foreach ($rem as $id => $r) {
        $due = $r['due_at'] ?? null;
        $done = !empty($r['done']);
        $isOverdue = !$done && $due && strtotime($due) < $now;
        $isDueToday = !$done && $due && strtotime($due) >= $now && strtotime($due) <= $todayCutoff;
        $isUpcoming = !$done && $due && strtotime($due) > $todayCutoff;
        switch ($filter) {
            case 'overdue':   if (!$isOverdue) continue 2; break;
            case 'due_today': if (!$isDueToday) continue 2; break;
            case 'upcoming':  if (!$isUpcoming) continue 2; break;
            case 'done':      if (!$done) continue 2; break;
        }
        $out[] = [
            'id'        => $id,
            'session_id'=> $r['session_id'] ?? null,
            'phone'     => $r['phone'] ?? null,
            'note'      => mb_substr((string)($r['note'] ?? ''), 0, 300),
            'due_at'    => $due,
            'done'      => $done,
        ];
        if (count($out) >= $limit) break;
    }
    return ['filter'=>$filter,'count'=>count($out),'reminders'=>$out];
}

function aai_bot_funnel(int $days): array {
    $o = aai_bot_overview($days);
    $t = $o['totals'];
    $steps = [
        ['name'=>'page_views',       'value'=>$t['page_views']],
        ['name'=>'chat_open',        'value'=>$t['chat_open']],
        ['name'=>'consent_accept',   'value'=>$t['consent_accept']],
        ['name'=>'chat_start',       'value'=>$t['chat_start']],
        ['name'=>'phone_form_shown', 'value'=>$t['phone_form_shown']],
        ['name'=>'phone_submitted',  'value'=>$t['phone_submitted']],
        ['name'=>'whatsapp_click',   'value'=>$t['whatsapp_click']],
    ];
    $pct = fn($n,$d) => $d > 0 ? round($n*100/$d, 2) : 0;
    foreach ($steps as $i => &$s) {
        $s['pct_of_top'] = $pct($s['value'], $steps[0]['value']);
        $s['drop_from_prev_pct'] = $i === 0 ? 0 : $pct($steps[$i-1]['value'] - $s['value'], $steps[$i-1]['value']);
    }
    return ['days'=>$days,'funnel'=>$steps];
}

function _aai_bot_sum_window(int $days, int $offsetDays): array {
    $t = ['page_views'=>0,'chat_start'=>0,'phone_submitted'=>0,'whatsapp_click'=>0,'chat_open'=>0];
    foreach (_aai_bot_iter_days($days, $offsetDays) as $row) {
        if (!$row) continue;
        $t['page_views']      += (int)($row['page_views']['total'] ?? 0);
        $t['chat_open']       += (int)($row['chat_open'] ?? 0);
        $t['chat_start']      += (int)($row['chat_start'] ?? 0);
        $t['phone_submitted'] += (int)($row['phone_submitted'] ?? 0);
        $t['whatsapp_click']  += (int)($row['whatsapp_click'] ?? 0);
    }
    return $t;
}

function aai_bot_compare_periods(int $days): array {
    $days = in_array($days, [7,14,30,90], true) ? $days : 7;
    $cur = _aai_bot_sum_window($days, 0);
    $prev = _aai_bot_sum_window($days, $days);
    $delta = function (int $a, int $b) {
        $abs = $a - $b;
        $pct = $b > 0 ? round(($a - $b) * 100 / $b, 2) : ($a > 0 ? null : 0);
        return ['current'=>$a, 'previous'=>$b, 'delta_abs'=>$abs, 'delta_pct'=>$pct];
    };
    return [
        'window_days'      => $days,
        'page_views'       => $delta($cur['page_views'],      $prev['page_views']),
        'chat_open'        => $delta($cur['chat_open'],       $prev['chat_open']),
        'chat_start'       => $delta($cur['chat_start'],      $prev['chat_start']),
        'phone_submitted'  => $delta($cur['phone_submitted'], $prev['phone_submitted']),
        'whatsapp_click'   => $delta($cur['whatsapp_click'],  $prev['whatsapp_click']),
        'note'             => 'delta_pct null = previous was 0 with current > 0 (new growth)',
    ];
}

function aai_bot_unanswered_sessions(int $days, int $limit): array {
    $days = max(1, min(90, $days));
    $limit = max(1, min(30, $limit));
    $cutoff = strtotime("-$days days");

    $idx = aai_read_json(AAI_INDEX, []);
    $rem = aai_read_json(AAI_REMIND, []);
    $sidWithReminder = [];
    foreach ($rem as $r) {
        if (!empty($r['session_id']) && empty($r['done'])) $sidWithReminder[$r['session_id']] = true;
    }

    uasort($idx, fn($a,$b) => strcmp($b['last_activity_at'] ?? '', $a['last_activity_at'] ?? ''));
    $out = [];
    foreach ($idx as $sid => $meta) {
        if (count($out) >= $limit) break;
        if (!empty($meta['phone'])) continue;
        if (isset($sidWithReminder[$sid])) continue;
        $msgCount = (int)($meta['msg_count'] ?? 0);
        if ($msgCount < 1) continue;
        $last = $meta['last_activity_at'] ?? null;
        if ($last && strtotime($last) < $cutoff) continue;

        $convPath = aai_find_conv_path($sid);
        $firstUserMsg = '';
        if ($convPath) {
            $conv = aai_read_json($convPath, []);
            foreach (($conv['messages'] ?? []) as $m) {
                if (($m['role'] ?? '') === 'user') {
                    $firstUserMsg = mb_substr((string)($m['content'] ?? ''), 0, 200);
                    break;
                }
            }
        }
        $out[] = [
            'session_id'       => $sid,
            'last_activity_at' => $last,
            'msg_count'        => $msgCount,
            'first_page'       => $meta['first_page'] ?? null,
            'first_user_msg'   => $firstUserMsg,
        ];
    }
    return ['days'=>$days, 'count'=>count($out), 'sessions'=>$out];
}

function aai_bot_create_reminder(array $args): array {
    $sid = trim((string)($args['session_id'] ?? ''));
    $phone = trim((string)($args['phone'] ?? ''));
    $dueRaw = trim((string)($args['due_at'] ?? ''));
    $note = aai_clean_text((string)($args['note'] ?? ''), 500);

    if ($sid === '' && $phone === '') return ['error'=>'session_id_or_phone_required'];
    if ($note === '') return ['error'=>'note_required'];
    $due = strtotime($dueRaw);
    if (!$due) return ['error'=>'invalid_due_at','hint'=>'Use +N days, tomorrow HH:MM, or YYYY-MM-DD HH:MM'];
    if ($due < time() - 60) return ['error'=>'due_at_in_past'];

    $id = 'r' . bin2hex(random_bytes(6));
    aai_atomic_update(AAI_REMIND, function ($cur) use ($id, $sid, $phone, $due, $note) {
        if (!is_array($cur)) $cur = [];
        $cur[] = [
            'id'         => $id,
            'session_id' => $sid ?: null,
            'phone'      => $phone ?: null,
            'due_at'     => date('c', $due),
            'note'       => $note,
            'done'       => false,
            'created_at' => aai_now_iso(),
            'created_by' => 'ai_bot',
        ];
        return $cur;
    }, []);

    return ['ok'=>true, 'id'=>$id, 'due_at'=>date('c', $due), 'note'=>$note];
}
