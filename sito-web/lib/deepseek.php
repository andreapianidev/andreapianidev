<?php
/**
 * DeepSeek API client (OpenAI-compatible).
 *
 * Used by admin AI analyst bot. Key resolution order:
 *   1. AAI_DEEPSEEK_KEY env var (set in .htaccess via SetEnv)
 *   2. Deobfuscated from chat-widget.js (XOR + base64) — same key as frontend
 *
 * Approach 2 keeps a single source-of-truth: rotate key in chat-widget.js
 * obfuscated payload and both frontend + admin bot pick it up automatically.
 */

require_once __DIR__ . '/config.php';

const AAI_DS_API_URL = 'https://api.deepseek.com/chat/completions';
const AAI_DS_MODEL   = 'deepseek-chat';
const AAI_DS_TIMEOUT = 90;

function aai_deepseek_key(): string {
    static $cached = null;
    if ($cached !== null) return $cached;

    $env = getenv('AAI_DEEPSEEK_KEY');
    if ($env && str_starts_with($env, 'sk-')) return $cached = $env;

    // Fallback: deobfuscate from chat-widget.js
    $jsPath = AAI_ROOT . '/assets/js/chat-widget.js';
    if (file_exists($jsPath)) {
        $js = file_get_contents($jsPath);
        if ($js && preg_match("/const\s+_p\s*=\s*\[([^\]]+)\]/", $js, $mp)
                && preg_match("/const\s+_s\s*=\s*\[([^\]]+)\]/", $js, $ms)) {
            $chunks = [];
            if (preg_match_all("/'([^']+)'/", $mp[1], $cm)) $chunks = $cm[1];
            $seedParts = [];
            if (preg_match_all("/'([^']+)'/", $ms[1], $sm)) $seedParts = $sm[1];
            $enc = base64_decode(implode('', $chunks), true);
            $seed = implode('', $seedParts);
            if ($enc !== false && $seed !== '') {
                $out = '';
                $sl = strlen($seed);
                for ($i = 0, $n = strlen($enc); $i < $n; $i++) {
                    $out .= chr(ord($enc[$i]) ^ ord($seed[$i % $sl]));
                }
                if (str_starts_with($out, 'sk-')) return $cached = $out;
            }
        }
    }
    return $cached = '';
}

/**
 * Call DeepSeek chat completions.
 * $messages: OpenAI-compat array of {role, content, [tool_calls], [tool_call_id], [name]}.
 * $tools: optional array of tool definitions.
 * Returns decoded API response or throws RuntimeException.
 */
function aai_deepseek_chat(array $messages, array $tools = [], array $opts = []): array {
    $key = aai_deepseek_key();
    if (!$key) throw new RuntimeException('DeepSeek API key not configured');

    $payload = [
        'model'       => $opts['model']       ?? AAI_DS_MODEL,
        'messages'    => $messages,
        'temperature' => $opts['temperature'] ?? 0.3,
        'max_tokens'  => $opts['max_tokens']  ?? 2048,
    ];
    if (!empty($tools)) {
        $payload['tools'] = $tools;
        $payload['tool_choice'] = $opts['tool_choice'] ?? 'auto';
    }
    if (!empty($opts['response_format'])) {
        $payload['response_format'] = $opts['response_format'];
    }

    $ch = curl_init(AAI_DS_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT        => AAI_DS_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $body = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($body === false) throw new RuntimeException('DeepSeek curl error: ' . $err);
    $data = json_decode($body, true);
    if (!is_array($data)) throw new RuntimeException('DeepSeek invalid response (HTTP ' . $http . ')');
    if ($http >= 400) {
        $msg = $data['error']['message'] ?? ('HTTP ' . $http);
        throw new RuntimeException('DeepSeek error: ' . $msg);
    }
    return $data;
}
