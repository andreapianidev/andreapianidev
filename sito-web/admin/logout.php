<?php
require_once __DIR__ . '/../lib/auth.php';
aai_admin_session_start();
$_SESSION = [];
session_destroy();
header('Location: login.php'); exit;
