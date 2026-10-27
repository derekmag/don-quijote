<?php
/* Límite simple de uso por IP, para proteger la cuota de Gemini.
   Se incluye desde Quijote.php y Lemony.php. */
$LIMITE_MAX = 30;       // peticiones permitidas
$LIMITE_VENTANA = 600;  // en esta cantidad de segundos (10 minutos)

$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$archivoLimite = sys_get_temp_dir() . '/quijote_rate_' . md5($ip) . '.json';
$ahora = time();

$marcas = [];
if (is_file($archivoLimite)) {
    $marcas = json_decode(@file_get_contents($archivoLimite), true) ?: [];
}
$marcas = array_values(array_filter($marcas, fn($t) => $t > $ahora - $LIMITE_VENTANA));

if (count($marcas) >= $LIMITE_MAX) {
    $esIngles = basename($_SERVER['SCRIPT_NAME'] ?? '') === 'Lemony.php';
    echo json_encode([
        "reply" => $esIngles
            ? "Good heavens! You have asked too many questions. Please wait a few minutes."
            : "¡Pardiez! Habéis hecho demasiadas preguntas. Esperad unos minutos.",
        "limited" => true
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$marcas[] = $ahora;
@file_put_contents($archivoLimite, json_encode($marcas), LOCK_EX);