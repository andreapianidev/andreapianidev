<?php
/**
 * Admin AI analyst bot endpoint.
 *
 * POST JSON:
 *   { "action": "ask",   "message": "...", "csrf": "..." }
 *   { "action": "reset", "csrf": "..." }
 *   { "action": "history" }
 *
 * Responses:
 *   ask    -> { reply, tool_trace[], history }
 *   reset  -> { ok: true }
 *   history-> { history }
 *
 * History persisted on disk per admin user: data/admin-bot/<username>.json
 */

require_once __DIR__ . '/../../lib/storage.php';
require_once __DIR__ . '/../../lib/util.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/deepseek.php';
require_once __DIR__ . '/../lib/bot-tools.php';

aai_admin_require();

const AAI_BOT_MAX_TURNS      = 20;       // user+assistant pairs kept on disk
const AAI_BOT_MAX_TOOL_LOOPS = 6;        // safety cap on tool-call iterations
const AAI_BOT_MAX_INPUT_LEN  = 4000;

$user = $_SESSION['aai_user'] ?? '';
if (!$user) aai_json(['error'=>'no_user'], 401);

$historyFile = AAI_BOT_DIR . '/' . preg_replace('/[^a-z0-9_\-]/i', '_', $user) . '.json';

$body   = aai_read_body();
$action = $body['action'] ?? 'ask';

if ($action === 'history') {
    $h = aai_read_json($historyFile, []);
    aai_json(['history' => $h['messages'] ?? []]);
}

if (!aai_admin_csrf_check($body['csrf'] ?? null)) {
    aai_json(['error'=>'csrf_failed'], 403);
}

if ($action === 'reset') {
    aai_atomic_update($historyFile, fn($_) => ['messages' => [], 'updated_at' => aai_now_iso()], []);
    aai_json(['ok' => true]);
}

if ($action !== 'ask') aai_json(['error'=>'bad_action'], 400);

$msg = aai_clean_text((string)($body['message'] ?? ''), AAI_BOT_MAX_INPUT_LEN);
if ($msg === '') aai_json(['error'=>'empty_message'], 400);

$store = aai_read_json($historyFile, []);
$past  = is_array($store['messages'] ?? null) ? $store['messages'] : [];

// Build OpenAI-format message stream: system + visible history + new user msg.
$systemPrompt = aai_bot_system_prompt();
$messages = [['role'=>'system', 'content'=>$systemPrompt]];
foreach ($past as $m) {
    if (in_array($m['role'] ?? '', ['user','assistant'], true) && !empty($m['content'])) {
        $messages[] = ['role'=>$m['role'], 'content'=>(string)$m['content']];
    }
}
$messages[] = ['role'=>'user', 'content'=>$msg];

$tools = aai_bot_tool_schemas();
$toolTrace = [];

try {
    for ($loop = 0; $loop < AAI_BOT_MAX_TOOL_LOOPS; $loop++) {
        $resp = aai_deepseek_chat($messages, $tools, ['temperature'=>0.2,'max_tokens'=>2048]);
        $choice = $resp['choices'][0] ?? null;
        if (!$choice) throw new RuntimeException('empty_response');

        $assistantMsg = $choice['message'] ?? [];
        $toolCalls = $assistantMsg['tool_calls'] ?? null;

        if (is_array($toolCalls) && !empty($toolCalls)) {
            // Append the assistant message verbatim (must include tool_calls for protocol)
            $messages[] = [
                'role'       => 'assistant',
                'content'    => $assistantMsg['content'] ?? '',
                'tool_calls' => $toolCalls,
            ];
            foreach ($toolCalls as $tc) {
                $fn   = $tc['function']['name'] ?? '';
                $args = json_decode((string)($tc['function']['arguments'] ?? '{}'), true);
                if (!is_array($args)) $args = [];
                $result = aai_bot_dispatch_tool($fn, $args);
                $toolTrace[] = ['tool'=>$fn,'args'=>$args,'result_preview'=>aai_bot_preview($result)];
                $messages[] = [
                    'role'         => 'tool',
                    'tool_call_id' => $tc['id'] ?? '',
                    'name'         => $fn,
                    'content'      => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }
            continue;
        }

        // Final assistant text reply.
        $reply = (string)($assistantMsg['content'] ?? '');
        $now = aai_now_iso();
        $past[] = ['role'=>'user',     'content'=>$msg,   'ts'=>$now];
        $past[] = ['role'=>'assistant','content'=>$reply, 'ts'=>$now, 'tool_trace'=>$toolTrace];

        // Trim history to AAI_BOT_MAX_TURNS pairs.
        if (count($past) > AAI_BOT_MAX_TURNS * 2) {
            $past = array_slice($past, -AAI_BOT_MAX_TURNS * 2);
        }
        aai_atomic_update($historyFile, fn($_) => ['messages'=>$past,'updated_at'=>$now], []);
        aai_json([
            'reply'      => $reply,
            'tool_trace' => $toolTrace,
            'history'    => $past,
        ]);
    }
    aai_json(['error'=>'tool_loop_exceeded','tool_trace'=>$toolTrace], 500);
} catch (Throwable $e) {
    error_log('[ask-bot] ' . $e->getMessage());
    aai_json(['error'=>'bot_error','message'=>$e->getMessage()], 500);
}

/* ---------- Helpers ---------- */

function aai_bot_preview($data, int $maxChars = 600): string {
    $j = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($j === false) return '';
    return mb_strlen($j) > $maxChars ? mb_substr($j, 0, $maxChars) . '…' : $j;
}

function aai_bot_system_prompt(): string {
    $today = gmdate('Y-m-d');
    $snapshot = aai_bot_snapshot_block();
    return <<<PROMPT
Sei l'AI Analyst del pannello admin di Andrea Piani (sviluppatore freelance, andreapiani.com). Parli italiano in modo professionale, conciso, diretto. Tu non sei un chatbot di marketing: sei uno strumento interno che aiuta Andrea a leggere i dati del suo sito e della chat widget.

Data odierna: {$today} (Europe/Rome).

{$snapshot}

REGOLE:
1. Usa SEMPRE le tool functions per recuperare dati reali. NON inventare numeri. NON stimare a vuoto. Se non hai dati, dillo.
2. Lo SNAPSHOT qui sopra è già caricato: per domande generiche su 7gg puoi rispondere senza ulteriori chiamate. Per finestre diverse o dettagli, chiama le tool.
3. Quando l'utente chiede una metrica, identifica la finestra temporale (default 30gg se non specificato), chiama la tool, poi commenta in 2-5 frasi con interpretazione utile.
4. Per "report settimanale" o "andamento" chiama compare_periods (delta vs periodo precedente) + get_trend in parallelo.
5. Per recupero lead: get_unanswered_sessions trova chat senza telefono e senza promemoria. Se utente conferma, usa create_reminder (richiede session_id o phone, due_at relativo tipo "+2 days", e una nota).
6. Cita sempre numeri reali. Mostra tassi di conversione dove rilevanti.
7. Per conversazioni specifiche: get_session_detail; per ricerca per argomento: search_sessions.
8. Output asciutto: niente markdown pesante, niente tabelle complesse, paragrafi corti. Liste brevi solo se servono.
9. Segnala anomalie (drop, spike, conversion bassa) proattivamente con ipotesi plausibili. Quando dai una valutazione qualitativa ("va male/bene"), chiama compare_periods PRIMA per dare contesto delta vs periodo precedente — niente giudizi senza confronto.
12. Ogni metrica citata indica la finestra esplicita (es. "127 visite negli ultimi 7gg", non "127 visite"). Se hai usato compare_periods, mostra anche il delta (es. "+18% vs settimana prima").
13. Numeri italiani: usa punto come separatore migliaia (1.234, non 1234), virgola per decimali. Sotto 1000 nessun separatore.
10. Telefoni: mostra completi solo se l'admin lo chiede esplicitamente per quel contatto. In riepiloghi multipli puoi mascherare le ultime cifre (es. +393****8936) per ridurre rischio screenshot.
11. Azioni che scrivono dati (create_reminder): conferma sempre cosa stai per creare PRIMA di chiamare il tool, a meno che la richiesta non sia già esplicita ("crea promemoria per X tra 2 giorni con nota Y").

CONTESTO BUSINESS:
- Sito statico HTML su andreapiani.com, target principale Italia.
- Servizi: app iOS/Android, Python, CRM, PrestaShop, web app React.
- Funnel: visita pagina → apre chat widget → accetta consenso → primo messaggio → invia telefono → click WhatsApp.
- Lead reali = telefoni raccolti + click WhatsApp. Chat aperte senza azione contano poco.

Rispondi sempre in italiano salvo richiesta diversa.
PROMPT;
}

/** Pre-computed 7-day snapshot to avoid wasting the first tool call on trivial questions. */
function aai_bot_snapshot_block(): string {
    try {
        $o = aai_bot_overview(7);
        $t = $o['totals'];
        $r = $o['rates_pct'];
        return "SNAPSHOT ULTIMI 7 GIORNI (già aggregato):\n"
             . "- visite: {$t['page_views']} (visitatori unici approx: {$t['unique_visitors']})\n"
             . "- chat aperte: {$t['chat_open']} | avviate: {$t['chat_start']} | telefoni: {$t['phone_submitted']} | click WA: {$t['whatsapp_click']}\n"
             . "- conv rates: chat/visita {$r['chat_open_from_views']}% | tel/start {$r['phone_from_start']}% | mobile {$r['mobile_share']}%";
    } catch (Throwable $e) {
        return "SNAPSHOT non disponibile (errore lettura stats).";
    }
}
