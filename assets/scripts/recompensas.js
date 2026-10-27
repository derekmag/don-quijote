(() => {
  /* ---------- Idioma ---------- */
  const isEnglish = window.location.pathname.includes("english.html");
  const KEY = isEnglish ? "lemony_progreso" : "quijote_progreso";
  const FILE = isEnglish ? "preguntas_english.json" : "preguntas.json";
  const PREGUNTAS_POR_RONDA = 5;
 
  const T = isEnglish
    ? {
        titulo: "🏆 Challenges",
        nivel: "Level", puntos: "Points",
        faltan: (n, s) => `${n} points to reach ${s}.`,
        maximo: "Maximum level!",
        cerrar: "Close", jugar: "Play round", salir: "Exit", otra: "Another round",
        pregunta: (i, t) => `Question ${i} of ${t}`,
        siguiente: "Next", resultado: "See result",
        ok: "✅ Correct! +10 points.", mal: "❌ Not quite.",
        fin: "Round finished", aciertos: "Correct answers",
        perfecta: (b) => `🏆 Perfect round! +${b} bonus points.`,
        nueva: "New badge", subiste: "You reached", totales: "Total points",
        cargando: "Loading questions...", errorCarga: "Could not load the questions.",
        niveles: ["Orphan", "Apprentice", "Scholar", "Lemony's Pupil"],
        insignias: { primera: "First adventure", diez: "10 correct answers", racha5: "Streak of 5", perfecta: "Perfect round" },
      }
    : {
        titulo: "🏆 Retos Quijotescos",
        nivel: "Nivel", puntos: "Puntos",
        faltan: (n, s) => `Te faltan ${n} puntos para ${s}.`,
        maximo: "¡Nivel máximo!",
        cerrar: "Cerrar", jugar: "Jugar ronda", salir: "Salir", otra: "Otra ronda",
        pregunta: (i, t) => `Pregunta ${i} de ${t}`,
        siguiente: "Siguiente", resultado: "Ver resultado",
        ok: "✅ ¡Correcto! +10 puntos.", mal: "❌ No era esa.",
        fin: "Ronda terminada", aciertos: "Aciertos",
        perfecta: (b) => `🏆 ¡Ronda perfecta! +${b} puntos extra.`,
        nueva: "Nueva insignia", subiste: "¡Subiste a", totales: "Puntos totales",
        cargando: "Cargando preguntas...", errorCarga: "No se pudieron cargar las preguntas.",
        niveles: ["Escudero", "Caballero", "Hidalgo", "Don Quijote"],
        insignias: { primera: "Primera aventura", diez: "10 aciertos", racha5: "Racha de 5", perfecta: "Ronda perfecta" },
      };
 
  const NIVELES = [0, 100, 250, 500].map((min, i) => ({ min, nombre: T.niveles[i] }));
 
  const INSIGNIAS = [
    { id: "primera", icono: "🗡️", ok: (s) => s.respondidas >= 1 },
    { id: "diez", icono: "📜", ok: (s) => s.aciertos >= 10 },
    { id: "racha5", icono: "🔥", ok: (s) => s.mejorRacha >= 5 },
    { id: "perfecta", icono: "🏆", ok: (s) => s.rondasPerfectas >= 1 },
  ].map((i) => ({ ...i, nombre: T.insignias[i.id] }));
 
  const BASE = { puntos: 0, respondidas: 0, aciertos: 0, mejorRacha: 0, rondasPerfectas: 0, insignias: [] };
 
  function cargar() {
    try { return { ...BASE, ...JSON.parse(localStorage.getItem(KEY)) }; }
    catch { return { ...BASE }; }
  }
  function guardar(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }
  function nivelDe(puntos) {
    let actual = NIVELES[0], siguiente = null;
    for (let i = 0; i < NIVELES.length; i++) {
      if (puntos >= NIVELES[i].min) { actual = NIVELES[i]; siguiente = NIVELES[i + 1] || null; }
    }
    return { actual, siguiente };
  }
 
  /* ---------- Ventana ---------- */
  const modalRetos = document.createElement("div");
  modalRetos.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;justify-content:center;align-items:center;";
  modalRetos.innerHTML = `
    <div role="dialog" aria-modal="true" aria-label="${T.titulo}" style="background:#1e1b4b;color:white;padding:25px;border-radius:12px;width:420px;max-width:92%;max-height:90vh;overflow:auto;border:1px solid #4f46e5;box-shadow:0 4px 15px rgba(0,0,0,.5);">
      <div id="retosContenido"></div>
    </div>`;
  document.body.appendChild(modalRetos);
  const cont = modalRetos.querySelector("#retosContenido");
 
  const btn = (txt, id, color = "#2563eb") =>
    `<button id="${id}" style="background:${color};color:white;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;font-weight:bold;">${txt}</button>`;
  const cerrar = () => {
  modalRetos.style.display = "none";
  const b = document.getElementById("btnRetos");
  if (b) b.focus();
};
 
  /* ---------- Pantallas ---------- */
  let preguntas = [], ronda = [], idx = 0, aciertosRonda = 0, rachaRonda = 0;
 
  function pantallaInicio() {
    const s = cargar();
    const { actual, siguiente } = nivelDe(s.puntos);
    const faltan = siguiente ? T.faltan(siguiente.min - s.puntos, siguiente.nombre) : T.maximo;
    const insignias = INSIGNIAS.map((i) => {
      const tiene = s.insignias.includes(i.id);
      return `<span title="${i.nombre}" style="font-size:26px;opacity:${tiene ? 1 : 0.25};">${i.icono}</span>`;
    }).join(" ");
 
    cont.innerHTML = `
      <h3 style="margin-top:0;color:#818cf8;">${T.titulo}</h3>
      <p style="margin:6px 0;">${T.nivel}: <strong>${actual.nombre}</strong> · ${T.puntos}: <strong>${s.puntos}</strong></p>
      <p style="font-size:13px;color:#9ca3af;margin:4px 0 12px;">${faltan}</p>
      <div style="margin-bottom:15px;">${insignias}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        ${btn(T.cerrar, "retosCerrar", "#374151")}
        ${btn(T.jugar, "retosJugar")}
      </div>`;
    cont.querySelector("#retosCerrar").onclick = cerrar;
cont.querySelector("#retosJugar").onclick = iniciarRonda;
cont.querySelector("#retosJugar").focus();
  }
 
  function iniciarRonda() {
    ronda = [...preguntas].sort(() => Math.random() - 0.5).slice(0, PREGUNTAS_POR_RONDA);
    idx = 0; aciertosRonda = 0; rachaRonda = 0;
    mostrarPregunta();
  }
 
  function mostrarPregunta() {
    const p = ronda[idx];
    cont.innerHTML = `
      <p style="font-size:12px;color:#9ca3af;margin:0;">${T.pregunta(idx + 1, ronda.length)}</p>
      <h3 style="margin:6px 0 14px;color:#818cf8;">${p.pregunta}</h3>
      <div id="retosOpciones" style="display:flex;flex-direction:column;gap:8px;">
        ${p.opciones.map((o, i) =>
          `<button data-i="${i}" style="text-align:left;background:#312e81;color:white;border:1px solid #4f46e5;padding:10px;border-radius:6px;cursor:pointer;">${o}</button>`
        ).join("")}
      </div>
      <div id="retosFeedback" style="margin-top:12px;font-size:13px;min-height:40px;"></div>`;
    cont.querySelectorAll("#retosOpciones button").forEach((b) => (b.onclick = () => responder(Number(b.dataset.i))));
  }
 
  function responder(elegida) {
    const p = ronda[idx];
    const s = cargar();
    const acierto = elegida === p.correcta;
 
    s.respondidas++;
    if (acierto) {
      s.aciertos++; s.puntos += 10; aciertosRonda++; rachaRonda++;
      s.mejorRacha = Math.max(s.mejorRacha, rachaRonda);
    } else {
      rachaRonda = 0;
    }
    guardar(s);
 
    cont.querySelectorAll("#retosOpciones button").forEach((b) => {
      const i = Number(b.dataset.i);
      b.disabled = true;
      if (i === p.correcta) b.style.background = "#15803d";
      else if (i === elegida) b.style.background = "#b91c1c";
    });
 
    const ultima = idx === ronda.length - 1;
    cont.querySelector("#retosFeedback").innerHTML = `
      <p style="margin:0 0 10px;">${acierto ? T.ok : T.mal} ${p.explicacion}</p>
      ${btn(ultima ? T.resultado : T.siguiente, "retosSig")}`;
    cont.querySelector("#retosSig").onclick = () => {
      if (ultima) pantallaFin();
      else { idx++; mostrarPregunta(); }
    };
  }
 
  function pantallaFin() {
    const s = cargar();
    const antes = nivelDe(s.puntos - aciertosRonda * 10).actual.nombre;
 
    let bonus = 0;
    if (aciertosRonda === ronda.length) { bonus = 50; s.puntos += bonus; s.rondasPerfectas++; }
 
    const nuevas = INSIGNIAS.filter((i) => !s.insignias.includes(i.id) && i.ok(s));
    nuevas.forEach((i) => s.insignias.push(i.id));
    guardar(s);
 
    const despues = nivelDe(s.puntos).actual.nombre;
    const subio = despues !== antes
      ? `<p>⚔️ ${T.subiste} <strong>${despues}</strong>${isEnglish ? "" : "!"}</p>` : "";
 
    cont.innerHTML = `
      <h3 style="margin-top:0;color:#818cf8;">${T.fin}</h3>
      <p>${T.aciertos}: <strong>${aciertosRonda} / ${ronda.length}</strong></p>
      ${bonus ? `<p>${T.perfecta(bonus)}</p>` : ""}
      ${nuevas.map((i) => `<p>${i.icono} ${T.nueva}: <strong>${i.nombre}</strong></p>`).join("")}
      ${subio}
      <p>${T.totales}: <strong>${s.puntos}</strong></p>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:15px;">
        ${btn(T.salir, "retosSalir", "#374151")}
        ${btn(T.otra, "retosOtra")}
      </div>`;
    cont.querySelector("#retosSalir").onclick = cerrar;
    cont.querySelector("#retosOtra").onclick = iniciarRonda;
  }
 
  /* ---------- Arranque ---------- */
  async function abrir(e) {
    e.preventDefault();
    modalRetos.style.display = "flex";
    if (!preguntas.length) {
      cont.innerHTML = `<p>${T.cargando}</p>`;
      try {
        const res = await fetch(FILE);
        if (!res.ok) throw new Error("HTTP " + res.status);
        preguntas = await res.json();
      } catch (err) {
        console.error("Error cargando preguntas:", err);
        cont.innerHTML = `<p>${T.errorCarga}</p>`;
        return;
      }
    }
    pantallaInicio();
  }
 
  const btnRetos = document.getElementById("btnRetos");
  if (btnRetos) btnRetos.addEventListener("click", abrir);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
  modalRetos.addEventListener("click", (e) => { if (e.target === modalRetos) cerrar(); });
})();
