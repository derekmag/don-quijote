/**
 * ui.js — versión FINAL ESTABLE
 * ----------------------------------------------------------------------------
 * Maneja la interfaz visual del chat sin interferir con beforeunload.
 */

export function addMsg(who, txt, options = {}) {
  const historyEl = document.getElementById("chat-history");

  if (!historyEl) {
    console.error("❌ [ui.js] ERROR: No se encontró #chat-history en el DOM");
    return;
  }
  // Crear contenedor del mensaje
  const div = document.createElement("div");
  div.className = who === "Tú" ? "msg user" : "msg bot";
  // Nombre del emisor
  const name = document.createElement("strong");
  name.textContent = who + ": ";

  // Contenido del mensaje
  const content = document.createElement("span");
  content.textContent = txt;
  div.appendChild(name);
  div.appendChild(content);

  // Opciones visuales
  if (options.highlight) {
    div.dataset.highlight = "true";
  }

  if (options.animate) {
    div.dataset.animate = "true";
  }

  try {
    historyEl.appendChild(div);
  } catch (err) {
    console.error("❌ [ui.js] ERROR al insertar mensaje:", err);
  }

  // Scroll seguro
  try {
    const scrollOptions = {
      top: historyEl.scrollHeight,
      behavior: window.advertenciaActiva ? "auto" : "smooth",
    };

    historyEl.scrollTo(scrollOptions);
  } catch (err) {
    console.warn("⚠️ [ui.js] Error al hacer scroll:", err);
  }
}

/**
 * Muestra el spinner
 */
export function showSpinner() {
  const sp = document.getElementById("spinner");

  if (!sp) {
    console.error("❌ [ui.js] No se encontró #spinner");
    return;
  }

  sp.style.display = "block";
}

/**
 * Oculta el spinner
 */
export function hideSpinner() {
  // --- BOTÓN FLOTANTE CAPÍTULOS ---
  function setupCapitulosFlotante() {
    const btn = document.getElementById("btn-capitulos-flotante");
    const chapters = document.getElementById("chapter-container");
    if (!btn || !chapters) return;

    // Mostrar/ocultar capítulos
    btn.onclick = () => {
      chapters.classList.toggle("visible");
    };

    // Drag & drop flotante
    let offsetX,
      offsetY,
      dragging = false;
    btn.addEventListener("touchstart", (e) => {
      dragging = true;
      const touch = e.touches[0];
      offsetX = touch.clientX - btn.getBoundingClientRect().left;
      offsetY = touch.clientY - btn.getBoundingClientRect().top;
    });
    document.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      const touch = e.touches[0];
      btn.style.right = "auto";
      btn.style.left = touch.clientX - offsetX + "px";
      btn.style.top = touch.clientY - offsetY + "px";
      btn.style.bottom = "auto";
    });
    document.addEventListener("touchend", () => {
      dragging = false;
    });

    // Desktop drag
    btn.addEventListener("mousedown", (e) => {
      dragging = true;
      offsetX = e.clientX - btn.getBoundingClientRect().left;
      offsetY = e.clientY - btn.getBoundingClientRect().top;
      document.body.style.userSelect = "none";
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      btn.style.right = "auto";
      btn.style.left = e.clientX - offsetX + "px";
      btn.style.top = e.clientY - offsetY + "px";
      btn.style.bottom = "auto";
    });
    document.addEventListener("mouseup", () => {
      dragging = false;
      document.body.style.userSelect = "";
    });
  }
  document.addEventListener("DOMContentLoaded", setupCapitulosFlotante);

  // Sidebar capítulos desktop
function renderSidebarChapters() {
  const sidebar = document.getElementById('sidebar-chapters');
  if (!sidebar) return;
  sidebar.innerHTML = '<h3 style="text-align:center;">Capítulos</h3><ul id="sidebar-chapters-list" style="list-style:none;padding:0;margin:0;"></ul>';
  const ul = document.getElementById('sidebar-chapters-list');
  for (let i = 1; i <= 52; i++) {
    const li = document.createElement('li');
    li.innerHTML = `<button class="sidebar-chapter-btn" data-chapter="${i}">Capítulo ${i}</button>`;
    ul.appendChild(li);
  }
  // Puedes enlazar aquí el cambio de capítulo si lo deseas
}
document.addEventListener('DOMContentLoaded', renderSidebarChapters);

// --- FIN MINI PLAYER Y BOTÓN FLOTANTE ---
  const sp = document.getElementById("spinner");

  if (!sp) {
    console.error("❌ [ui.js] No se encontró #spinner");
    return;
  }

  sp.style.display = "none";
}