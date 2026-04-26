<?php
/**
 * One-time setup script.
 *
 * USAGE (from server SSH):
 *   php lib/setup.php <username> <password>
 *
 * Creates data/auth/users.json with one admin and a fresh api_token.
 * Generates AAI_IP_SALT and AAI_CRON_TOKEN if not already set in .env.
 *
 * Re-running rotates the api_token but keeps the user (password unchanged).
 * To change password: delete data/auth/users.json and run again.
 */

if (php_sapi_name() !== 'cli') { fwrite(STDERR, "CLI only.\n"); exit(1); }

require_once __DIR__ . '/storage.php';

$argv = $_SERVER['argv'];
if (count($argv) < 3) { fwrite(STDERR, "Usage: php lib/setup.php <username> <password>\n"); exit(1); }
[, $user, $pass] = $argv;

if (strlen($pass) < 12) { fwrite(STDERR, "Password too short (min 12).\n"); exit(1); }

$users = aai_read_json(AAI_USERS, []);
$found = false;
foreach ($users as &$u) {
    if (($u['username'] ?? '') === $user) {
        $u['api_token'] = bin2hex(random_bytes(32));
        $u['updated_at'] = date('c');
        $found = true;
        break;
    }
}
unset($u);

if (!$found) {
    $users[] = [
        'username'      => $user,
        'password_hash' => password_hash($pass, PASSWORD_ARGON2ID),
        'api_token'     => bin2hex(random_bytes(32)),
        'created_at'    => date('c'),
    ];
}

aai_atomic_update(AAI_USERS, fn() => $users);
@chmod(AAI_USERS, 0600);

echo "OK: user '$user' saved.\n";
foreach ($users as $u) {
    if ($u['username'] === $user) {
        echo "API token: " . $u['api_token'] . "\n";
        echo "(Use this token for the Vercel stats dashboard, env var PHP_API_TOKEN)\n";
    }
}
echo "\nReminder: set AAI_IP_SALT (32 random bytes hex) in your environment:\n";
echo "  AAI_IP_SALT=" . bin2hex(random_bytes(32)) . "\n";
echo "And AAI_CRON_TOKEN for the purge endpoint:\n";
echo "  AAI_CRON_TOKEN=" . bin2hex(random_bytes(24)) . "\n";
