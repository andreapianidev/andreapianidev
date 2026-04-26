<?php
require_once __DIR__ . '/../lib/auth.php';
aai_admin_session_start();
header('Cache-Control: no-store');
if (empty($_SESSION['aai_user'])) {
    http_response_code(401);
    exit;
}
$_SESSION['_last_ping'] = time();
http_response_code(204);
