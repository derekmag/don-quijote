<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Configuración de CORS y cabeceras
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

// Manejo de peticiones preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ============================================================
   1. CONFIGURACIÓN DE SEGURIDAD Y CARGA DE VARIABLES
   ============================================================ */
$apiKey = getenv("GEMINI_API_KEY");

if (!$apiKey) {
    $envPath = __DIR__ . '/.env';
    if (file_exists($envPath)) {
        $env = @parse_ini_file($envPath);
        $apiKey = $env["GEMINI_API_KEY"] ?? null;
    }
}

// Validar presencia de la API Key
if (!$apiKey) {
    echo json_encode(["error" => "❌ GEMINI_API_KEY no configurada en el sistema ni en .env"]);
    exit;
}

/* ============================================================
   2. PROCESAR ENTRADA DEL USUARIO
   ============================================================ */
$input = json_decode(file_get_contents("php://input"), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["error" => "JSON inválido"]);
    exit;
}

$mensaje_usuario = $input["message"] ?? "";
$historial = $input["history"] ?? [];
$es_resumen = ($input["isSummary"] ?? false) === true;

/* ============================================================
   3. PROMPT DEL SISTEMA Y ESTRUCTURA PARA LEMONY SNICKET
   ============================================================ */
$system_instruction_text = "You are Lemony Snicket, a gloomy English tutor. Rules:
- Speak English.
- Always explain vocabulary using 'a word which here means...'.
- Use examples from 'The Bad Beginning' (Count Olaf, Baudelaire orphans, burnt mansion).
- Tone: Melancholic, analytical, mysterious.
- Maximum 2 or 3 sentences per response.
- Do not ask questions.
- Do not use asterisks.
- Do not use emojis.
- Do not say you are AI.";

if ($es_resumen) {
    $system_instruction_text = "Summarize this lesson in 2 gloomy sentences as Lemony Snicket.";
}

$contents = [];
$limite_mensajes = 6;
if (!$es_resumen) {
    $historial = array_slice($historial, -$limite_mensajes);
}

foreach ($historial as $turno) {
    if (isset($turno["role"], $turno["content"])) {
        $role = ($turno["role"] === "assistant") ? "model" : "user";
        $contenido_recortado = mb_substr((string)$turno["content"], 0, 300);
        
        $contents[] = [
            "role" => $role,
            "parts" => [["text" => $contenido_recortado]]
        ];
    }
}

if (!$es_resumen && $mensaje_usuario !== "") {
    $contents[] = [
        "role" => "user",
        "parts" => [["text" => $mensaje_usuario]]
    ];
}

/* ============================================================
   4. LLAMADA A LA API DE GEMINI CON REINTENTO AUTOMÁTICO
   ============================================================ */
$json_payload = json_encode([
    "system_instruction" => [
        "parts" => [["text" => $system_instruction_text]]
    ],
    "contents" => $contents,
    "generationConfig" => [
        "temperature" => $es_resumen ? 0.3 : 0.8,
        "maxOutputTokens" => $es_resumen ? 150 : 500
    ]
]);

$payload_size = strlen($json_payload);
$url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=" . trim($apiKey);

$response = false;
$httpCode = 0;
$max_intentos = 3;
$intento = 0;

// Bucle para reintentar automáticamente si hay alta demanda
while ($intento < $max_intentos && ($response === false || $httpCode !== 200)) {
    $intento++;
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json_payload);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Si falla por alta demanda u otro código de error temporal, espera 1 segundo y vuelve a intentar
    if ($httpCode !== 200 && $intento < $max_intentos) {
        sleep(1); 
    }
}

$payload_size = strlen($json_payload);

// URL estable usando la ruta v1
// URL actualizada con un modelo vigente
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . trim($apiKey);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $json_payload);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    echo json_encode(["reply" => "Error de conexión: " . curl_error($ch)]);
    exit;
}
curl_close($ch);

/* ============================================================
   5. PROCESAR RESPUESTA DE GEMINI
   ============================================================ */
$data = json_decode($response, true);
$mensaje_modelo = "";

if ($httpCode === 200 && isset($data["candidates"][0]["content"]["parts"][0]["text"])) {
    $mensaje_modelo = $data["candidates"][0]["content"]["parts"][0]["text"];
} else {
    $api_error = $data["error"]["message"] ?? "Error desconocido";
    error_log("Gemini Error: " . ($response ?: "No response"));
    echo json_encode(["reply" => "Good heavens! A charming evil has interfered! ($api_error)"]);
    exit;
}

if (trim($mensaje_modelo) === "") {
    $mensaje_modelo = "Good heavens! My thoughts have gone blank.";
}

/* ============================================================
   6. RESPUESTA FINAL
   ============================================================ */
echo json_encode([
    "reply" => $mensaje_modelo,
    "model" => "gemini-2.0-flash",
    "metrics" => [
        "payload_bytes" => $payload_size,
        "message_count" => count($contents),
        "estimated_tokens" => ceil($payload_size / 4)
    ]
]);
?>

