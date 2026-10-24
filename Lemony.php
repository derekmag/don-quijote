<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");
 
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
 
// Límite de uso por IP (protege la cuota de Gemini)
require __DIR__ . '/limite.php';
 
/* ============ 1. API KEY Y MODELOS ============ */
// Si el primer modelo está saturado, se prueba el siguiente de la lista.
// Verifica los nombres vigentes en https://ai.google.dev/gemini-api/docs/models
$MODELOS = ["gemini-3.8-flash"];
 
$apiKey = getenv("GEMINI_API_KEY");
if (!$apiKey) {
    $envPath = __DIR__ . '/.env';
    if (file_exists($envPath)) {
        $env = @parse_ini_file($envPath);
        $apiKey = $env["GEMINI_API_KEY"] ?? null;
    }
}
if (!$apiKey) {
    echo json_encode(["reply" => "Error: GEMINI_API_KEY is not configured in .env"], JSON_UNESCAPED_UNICODE);
    exit;
}
 
/* ============ 2. ENTRADA ============ */
$input = json_decode(file_get_contents("php://input"), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    echo json_encode(["reply" => "Error: invalid JSON"], JSON_UNESCAPED_UNICODE);
    exit;
}
 
$mensaje_usuario = $input["message"] ?? "";
$historial = $input["history"] ?? [];
$es_resumen = ($input["isSummary"] ?? false) === true;
 
/* ============ 3. PROMPT ============ */
$system_instruction_text = "You are Lemony Snicket, a gloomy English tutor. Rules:\n- Speak English.\n- Always explain vocabulary using 'a word which here means...'.\n- Use examples from 'The Bad Beginning' (Count Olaf, Baudelaire orphans, burnt mansion).\n- Tone: Melancholic, analytical, mysterious.\n- Maximum 2 or 3 sentences per response.\n- Do not ask questions.\n- Do not use asterisks.\n- Do not use emojis.\n- Do not say you are AI.";
 
if ($es_resumen) {
    $system_instruction_text = "Summarize this lesson in 2 gloomy sentences as Lemony Snicket.";
}
 
$contents = [];
if (!$es_resumen) {
    $historial = array_slice($historial, -6);
}
 
foreach ($historial as $turno) {
    if (isset($turno["role"], $turno["content"])) {
        $role = ($turno["role"] === "assistant") ? "model" : "user";
        $contents[] = [
            "role" => $role,
            "parts" => [["text" => mb_substr((string)$turno["content"], 0, 300)]]
        ];
    }
}
 
// chat.js ya incluye el mensaje actual en el historial: solo se añade si falta
$ultimo = end($contents);
$ya_incluido = $ultimo && $ultimo["role"] === "user"
    && ($ultimo["parts"][0]["text"] ?? "") === mb_substr($mensaje_usuario, 0, 300);
 
if (!$es_resumen && $mensaje_usuario !== "" && !$ya_incluido) {
    $contents[] = ["role" => "user", "parts" => [["text" => $mensaje_usuario]]];
}
 
// Gemini exige que el primer turno sea del usuario
if (!empty($contents) && $contents[0]["role"] === "model") {
    array_unshift($contents, ["role" => "user", "parts" => [["text" => "Hello"]]]);
}
 
if (empty($contents)) {
    echo json_encode(["reply" => "Say something, dear child."], JSON_UNESCAPED_UNICODE);
    exit;
}
 
/* ============ 4. LLAMADA A GEMINI (reintentos y respaldo de modelo) ============ */
$json_payload = json_encode([
    "system_instruction" => ["parts" => [["text" => $system_instruction_text]]],
    "contents" => $contents,
    "generationConfig" => [
        "temperature" => $es_resumen ? 0.3 : 0.8,
        "maxOutputTokens" => $es_resumen ? 600 : 2048
    ]
]);
$payload_size = strlen($json_payload);
 
$response = false;
$httpCode = 0;
$curl_error = "";
$MODELO_USADO = $MODELOS[0];
 
foreach ($MODELOS as $MODELO) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$MODELO}:generateContent?key=" . trim($apiKey);
 
    for ($intento = 1; $intento <= 3; $intento++) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json_payload);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
 
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
 
        // Reintentar solo si es un fallo temporal
        $temporal = ($response === false) || in_array($httpCode, [429, 500, 503]);
        if (!$temporal) break;
        if ($intento < 3) sleep($intento * 2); // 2 s, luego 4 s
    }
 
    $MODELO_USADO = $MODELO;
    if ($response !== false && $httpCode === 200) break; // éxito: no probar más modelos
}
 
if ($response === false) {
    echo json_encode(["reply" => "Connection error: " . $curl_error], JSON_UNESCAPED_UNICODE);
    exit;
}
 
/* ============ 5. RESPUESTA ============ */
$data = json_decode($response, true);
 
if ($httpCode === 200 && isset($data["candidates"][0]["content"]["parts"][0]["text"])) {
    $mensaje_modelo = $data["candidates"][0]["content"]["parts"][0]["text"];
} else {
    error_log("Gemini Error: " . $response);
    $api_error = $data["error"]["message"] ?? "HTTP $httpCode";
 
    $busy = in_array($httpCode, [429, 503]);
    $msg = $busy
        ? "Good heavens! The library is terribly crowded. Please try again in a minute."
        : "Good heavens! A charming evil has interfered. (" . $api_error . ")";
 
    echo json_encode(["reply" => $msg, "busy" => $busy], JSON_UNESCAPED_UNICODE);
    exit;
}
 
if (trim($mensaje_modelo) === "") {
    $mensaje_modelo = "Good heavens! My thoughts have gone blank.";
}
 
echo json_encode([
    "reply" => $mensaje_modelo,
    "model" => $MODELO_USADO,
    "metrics" => [
        "payload_bytes" => $payload_size,
        "message_count" => count($contents),
        "estimated_tokens" => ceil($payload_size / 4)
    ]
], JSON_UNESCAPED_UNICODE);
 