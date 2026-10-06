<?php
header('Content-Type: application/json; charset=utf-8');

// Recibir la palabra por GET o por POST (JSON)
$palabra = '';
if (isset($_GET['palabra'])) {
    $palabra = $_GET['palabra'];
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['palabra'])) {
        $palabra = $input['palabra'];
    }
}
$palabra = mb_strtolower(trim($palabra), 'UTF-8');

$glosario = [
    "pardiez"  => "Juramento frecuente en el habla antigua, abreviación de 'para a Dios'.",
    "rocín"    => "Caballo de mala traza, burdo y de poco valor, como el famoso Rocinante.",
    "adarga"   => "Escudo de cuero de forma ovalada o de corazón que usaban los antiguos soldados.",
    "hidalgo"  => "Persona que por su sangre pertenece a la nobleza privilegiada, aunque no siempre con riquezas.",
    "entuerto" => "Agravio, daño o injuria que se comete contra alguien.",
    "fazaña"   => "Acción ilustre, heroica o gran hazaña."
];

if ($palabra !== '' && array_key_exists($palabra, $glosario)) {
    echo json_encode(["significado" => $glosario[$palabra]], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(["significado" => "Lo siento, el término '$palabra' no se encuentra registrado en este glosario."], JSON_UNESCAPED_UNICODE);
}