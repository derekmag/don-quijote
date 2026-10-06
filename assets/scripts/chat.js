/**
 * chat.js — Versión Dual Snicket/Quijote
 * Gestiona la comunicación con los dos backends especializados.
 */

import { addMsg, showSpinner, hideSpinner } from "./ui.js";
import { speak } from "./tts.js";

/* --- DETECCIÓN DE ENTORNO Y LENGUAJE --- */
const isEnglishPage = window.location.pathname.includes("english.html");
const TUTOR_NAME = isEnglishPage ? "Lemony" : "Quijote";

/* --- CONFIGURACIÓN DE ENDPOINTS RELATIVOS --- 
   Al estar index.html y Lemony.php / Quijote.php en la misma raíz,
   referenciarlos por nombre directo (o con ./) evita errores de resolución.
*/
const BACKEND_FILENAME = isEnglishPage ? "Lemony.php" : "Quijote.php";
const BACKEND_URL = `./${BACKEND_FILENAME}`;

console.log(`[🚀 Entorno]: Local/Server`);
console.log(`[🔗 Endpoint resolved]: ${BACKEND_URL}`);

/* --- MEMORIA DINÁMICA --- */
export let conversationHistory = [];
window.conversationHistory = conversationHistory;
export let selectedModel = "chat"; // Cambiado a 'chat' para coincidir con tu backend por defecto

/**
 * Envía el mensaje al backend correspondiente
 * @param {string} texto
 * @param {boolean} silent - Si es true, no añade el mensaje del usuario a la UI
 * @param {function} onSpeakEnd - Callback opcional para ejecutar al terminar el TTS
 */
export async function enviarMensaje(texto, silent = false, onSpeakEnd = null) {
  const mensajeLimpio = texto.trim();
  if (!mensajeLimpio) return;

  // 1. Interfaz y Memoria Local
  if (!silent) addMsg("Tú", mensajeLimpio);
  conversationHistory.push({ role: "user", content: mensajeLimpio });
  window.conversationHistory = conversationHistory;

  showSpinner();

  try {
    console.log(`[Fetch] Iniciando petición a: ${BACKEND_URL}`);
    console.log(`[Fetch] Payload a enviar:`, {
      message: mensajeLimpio,
      model: selectedModel,
      isEnglish: isEnglishPage,
    });

    // 2. Petición al Servidor
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        message: mensajeLimpio,
        history: conversationHistory,
        model: selectedModel,
        isEnglish: isEnglishPage,
        isSummary: false,
      }),
    });

    if (!response.ok) {
      
      console.error(
        `[Fetch Error] Falló respuesta del servidor. Status HTTP: ${response.status} ${response.statusText}`
      );
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[Fetch Error] Detalles de error capturados (si existen):`,
        errorData
      );
      throw new Error(errorData.reply || `Error HTTP: ${response.status}`);
    }

    //nuevo 
   const texto = await response.text();
console.log("[Respuesta cruda del servidor]:", texto.slice(0, 800));

let data;
try {
  data = JSON.parse(texto);
} catch (e) {
  throw new Error("El servidor no devolvió JSON. Revisa la consola.");
}
console.log(`[Fetch Success] Datos recibidos exitosamente:`, data);

    if (data && data.reply) {
      const respuestaIA = data.reply;

      // 3. Actualización de métricas en UI
      actualizarMetricasUI(data.metrics);

      // 4. Respuesta visual, auditiva y memoria
      addMsg(TUTOR_NAME, respuestaIA);
      conversationHistory.push({ role: "assistant", content: respuestaIA });

      // Ejecutar TTS
      if (onSpeakEnd) {
        speak(respuestaIA, onSpeakEnd);
      } else {
        speak(respuestaIA);
      }

      // 5. Control de saturación (Resumen cada 10 mensajes)
      if (conversationHistory.length >= 10) {
        await resumirHistorial();
      }

      return respuestaIA;
    }
  } catch (err) {
    console.error("🔥 Error en comunicación:", err);
    const errorMsg = isEnglishPage
      ? `An unfortunate error has blocked our correspondence. (${err.message})`
      : `¡Pardiez! Un encantador ha cortado nuestra comunicación. (${err.message})`;
    addMsg("Error", errorMsg);
  } finally {
    hideSpinner();
  }
}

/**
 * Reduce el historial mediante IA
 */
async function resumirHistorial() {
  console.log("📜 Optimizando memoria del tutor...");
  try {
    const mensajesRecientes = conversationHistory.slice(-3);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        message: isEnglishPage
          ? "Summarize our progress."
          : "Resume nuestras aventuras.",
        history: conversationHistory,
        model: selectedModel,
        isSummary: true,
        isEnglish: isEnglishPage,
      }),
    });

    const data = await response.json();
    if (data.reply) {
      const prefijo = isEnglishPage
        ? "[Previous Records]: "
        : "[Memoria de mis andanzas]: ";
      conversationHistory = [
        { role: "assistant", content: prefijo + data.reply },
        ...mensajesRecientes,
      ];
      window.conversationHistory = conversationHistory;
      console.log("✅ Memoria optimizada.");
    }
  } catch (err) {
    console.warn("Fallo al resumir, truncando historial manualmente.");
    conversationHistory = conversationHistory.slice(-5);
    window.conversationHistory = conversationHistory;
  }
}

/**
 * Actualiza los elementos de texto con los datos técnicos del servidor
 */
function actualizarMetricasUI(metrics) {
  if (!metrics) return;

  const metricsEl = document.getElementById("technical-metrics");
  if (metricsEl) {
    const msgCount = metrics.message_count || conversationHistory.length;
    metricsEl.textContent = `Status: Connected | Context: ${msgCount} msgs | Model: ${selectedModel}`;
  }

  const statPayload = document.getElementById("stat-payload");
  const statTokens = document.getElementById("stat-tokens");

  if (statPayload && metrics.payload_bytes) {
    statPayload.textContent = `${(metrics.payload_bytes / 1024).toFixed(2)} KB`;
  }
  if (statTokens && metrics.estimated_tokens) {
    statTokens.textContent = metrics.estimated_tokens;
  } else if (statTokens) {
    statTokens.textContent = Math.ceil((metrics.payload_bytes || 0) / 4);
  }
}

/* --- LISTENERS DE INTERFAZ --- */
const inputChat = document.getElementById("chat-input");
const btnEnviar = document.getElementById("send-btn");

if (btnEnviar && inputChat) {
  btnEnviar.addEventListener("click", () => {
    enviarMensaje(inputChat.value);
    inputChat.value = "";
  });

  inputChat.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviarMensaje(inputChat.value);
      inputChat.value = "";
    }
  });
}