📜 QuijoteIA

Experiencia interactiva para leer, escuchar y conversar con Don Quijote de la Mancha, potenciada por inteligencia artificial. Disponible en español (Don Quijote) e inglés (una versión educativa narrada por Lemony Snicket, basada en A Series of Unfortunate Events).

Proyecto desarrollado como parte de la estadía profesional en MECH ROBOTIX AC, TSU en Desarrollo de Software Multiplataforma — Universidad Tecnológica de Ciudad Juárez.

Repositorio: https://github.com/derekmag/don-quijote

✨ Características principales
Lectura sincronizada con audio: el texto de cada capítulo se resalta en tiempo real conforme avanza la narración.
Asistente conversacional (chatbot): permite hacer preguntas sobre la lectura y recibir respuestas en el tono y lenguaje del personaje, impulsado por Google Gemini.
Glosario quijotesco: búsqueda de 40 términos arcaicos, que ignora tildes, sugiere palabras parecidas y responde en español o inglés. Las palabras del glosario aparecen subrayadas en el texto del capítulo y muestran su definición al hacer clic.
Retos y recompensas: rondas de preguntas con puntos, niveles (Escudero, Caballero, Hidalgo y Don Quijote) e insignias. Al terminar un capítulo aparece un «Reto del capítulo» con preguntas de lo que se acaba de escuchar. La versión en inglés tiene preguntas de vocabulario.
Reconocimiento de voz: activación por palabra clave ("Oye Quijote") y envío de mensajes por comandos de voz, además de texto por micrófono.
Síntesis de voz (TTS) para las respuestas del asistente.
Avatar 3D animado de Don Quijote (modelo talking.fbx, renderizado con Three.js).
Reproductor de audiolibro (mini-player) con control de reproducción, barra de progreso y salto a un tiempo específico.
Navegación de 52 capítulos en español y 13 en inglés, adaptada según el tamaño de pantalla (ver sección de Diseño responsivo).
Dos idiomas: versión en español (index.html, personaje Don Quijote) y versión en inglés (english.html, tutor Lemony Snicket), cada una con sus audios y textos, y un solo backend (Tutor.php) que elige el personaje según el idioma.
Protección de la API: límite de uso por IP, reintentos automáticos cuando el modelo está saturado y bloqueo web del archivo .env.
Diseño responsivo desde 300px hasta pantallas 4K, con capítulos como panel flotante en móvil y sidebars dedicados en pantallas grandes.
🧱 Estructura del proyecto
QUIJOTE/
├── assets/
│   ├── images/         # Ilustraciones y recursos gráficos de la interfaz
│   ├── l-icon/         # Componente web personalizado de íconos (SVG)
│   ├── scripts/        # Lógica de la aplicación (chat, audio, capítulos, UI, retos, etc.)
│   └── styles/         # Hojas de estilo (paleta de colores, layout, responsive)
├── audios/
│   ├── split_audios/            # Narración en español, dividida por capítulo
│   └── split_audios_english/    # Narración en inglés, dividida por capítulo
├── lyrics/
│   ├── capitulos/               # Texto + tiempos de sincronización (JSON) — español
│   └── capitulos_english/       # Texto + tiempos de sincronización (JSON) — inglés
├── .env                  # Variables de entorno (no versionado)
├── .gitignore
├── .htaccess             # Bloquea el acceso web al archivo .env
├── Dockerfile            # Imagen para despliegue en contenedor
├── english.html          # Punto de entrada — versión en inglés
├── index.html            # Punto de entrada — versión en español
├── Tutor.php             # Backend del chatbot (español e inglés)
├── limite.php            # Límite de uso por IP, usado por Tutor.php
├── glosario_api.php      # API del glosario
├── glosario.json         # Palabras del glosario con definición en español e inglés
├── preguntas.json        # Preguntas de los retos (español)
├── preguntas_english.json # Preguntas de los retos (inglés)
├── README.md
└── talking.fbx           # Modelo 3D animado de Don Quijote
Scripts principales (assets/scripts/)
Archivo	Responsabilidad
chat.js	Envío/recepción de mensajes con el backend, aviso de límite y botón «Reintentar»
chatToggle.js	Abrir/cerrar la burbuja flotante del chat
chaptersToggle.js	Panel flotante de capítulos en móvil
sync.js	Carga de capítulos y sincronización del texto con el audio
glosario-texto.js	Subraya las palabras del glosario en el texto y muestra su definición
recompensas.js	Retos de preguntas, puntos, niveles, insignias y reto por capítulo
recognition.js	Reconocimiento de voz y palabras de activación
tts.js	Síntesis de voz de las respuestas del asistente
animacionQuijote.js	Renderizado del avatar 3D (Three.js)
layout.js	Mide el alto real del header y el mini-player para que el contenido central tenga su propio scroll
icons.js	Define el componente <l-icon> usado en toda la interfaz
ui.js / voices.js	Utilidades de interfaz y listado de voces disponibles
⚙️ Requisitos
Servidor con PHP 8 y la extensión cURL activada (para Tutor.php)
Una API key de Google Gemini (se crea en Google AI Studio)
Navegador moderno (Chrome, Edge, Safari o Firefox actualizado)
(Opcional) Docker, si se despliega mediante el Dockerfile incluido
🔑 Variables de entorno

Crear un archivo .env en la raíz del proyecto con una sola línea:

GEMINI_API_KEY="tu_clave"

El backend (Tutor.php) primero intenta leer GEMINI_API_KEY como variable de entorno del sistema (por ejemplo, configurada en el contenedor o en el panel del proveedor de hosting); si no la encuentra, recurre al archivo .env local.

⚠️ El archivo .env no debe subirse al repositorio. Verifica que esté incluido en .gitignore. El .htaccess incluido bloquea su descarga desde el navegador (/.env debe responder 403). Nunca compartas capturas donde se vea la clave; si se expone, revócala en Google AI Studio y crea otra.

🚀 Ejecución local
Clonar el repositorio en la carpeta de tu servidor local, por ejemplo:
/var/www/html — Linux
C:/xampp/htdocs/ — XAMPP
bash
   git clone https://github.com/derekmag/don-quijote.git
Crear el archivo .env con tu API key de Gemini.
Iniciar Apache (en XAMPP, desde el panel de control).
Abrir en el navegador http://localhost/don-quijote/ (ajusta la ruta a la carpeta donde lo copiaste).

No uses Live Server ni abras los archivos directamente: no ejecutan PHP, y el chat y el glosario no funcionarían.

📖 Glosario y retos: cómo agregar contenido
Palabras del glosario: agrega una entrada en glosario.json con sus definiciones es y en. Cada entrada termina en coma, excepto la última del archivo.
Preguntas de los retos: agrega un objeto en preguntas.json con pregunta, opciones, correcta (posición de la opción correcta, empezando en 0) y explicacion.
Para ligarla a un capítulo del audio, agrega "capitulo": N.
Si trata de la segunda parte de la obra, agrega "parte": 2 para que no salga en los retos de capítulo.
El progreso de los retos se guarda en el navegador (localStorage), por separado para español e inglés.
📱 Diseño responsivo

La interfaz se adapta en cinco rangos de ancho de pantalla:

Rango	Comportamiento
300px – 479px	Chat y capítulos como burbujas/paneles flotantes; <main> con scroll propio entre header y mini-player, ambos fijos
480px – 767px	Mismo patrón, ajustado a tabletas pequeñas
768px – 1023px	Los capítulos regresan a una fila visible dentro del mini-player
1024px – 1439px	El mini-player se divide: controles de audio a la izquierda, capítulos en cuadrícula a la derecha
1440px en adelante	Layout de tres columnas: sidebar de capítulos, columna del avatar 3D, y sidebar del reproductor de audio
🧠 Modelo de IA

Tutor.php usa Google Gemini. Los modelos se definen en la lista $MODELOS al inicio del archivo:

php
$MODELOS = ["gemini-3.8-flash"];

Si el primer modelo está saturado, se prueba el siguiente de la lista. Cuando Google retire un modelo, basta con cambiar el nombre ahí; los nombres vigentes están en https://ai.google.dev/gemini-api/docs/models.

⚠️ Limitaciones conocidas
El progreso de los retos se pierde si se borran los datos del navegador.
Las respuestas correctas son visibles en preguntas.json.
Gemini puede responder con alta demanda: el chat muestra un aviso con el botón «Reintentar».
Las definiciones del glosario son un apoyo de lectura; conviene contrastarlas con el diccionario de la RAE.
⚖️ Licencia

Este proyecto se distribuye bajo la Licencia MIT. Siéntete libre de usarlo, estudiarlo y mejorarlo con fines educativos.

👤 Autor

Proyecto desarrollado para el concurso Código Ciencia / Infomatrix 2026.

👤 Colaboradores de la actualización

Héctor Alejandro Lerma Cruz TSU en Desarrollo de Software Multiplataforma — Universidad Tecnológica de Ciudad Juárez Estadía profesional en MECH ROBOTIX AC

Derek Joel Magaña Oviedo Estadía profesional en MECH ROBOTIX AC