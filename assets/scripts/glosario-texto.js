/**
 * glosario-texto.js
 * Resalta en el texto sincronizado las palabras que están en el glosario
 * y muestra su definición al hacer clic (o con Enter).
 * No modifica sync.js: observa el contenedor y procesa las frases cuando se cargan.
 * Solo se usa en la versión en español (index.html).
 */
(() => {
  const contenedor = document.getElementById("texto-sincronizado");
  if (!contenedor) return;
  if (window.location.pathname.includes("english.html")) return;

  let palabras = [];
  const cache = {};

  /* ---------- Coincidencias (ignora tildes y mayúsculas) ---------- */
  function normChar(c) {
    const n = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return n.length === 1 ? n : c.toLowerCase().charAt(0);
  }
  function normalizar(t) {
    let o = "";
    for (let i = 0; i < t.length; i++) o += normChar(t[i]);
    return o;
  }
  const esLetra = (c) => !!c && /\p{L}/u.test(c);

  function encontrarMarcas(texto, lista) {
    const norm = normalizar(texto);
    const marcas = [];
    for (const palabra of lista) {
      const p = normalizar(palabra);
      if (!p) continue;
      let pos = norm.indexOf(p);
      while (pos !== -1) {
        let fin = pos + p.length;
        if (norm[fin] === "s") fin++; // plural sencillo: hidalgos, adargas
        const libre = !marcas.some((m) => pos < m.fin && fin > m.ini);
        if (libre && !esLetra(texto[pos - 1]) && !esLetra(texto[fin])) {
          marcas.push({ ini: pos, fin, palabra });
        }
        pos = norm.indexOf(p, pos + 1);
      }
    }
    return marcas.sort((a, b) => a.ini - b.ini);
  }

  /* ---------- Pintar una frase ---------- */
  function pintar(span) {
    if (span.dataset.glosario === "1") return;
    span.dataset.glosario = "1";
    const texto = span.textContent;
    const marcas = encontrarMarcas(texto, palabras);
    if (!marcas.length) return;

    span.textContent = "";
    let cursor = 0;
    for (const m of marcas) {
      if (m.ini > cursor) span.append(texto.slice(cursor, m.ini));
      const mk = document.createElement("mark"); // <mark>, no <span>, para no afectar a sync.js
      mk.className = "glosario-palabra";
      mk.dataset.palabra = m.palabra;
      mk.tabIndex = 0;
      mk.setAttribute("role", "button");
      mk.textContent = texto.slice(m.ini, m.fin);
      span.append(mk);
      cursor = m.fin;
    }
    if (cursor < texto.length) span.append(texto.slice(cursor));
  }

  function pintarTodo() {
    if (!palabras.length) return;
    contenedor.querySelectorAll(":scope > span").forEach(pintar);
  }

  /* ---------- Estilos y recuadro de definición ---------- */
  const estilo = document.createElement("style");
  estilo.textContent = `
    .glosario-palabra{background:transparent;color:inherit;border-bottom:2px dotted #60a5fa;cursor:help;}
    .glosario-palabra:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;}
    #glosario-popup{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);
      max-width:min(420px,92vw);background:#1e1b4b;color:#fff;border:1px solid #4f46e5;
      border-radius:12px;padding:14px 36px 14px 16px;box-shadow:0 4px 15px rgba(0,0,0,.5);
      z-index:99998;display:none;font-size:14px;line-height:1.4;}
    #glosario-popup strong{color:#818cf8;display:block;margin-bottom:4px;}
    #glosario-popup button{position:absolute;top:4px;right:8px;background:none;border:none;
      color:#9ca3af;font-size:20px;cursor:pointer;}`;
  document.head.appendChild(estilo);

  const popup = document.createElement("div");
  popup.id = "glosario-popup";
  popup.setAttribute("aria-live", "polite");
  popup.innerHTML =
    '<button type="button" aria-label="Cerrar definición">×</button><strong></strong><span></span>';
  document.body.appendChild(popup);
  const popTitulo = popup.querySelector("strong");
  const popTexto = popup.querySelector("span");
  const cerrarPopup = () => { popup.style.display = "none"; };
  popup.querySelector("button").onclick = cerrarPopup;

  async function mostrar(palabra) {
    popTitulo.textContent = palabra;
    popTexto.textContent = "...";
    popup.style.display = "block";
    try {
      if (!cache[palabra]) {
        const res = await fetch("glosario_api.php?palabra=" + encodeURIComponent(palabra));
        if (!res.ok) throw new Error("HTTP " + res.status);
        cache[palabra] = (await res.json()).significado;
      }
      popTexto.textContent = cache[palabra];
    } catch (err) {
      console.error("Error glosario:", err);
      popTexto.textContent = "No se pudo consultar el glosario.";
    }
  }

  contenedor.addEventListener("click", (e) => {
    const mk = e.target.closest(".glosario-palabra");
    if (mk) mostrar(mk.dataset.palabra);
  });
  contenedor.addEventListener("keydown", (e) => {
    const mk = e.target.closest && e.target.closest(".glosario-palabra");
    if (mk && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      mostrar(mk.dataset.palabra);
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarPopup(); });
  document.addEventListener("click", (e) => {
    if (!popup.contains(e.target) && !e.target.closest(".glosario-palabra")) cerrarPopup();
  });

  /* ---------- Arranque ---------- */
  // Cuando sync.js carga un capítulo, agrega las frases al contenedor
  new MutationObserver(pintarTodo).observe(contenedor, { childList: true });

  fetch("glosario_api.php?lista=1")
    .then((r) => (r.ok ? r.json() : []))
    .then((lista) => {
      palabras = (Array.isArray(lista) ? lista : []).sort((a, b) => b.length - a.length);
      pintarTodo(); // por si ya había un capítulo cargado
    })
    .catch((err) => console.warn("No se pudo cargar la lista del glosario:", err));

  // Para pruebas desde la consola o Node
  window.__glosarioTexto = { encontrarMarcas };
})();