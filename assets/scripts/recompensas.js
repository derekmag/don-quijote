const KEY = "quijote_progreso";
const PREGUNTAS_POR_RONDA = 5;

const NIVELES = [
  { min: 0, nombre: "Escudero" },
  { min: 100, nombre: "Caballero" },
  { min: 250, nombre: "Hidalgo" },
  { min: 500, nombre: "Don Quijote" },
];

const INSIGNIAS = [
  { id: "primera", icono: "🗡️", nombre: "Primera aventura", ok: (s) => s.respondidas >= 1 },
  { id: "diez", icono: "📜", nombre: "10 aciertos", ok: (s) => s.aciertos >= 10 },
  { id: "racha5", icono: "🔥", nombre: "Racha de 5", ok: (s) => s.mejorRacha >= 5 },
  { id: "perfecta", icono: "🏆", nombre: "Ronda perfecta", ok: (s) => s.rondasPerfectas >= 1 },
];

const BASE = { puntos: 0, respondidas: 0, aciertos: 0, mejorRacha: 0, rondasPerfectas: 0, insignias: [] };

function cargar() {
  try {
    return { ...BASE, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...BASE };
  }
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
const modal = document.createElement("div");
modal.style.cssText =
  "display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;justify-content:center;align-items:center;";
modal.innerHTML = `
  <div id="retosCaja" style="background:#1e1b4b;color:white;padding:25px;border-radius:12px;width:420px;max-width:92%;max-height:90vh;overflow:auto;border:1px solid #4f46e5;box-shadow:0 4px 15px rgba(0,0,0,.5);">
    <div id="retosContenido"></div>
  </div>`;
document.body.appendChild(modal);
const cont = modal.querySelector("#retosContenido");

const btn = (txt, id, color = "#2563eb") =>
  `<button id="${id}" style="background:${color};color:white;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;font-weight:bold;">${txt}</button>`;

function cerrar() { modal.style.display = "none"; }

/* ---------- Pantallas ---------- */
let preguntas = [];
let ronda = [], idx = 0, aciertosRonda = 0, rachaRonda = 0;

function pantallaInicio() {
  const s = cargar();
  const { actual, siguiente } = nivelDe(s.puntos);
  const faltan = siguiente ? `Te faltan ${siguiente.min - s.puntos} puntos para ${siguiente.nombre}.` : "¡Nivel máximo!";
  const insignias = INSIGNIAS.map((i) => {
    const tiene = s.insignias.includes(i.id);
    return `<span title="${i.nombre}" style="font-size:26px;opacity:${tiene ? 1 : 0.25};">${i.icono}</span>`;
  }).join(" ");

  cont.innerHTML = `
    <h3 style="margin-top:0;color:#818cf8;">🏆 Retos Quijotescos</h3>
    <p style="margin:6px 0;">Nivel: <strong>${actual.nombre}</strong> · Puntos: <strong>${s.puntos}</strong></p>
    <p style="font-size:13px;color:#9ca3af;margin:4px 0 12px;">${faltan}</p>
    <div style="margin-bottom:15px;">${insignias}</div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      ${btn("Cerrar", "retosCerrar", "#374151")}
      ${btn("Jugar ronda", "retosJugar")}
    </div>`;
  cont.querySelector("#retosCerrar").onclick = cerrar;
  cont.querySelector("#retosJugar").onclick = iniciarRonda;
}

function iniciarRonda() {
  ronda = [...preguntas].sort(() => Math.random() - 0.5).slice(0, PREGUNTAS_POR_RONDA);
  idx = 0; aciertosRonda = 0; rachaRonda = 0;
  mostrarPregunta();
}

function mostrarPregunta() {
  const p = ronda[idx];
  cont.innerHTML = `
    <p style="font-size:12px;color:#9ca3af;margin:0;">Pregunta ${idx + 1} de ${ronda.length}</p>
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
    <p style="margin:0 0 10px;">${acierto ? "✅ ¡Correcto! +10 puntos." : "❌ No era esa."} ${p.explicacion}</p>
    ${btn(ultima ? "Ver resultado" : "Siguiente", "retosSig")}`;
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
  cont.innerHTML = `
    <h3 style="margin-top:0;color:#818cf8;">Ronda terminada</h3>
    <p>Aciertos: <strong>${aciertosRonda} / ${ronda.length}</strong></p>
    ${bonus ? `<p>🏆 ¡Ronda perfecta! +${bonus} puntos extra.</p>` : ""}
    ${nuevas.map((i) => `<p>${i.icono} Nueva insignia: <strong>${i.nombre}</strong></p>`).join("")}
    ${despues !== antes ? `<p>⚔️ ¡Subiste a <strong>${despues}</strong>!</p>` : ""}
    <p>Puntos totales: <strong>${s.puntos}</strong></p>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:15px;">
      ${btn("Salir", "retosSalir", "#374151")}
      ${btn("Otra ronda", "retosOtra")}
    </div>`;
  cont.querySelector("#retosSalir").onclick = cerrar;
  cont.querySelector("#retosOtra").onclick = iniciarRonda;
}

/* ---------- Arranque ---------- */
async function abrir(e) {
  e.preventDefault();
  modal.style.display = "flex";
  if (!preguntas.length) {
    cont.innerHTML = "<p>Cargando preguntas...</p>";
    try {
      const res = await fetch("preguntas.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      preguntas = await res.json();
    } catch (err) {
      console.error("Error cargando preguntas:", err);
      cont.innerHTML = "<p>No se pudieron cargar las preguntas.</p>";
      return;
    }
  }
  pantallaInicio();
}

const btnRetos = document.getElementById("btnRetos");
if (btnRetos) btnRetos.addEventListener("click", abrir);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });