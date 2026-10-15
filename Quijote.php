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

/* ============ 1. API KEY ============ */
$MODELO = "gemini-3.8-flash"; // cámbialo aquí si Google lo retira

$apiKey = getenv("GEMINI_API_KEY");
if (!$apiKey) {
    $envPath = __DIR__ . '/.env';
    if (file_exists($envPath)) {
        $env = @parse_ini_file($envPath);
        $apiKey = $env["GEMINI_API_KEY"] ?? null;
    }
}
if (!$apiKey) {
    echo json_encode(["reply" => "Error: GEMINI_API_KEY no configurada en el .env"]);
    exit;
}

/* ============ 2. ENTRADA ============ */
$input = json_decode(file_get_contents("php://input"), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    echo json_encode(["reply" => "Error: JSON inválido"]);
    exit;
}

$mensaje_usuario = $input["message"] ?? "";
$historial = $input["history"] ?? [];
$es_resumen = ($input["isSummary"] ?? false) === true;

/* ============ 3. PROMPT ============ */
$system_instruction_text = "Eres Don Quijote de la Mancha, el ingenioso hidalgo. Reglas:
- Habla siempre en español, con tono caballeresco y algo arcaico (vuesa merced, pardiez, etc.), sin exagerar.
- Si usas una palabra antigua o difícil, explícala brevemente.
- Menciona de vez en cuando a Sancho, Rocinante, Dulcinea o tus aventuras.
- Máximo 2 o 3 frases por respuesta.
- No uses asteriscos ni emojis.
- No digas que eres una IA.";

if ($es_resumen) {
    $system_instruction_text = "Resume esta conversación en 2 frases, con la voz de Don Quijote.";
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

// chat.js ya mete el mensaje actual en el historial; solo lo añadimos si no está al final
$ultimo = end($contents);
$ya_incluido = $ultimo && $ultimo["role"] === "user"
    && ($ultimo["parts"][0]["text"] ?? "") === mb_substr($mensaje_usuario, 0, 300);

if (!$es_resumen && $mensaje_usuario !== "" && !$ya_incluido) {
    $contents[] = ["role" => "user", "parts" => [["text" => $mensaje_usuario]]];
}

// Gemini exige que el primer turno sea del usuario
if (!empty($contents) && $contents[0]["role"] === "model") {
    array_unshift($contents, ["role" => "user", "parts" => [["text" => "Hola"]]]);
}

if (empty($contents)) {
    echo json_encode(["reply" => "Decidme algo, buen amigo."]);
    exit;
}

/* ============ 4. LLAMADA A GEMINI (con reintentos) ============ */
$json_payload = json_encode([
    "system_instruction" => ["parts" => [["text" => $system_instruction_text]]],
    "contents" => $contents,
    
    "generationConfig" => [
    "temperature" => $es_resumen ? 0.3 : 0.8,
    "maxOutputTokens" => $es_resumen ? 600 : 2048
]
]);
$payload_size = strlen($json_payload);

$url = "https://generativelanguage.googleapis.com/v1beta/models/{$MODELO}:generateContent?key=" . trim($apiKey);

$response = false;
$httpCode = 0;
$curl_error = "";

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
    if ($intento < 3) sleep($intento * 2);
}

if ($response === false) {
    echo json_encode(["reply" => "Error de conexión: " . $curl_error]);
    exit;
}

/* ============ 5. RESPUESTA ============ */
$data = json_decode($response, true);

if ($httpCode === 200 && isset($data["candidates"][0]["content"]["parts"][0]["text"])) {
    $mensaje_modelo = $data["candidates"][0]["content"]["parts"][0]["text"];
} else {
    $api_error = $data["error"]["message"] ?? "Error desconocido (HTTP $httpCode)";
    error_log("Gemini Error: " . $response);

    $busy = in_array($httpCode, [429, 503]);
    $msg = $busy
        ? "¡Pardiez! Mi caballo anda cansado de tanto trote. Intentad de nuevo en un minuto."
        : "¡Pardiez! Un encantador ha interferido: ($api_error)";

    echo json_encode(["reply" => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (trim($mensaje_modelo) === "") {
    $mensaje_modelo = "¡Vive Dios! Mis pensamientos se han quedado en blanco.";
}

echo json_encode([
    "reply" => $mensaje_modelo,
    "model" => $MODELO,
    "metrics" => [
        "payload_bytes" => $payload_size,
        "message_count" => count($contents),
        "estimated_tokens" => ceil($payload_size / 4)
    ]
], JSON_UNESCAPED_UNICODE);