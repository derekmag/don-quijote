
<?php
header('Content-Type: application/json; charset=utf-8');
 
/* Quita tildes y pasa a minúsculas para comparar ("rocin" = "rocín") */
function normalizar($t) {
    $t = mb_strtolower(trim($t), 'UTF-8');
    return strtr($t, [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
        'ü' => 'u', 'ñ' => 'n'
    ]);
}
 
$lang = (($_GET['lang'] ?? 'es') === 'en') ? 'en' : 'es';
$palabra = mb_substr(trim($_GET['palabra'] ?? ''), 0, 50, 'UTF-8');
 
$archivo = __DIR__ . '/glosario.json';
$glosario = is_file($archivo) ? json_decode(file_get_contents($archivo), true) : null;
 
if (!is_array($glosario)) {
    echo json_encode(["significado" => $lang === 'en' ? "The glossary is unavailable." : "El glosario no está disponible."], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lista de palabras (para resaltarlas en el texto)
if (isset($_GET['lista'])) {
    echo json_encode(array_keys($glosario), JSON_UNESCAPED_UNICODE);
    exit;
}
 
// Índice: palabra normalizada => palabra original
$indice = [];
foreach ($glosario as $clave => $defs) {
    $indice[normalizar($clave)] = $clave;
}
 
$buscada = normalizar($palabra);
 
if ($buscada !== '' && isset($indice[$buscada])) {
    $original = $indice[$buscada];
    echo json_encode(["significado" => $glosario[$original][$lang], "palabra" => $original], JSON_UNESCAPED_UNICODE);
    exit;
}
 
// No se encontró: sugerir palabras parecidas
$sugerencias = [];
if ($buscada !== '') {
    $maxDist = strlen($buscada) > 6 ? 3 : 2;
    foreach ($indice as $norm => $original) {
        $d = levenshtein($buscada, $norm);
        if ($d <= $maxDist) $sugerencias[$original] = $d;
    }
    asort($sugerencias);
    $sugerencias = array_slice(array_keys($sugerencias), 0, 3);
}
 
if ($lang === 'en') {
    $msg = "Sorry, the term '$palabra' is not in this glossary.";
    if ($sugerencias) $msg .= " Did you mean: " . implode(', ', $sugerencias) . "?";
} else {
    $msg = "Lo siento, el término '$palabra' no se encuentra registrado en este glosario.";
    if ($sugerencias) $msg .= " ¿Quisiste decir: " . implode(', ', $sugerencias) . "?";
}
 
echo json_encode(["significado" => $msg], JSON_UNESCAPED_UNICODE);