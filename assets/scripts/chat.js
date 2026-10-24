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
 
/* --- MEMORIA DINÁMICA --- */
export let conversationHistory = [];
window.conversationHistory = conversationHistory;
export let selectedModel = "chat"; // Cambiado a 'chat' para coincidir con tu backend por defecto
 
/**
 * Muestra un botón para reintentar el último mensaje
 * (se usa cuando Gemini tiene alta demanda).
 */
function mostrarReintentar(texto) {
  const hist = document.getElementById("chat-history");
  if (!hist) return;
  const b = document.createElement("button");
  b.textContent = isEnglishPage ? "Retry" : "Reintentar";
  b.style.cssText =
    "margin:8px;padding:6px 12px;border-radius:6px;border:none;background:#2563eb;color:white;cursor:pointer;";
  b.onclick = () => {
    b.remove();
    enviarMensaje(texto, true);
  };
  hist.appendChild(b);
}
 
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
 
    const textoRespuesta = await response.text();
 
    let data;
    try {
      data = JSON.parse(textoRespuesta);
    } catch (e) {
      console.error("[Respuesta no válida del servidor]:", textoRespuesta.slice(0, 800));
      throw new Error(
        isEnglishPage
          ? "The server did not return JSON."
          : "El servidor no devolvió JSON."
      );
    }
 
    // Límite de uso alcanzado: se muestra el aviso y no se guarda en la memoria
    if (data && data.limited) {
      addMsg(TUTOR_NAME, data.reply);
      conversationHistory.pop();
      return;
    }
 
    // Alta demanda de Gemini: se ofrece reintentar
    if (data && data.busy) {
      addMsg(TUTOR_NAME, data.reply);
      conversationHistory.pop(); // evita duplicar el mensaje al reintentar
      mostrarReintentar(mensajeLimpio);
      return;
    }
 
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
    // No guardar como memoria los avisos de alta demanda o de límite de uso
    if (data.reply && !data.busy && !data.limited) {
      const prefijo = isEnglishPage
        ? "[Previous Records]: "
        : "[Memoria de mis andanzas]: ";
      conversationHistory = [
        { role: "assistant", content: prefijo + data.reply },
        ...mensajesRecientes,
      ];
      window.conversationHistory = conversationHistory;
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