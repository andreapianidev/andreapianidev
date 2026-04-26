<?php
/**
 * Central configuration for Andrea AI chat backend.
 *
 * SECURITY: review this file before deploying to production.
 * The IP_SALT must be a long random string and must NEVER be regenerated
 * (or all anti-spam history will reset). Generate once with:
 *   php -r "echo bin2hex(random_bytes(32));"
 */

// Absolute paths
define('AAI_ROOT',     dirname(__DIR__));
define('AAI_DATA',     AAI_ROOT . '/data');
define('AAI_CONV',     AAI_DATA . '/conversations');
define('AAI_STATS',    AAI_DATA . '/stats');
define('AAI_LOCKS',    AAI_DATA . '/locks');
define('AAI_AUTH',     AAI_DATA . '/auth');
define('AAI_EVENTS',   AAI_STATS . '/events.jsonl');
define('AAI_INDEX',    AAI_DATA . '/index.json');
define('AAI_CONTACTS', AAI_DATA . '/contacts.json');
define('AAI_REMIND',   AAI_DATA . '/reminders.json');
define('AAI_USERS',    AAI_AUTH . '/users.json');
define('AAI_LOGINS',   AAI_AUTH . '/login_attempts.json');
define('AAI_BOT_DIR',  AAI_DATA . '/admin-bot');

// Allowed origin for widget API (write endpoints)
define('AAI_ALLOWED_ORIGIN', 'https://www.andreapiani.com');

// Salt for IP hashing — REPLACE with random 64-hex string before deploy
define('AAI_IP_SALT', getenv('AAI_IP_SALT') ?: 'CHANGE-ME-RANDOM-64HEX');

// Retention windows
define('AAI_CONV_RETENTION_DAYS',   365);
define('AAI_EVENTS_RETENTION_DAYS', 90);

// Rate limits (per minute)
define('AAI_RL_MSGS_PER_SESSION', 30);
define('AAI_RL_NEW_SESSIONS_PER_IP', 10);

// Login throttling
define('AAI_LOGIN_MAX_ATTEMPTS', 5);
define('AAI_LOGIN_WINDOW_SEC', 900);

// Phone validation regex (permissive: optional +, 8-15 digits, allows spaces)
define('AAI_PHONE_REGEX', '/^\+?\d[\d\s]{7,14}$/');

// Cron purge token — set as env var or replace inline
define('AAI_CRON_TOKEN', getenv('AAI_CRON_TOKEN') ?: 'CHANGE-ME-CRON-TOKEN');

// Timezone
date_default_timezone_set('Europe/Rome');

// Strict error handling for API contexts
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', AAI_DATA . '/error.log');
