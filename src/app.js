// Alumno Cero — UI controller (vanilla JS, no build step).
import { TOPICS, LEVELS, getTopic } from "./topics.js";
import { analyze, validateExplanation, reflect, questionsFor, pickVariant, takeExam, knownConcepts } from "./engine.js";
import { load, save, clear, initialState } from "./store.js";

const root = document.getElementById("app");
let state = load();
let storageOk = true;
let flash = null; // {kind:"error"|"info", text}
let speech = { active: false, rec: null, supported: false };

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
speech.supported = Boolean(SR);

const STEPS = ["welcome", "goal", "frictions", "prefs", "teach", "reading", "reflect", "exam", "result", "practice", "card"];
const STEP_LABEL = { welcome: "Inicio", goal: "Objetivo", frictions: "Dificultades", prefs: "Preferencias", teach: "Enseñar", reading: "Lectura", reflect: "Cero responde", exam: "Examen", result: "Resultado", practice: "Práctica", card: "Tu ficha" };
const PROGRESS = { welcome: 0, goal: 1, frictions: 2, prefs: 3, teach: 4, reading: 5, reflect: 5, exam: 6, result: 7, practice: 7, card: 8 };
const TOTAL = 8;

const GOALS = [
  { id: "examen", label: "Aprobar una prueba o curso", cero: "Me enfocaré en que puedas aplicarlo en un problema nuevo." },
  { id: "trabajo", label: "Usarlo en mi trabajo o en mis finanzas", cero: "Los casos del examen serán de la vida real." },
  { id: "ensenar", label: "Poder explicárselo a otra persona", cero: "Voy a exigirte frases claras y completas." },
  { id: "curiosidad", label: "Entenderlo de verdad, por curiosidad", cero: "Preguntaré el porqué de cada paso." },
];

const FRICTIONS = [
  { id: "leo", text: "Lo leo y me parece claro, pero a la hora de aplicarlo me trabo." },
  { id: "bloqueo", text: "Me bloqueo en los exámenes aunque haya estudiado." },
  { id: "poco", text: "Tengo poco tiempo: necesito practicar en sesiones de 10 minutos." },
  { id: "sinnet", text: "A veces no tengo buena conexión a internet." },
  { id: "nose", text: "Nadie me avisa cuál es mi error exacto." },
];

const DEMO_BAD = {
  "interes-compuesto": "Un préstamo funciona así: el banco te presta dinero y te cobra una tasa de 10% anual. El interés se calcula sobre lo que pediste. Eso se repite cada año mientras dure el préstamo.",
  "descuentos-sucesivos": "Un descuento es un porcentaje del precio que se resta de ese precio. Si una tienda hace dos descuentos, los porcentajes se suman y se aplican de una vez sobre el precio original.",
  "fotosintesis": "La planta se alimenta de la tierra: de ahí saca su comida y su masa. El agua la absorben las raíces y la luz del sol le da la energía. Al final libera oxígeno y fabrica glucosa.",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const topic = () => getTopic(state.topicId);
const level = () => LEVELS[state.level] ?? LEVELS.companero;

function persist() { storageOk = save(state); }
function go(screen) { state.screen = screen; flash = null; persist(); render(); window.scrollTo({ top: 0 }); }
function setFlash(kind, text) { flash = { kind, text }; render(); }

/* ----------------------------- shared pieces ----------------------------- */

// Cero is literally a zero: an oval "0" with a face. Moods: curioso, pensando, feliz, confundido.
const CERO_FACE = {
  curioso: `<circle cx="27" cy="32" r="3.6" class="c-eye"/><circle cx="45" cy="32" r="3.6" class="c-eye"/><path d="M22 23 q5 -4 10 -1" class="c-line"/><path d="M41 21 q5 -2 9 1" class="c-line"/><ellipse cx="36" cy="46" rx="3.2" ry="3.8" class="c-line"/>`,
  pensando: `<circle cx="30" cy="30" r="3.2" class="c-eye"/><circle cx="48" cy="30" r="3.2" class="c-eye"/><path d="M25 24 q5 -2 10 0" class="c-line"/><path d="M42 19 q5 -4 10 -1" class="c-line"/><path d="M31 48 q4 -2 9 0" class="c-line"/><circle cx="62" cy="14" r="2.2" class="c-drop"/><circle cx="67" cy="7" r="1.4" class="c-drop"/>`,
  feliz: `<path d="M22 33 q5 -6 10 0" class="c-line"/><path d="M40 33 q5 -6 10 0" class="c-line"/><path d="M25 43 q11 11 22 0" class="c-line"/><circle cx="20" cy="41" r="3" class="c-cheek"/><circle cx="52" cy="41" r="3" class="c-cheek"/>`,
  confundido: `<circle cx="27" cy="32" r="4.4" class="c-eye"/><circle cx="46" cy="33" r="2.4" class="c-eye"/><path d="M21 27 l11 -5" class="c-line"/><path d="M41 21 q6 -1 10 5" class="c-line"/><path d="M25 48 q4 -4 7 0 t7 0 t7 0" class="c-line"/><path d="M58 16 q3 5 0 7 q-3 -2 0 -7z" class="c-drop"/>`,
};
const CERO_LABEL = { curioso: "curioso", pensando: "pensando", feliz: "feliz", confundido: "confundido" };

function cero(mood = "curioso", cls = "") {
  return `<span class="cero cero-${mood} ${cls}" data-testid="cero" data-mood="${mood}" role="img" aria-label="Cero, ${CERO_LABEL[mood]}">
    <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false"><ellipse cx="36" cy="37" rx="25" ry="31" class="c-body"/><ellipse cx="36" cy="37" rx="25" ry="31" class="c-ring"/>${CERO_FACE[mood]}</svg>
  </span>`;
}

function ceroSays(mood, html, cls = "") {
  return `<div class="cero-row ${cls}">${cero(mood)}<p class="bubble">${html}</p></div>`;
}

function header() {
  const step = PROGRESS[state.screen] ?? 0;
  const canBack = ["goal", "frictions", "prefs", "teach"].includes(state.screen);
  const segs = Array.from({ length: TOTAL }, (_, i) => `<span class="seg-tick ${i < step ? "done" : ""} ${i === step - 1 ? "now" : ""}"></span>`).join("");
  return `
  <header class="topbar" data-testid="topbar">
    <a class="brand" href="#" data-action="home" aria-label="Alumno Cero, volver al inicio"><span class="brand-mark" aria-hidden="true">${cero("curioso").replace('role="img"', "")}</span><span class="brand-name">Alumno Cero</span></a>
    <div class="topbar-right">
      ${canBack ? `<button class="btn btn-ghost btn-sm" data-action="back"><span aria-hidden="true">←</span> Atrás</button>` : ""}
      ${state.screen !== "welcome" ? `<button class="btn btn-ghost btn-sm" data-action="reset" title="Borra tu progreso de este navegador">Empezar de nuevo</button>` : ""}
    </div>
  </header>
  ${state.screen !== "welcome" ? `
  <div class="progress" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="${TOTAL}" aria-valuenow="${step}" aria-valuetext="Paso ${step} de ${TOTAL}: ${STEP_LABEL[state.screen]}">
    <p class="progress-label"><span class="progress-step">Paso ${step} de ${TOTAL}</span> <span class="progress-name">${STEP_LABEL[state.screen]}</span></p>
    <div class="progress-track" aria-hidden="true">${segs}</div>
  </div>` : ""}`;
}

function flashHtml() {
  if (!flash) return "";
  return `<div class="flash flash-${flash.kind}" role="${flash.kind === "error" ? "alert" : "status"}" data-testid="flash">${esc(flash.text)}</div>`;
}

function footer() {
  return `<footer class="footer">
    <p><strong>Tus datos se quedan aquí.</strong> Todo se guarda solo en este navegador. Sin cuenta. Sin enviar tus explicaciones a ningún servidor.${storageOk ? "" : ` <span class="warn-inline">Tu navegador bloquea el almacenamiento: no podré recordar tu progreso.</span>`}</p>
    <p>Alumno Cero es una herramienta de práctica con temas seleccionados, no reemplaza a un docente.</p>
  </footer>`;
}

/* -------------------------------- screens -------------------------------- */

function viewWelcome() {
  const hasProgress = state.topicId && state.screen === "welcome" && (state.text || state.history.length);
  return `
  <section class="hero" aria-labelledby="h-welcome">
    <div class="hero-copy">
      <h1 id="h-welcome" class="display">Enséñale a Cero. Su error te muestra el tuyo.</h1>
      <p class="lead">Cero es una IA que solo sabe lo que tú le explicas. Resuelve un problema nuevo con tu explicación y, si falla, señala la frase tuya que lo confundió.</p>
      <dl class="pitch" data-testid="value-prop">
        <div><dt>Para quién</dt><dd>Estudiantes que leen un tema, lo entienden… y se traban al aplicarlo.</dd></div>
        <div><dt>El problema</dt><dd>Releer da sensación de dominio, pero nadie te dice dónde está tu error.</dd></div>
        <div><dt>Lo que te llevas</dt><dd>Tu frase equivocada señalada, una práctica corta y una ficha con tu explicación corregida.</dd></div>
      </dl>
      <div class="cta-row">
        <button class="btn btn-primary btn-lg" data-action="start" data-testid="start">Empezar (2 minutos)</button>
        ${hasProgress ? `<button class="btn btn-secondary btn-lg" data-action="resume" data-testid="resume">Continuar donde lo dejé</button>` : ""}
      </div>
      <ul class="trust" aria-label="Garantías">
        <li>Gratis y sin registro</li><li>Funciona sin conexión una vez cargada</li><li>Tus datos no salen de tu dispositivo</li>
      </ul>
    </div>
    <figure class="specimen" aria-label="Ejemplo de lo que verás">
      <div class="specimen-paper">
        ${cero("confundido", "cero-lg")}
        <p class="specimen-quote">«El interés se calcula sobre <mark class="pen">lo que pediste</mark>.»</p>
        <p class="pen-note" aria-hidden="true">Reprobé por esto que me enseñaste.</p>
      </div>
      <figcaption>Ejemplo real de la demo: Cero calculó mal un préstamo y señaló la frase que lo confundió.</figcaption>
    </figure>
  </section>
  <section class="how" aria-labelledby="h-how">
    <h2 id="h-how">Cómo funciona</h2>
    <ol class="how-list">
      <li><strong>Enseñas.</strong> Con tus palabras, por texto o voz.</li>
      <li><strong>Cero lo intenta.</strong> Resuelve un problema nuevo usando solo tu explicación.</li>
      <li><strong>Ves tu hueco.</strong> Si falla, se resalta la frase que lo causó.</li>
      <li><strong>Lo corriges</strong> y te llevas tu ficha de dominio.</li>
    </ol>
    <p class="note">Referencia: el «efecto protegido» (Chase et al., 2009) muestra que enseñar a un agente aumenta el esfuerzo de aprendizaje. <a href="https://purl.stanford.edu/zm369yx3532" target="_blank" rel="noopener">Ver estudio<span class="sr-only"> (se abre en otra pestaña)</span></a>.</p>
  </section>`;
}

function viewGoal() {
  return `
  <section aria-labelledby="h-goal">
    ${ceroSays("curioso", "Hola, soy Cero. No sé nada de nada. Elige qué me vas a enseñar.")}
    <h1 id="h-goal">¿Qué quieres dominar?</h1>
    <fieldset class="cards cards-topics" data-testid="topics">
      <legend class="sr-only">Tema</legend>
      ${TOPICS.map((t) => `
      <label class="card choice ${state.topicId === t.id ? "selected" : ""}">
        <input type="radio" name="topic" value="${t.id}" ${state.topicId === t.id ? "checked" : ""} />
        <span class="choice-emoji" aria-hidden="true">${t.emoji}</span>
        <span class="choice-text"><strong>${esc(t.title)}</strong><small>${esc(t.blurb)}</small></span>
      </label>`).join("")}
    </fieldset>
    <h2>¿Para qué lo necesitas?</h2>
    <fieldset class="cards cards-goals" data-testid="goals">
      <legend class="sr-only">Objetivo</legend>
      ${GOALS.map((g) => `
      <label class="card choice ${state.goal === g.id ? "selected" : ""}">
        <input type="radio" name="goal" value="${g.id}" ${state.goal === g.id ? "checked" : ""} />
        <span class="choice-text">${esc(g.label)}</span>
      </label>`).join("")}
    </fieldset>
    ${flashHtml()}
    <div class="cta-row"><button class="btn btn-primary btn-lg" data-action="goal-next" data-testid="goal-next">Continuar</button></div>
  </section>`;
}

function viewFrictions() {
  const t = topic();
  return `
  <section aria-labelledby="h-fr">
    ${ceroSays("curioso", "Cuéntame qué te cuesta. Con eso ajusto el examen que voy a rendir.")}
    <h1 id="h-fr">¿Te pasa algo de esto con «${esc(t.title)}»?</h1>
    <p class="lead">Responde con «Sí me pasa» o «No». Puedes cambiarlo cuando quieras, o saltarte este paso.</p>
    <ul class="friction-list" data-testid="frictions">
      ${FRICTIONS.map((f) => {
        const v = state.frictions[f.id];
        return `<li class="card friction ${v === true ? "is-yes" : v === false ? "is-no" : ""}">
          <p>${esc(f.text)}</p>
          <div class="seg" role="group" aria-label="${esc(f.text)}">
            <button class="btn ${v === true ? "btn-primary" : "btn-secondary"}" data-action="friction" data-id="${f.id}" data-val="1" aria-pressed="${v === true}">Sí me pasa</button>
            <button class="btn ${v === false ? "btn-primary" : "btn-secondary"}" data-action="friction" data-id="${f.id}" data-val="0" aria-pressed="${v === false}">No</button>
          </div>
        </li>`;
      }).join("")}
    </ul>
    <div class="cta-row">
      <button class="btn btn-primary btn-lg" data-action="fr-next" data-testid="fr-next">Continuar</button>
      <button class="btn btn-ghost" data-action="fr-next">Omitir este paso</button>
    </div>
  </section>`;
}

function frictionSummary() {
  const yes = FRICTIONS.filter((f) => state.frictions[f.id] === true).map((f) => f.id);
  const bits = [];
  if (yes.includes("leo")) bits.push("el examen usará un caso nuevo, no el que ya viste");
  if (yes.includes("bloqueo")) bits.push("Cero te dará pistas antes de que falles");
  if (yes.includes("poco")) bits.push("verás una práctica corta de 2 preguntas");
  if (yes.includes("nose")) bits.push("te mostraré tu frase exacta que causó el error");
  if (yes.includes("sinnet")) bits.push("esta app funciona sin conexión");
  return bits;
}

function viewPrefs() {
  const bits = frictionSummary();
  const g = GOALS.find((x) => x.id === state.goal);
  return `
  <section aria-labelledby="h-pref">
    <h1 id="h-pref">Elige cómo será Cero</h1>
    <p class="lead">Esta elección cambia de verdad cómo pregunta y qué examen te toca.</p>
    <fieldset class="cards cards-levels" data-testid="levels">
      <legend class="sr-only">Nivel de Cero</legend>
      ${Object.values(LEVELS).map((l) => `
      <label class="card choice ${state.level === l.id ? "selected" : ""}">
        <input type="radio" name="level" value="${l.id}" ${state.level === l.id ? "checked" : ""} />
        <span class="choice-text"><strong>${esc(l.name)}</strong><small>${esc(l.tag)}</small></span>
      </label>`).join("")}
    </fieldset>
    <div class="preview" aria-live="polite" data-testid="level-preview">
      ${ceroSays("curioso", `<span class="bubble-kicker">Así preguntará Cero:</span> «${esc(topic().concepts[1]?.ask[state.level] ?? topic().concepts[0].ask[state.level])}»`)}
    </div>
    <h2>Cómo prefieres enseñar</h2>
    <fieldset class="cards cards-modes" data-testid="modes">
      <legend class="sr-only">Modo de entrada</legend>
      <label class="card choice ${state.inputMode === "text" ? "selected" : ""}"><input type="radio" name="mode" value="text" ${state.inputMode === "text" ? "checked" : ""} /><span class="choice-text">Escribiendo</span></label>
      <label class="card choice ${state.inputMode === "voice" ? "selected" : ""} ${speech.supported ? "" : "disabled"}"><input type="radio" name="mode" value="voice" ${state.inputMode === "voice" ? "checked" : ""} ${speech.supported ? "" : "disabled"} /><span class="choice-text">Dictando por voz${speech.supported ? "" : "<small>No disponible en este navegador</small>"}</span></label>
    </fieldset>
    ${state.inputMode === "voice" ? `<p class="note">Solo pediré el micrófono cuando pulses «Dictar», para transformar tu voz en texto en tu navegador. Puedes rechazar el permiso y seguir escribiendo.</p>` : ""}
    ${(bits.length || g) ? `<div class="plan" data-testid="plan"><h2 class="plan-title">Tu sesión personalizada</h2><ul>${g ? `<li>${esc(g.cero)}</li>` : ""}${bits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}
    <div class="cta-row"><button class="btn btn-primary btn-lg" data-action="prefs-next" data-testid="prefs-next">Ir a enseñarle a Cero</button></div>
  </section>`;
}

function viewTeach() {
  const t = topic();
  const l = level();
  const last = state.history[state.history.length - 1];
  const blame = state.exam?.blame;
  const hl = blame?.sentence ? `<div class="callout" data-testid="retry-callout"><p><strong>Para corregir:</strong> la frase «<mark class="pen">${esc(blame.sentence)}</mark>» le enseñó algo incorrecto a Cero. Edítala abajo.</p></div>` : last && !last.passed && blame ? `<div class="callout" data-testid="retry-callout"><p><strong>Para corregir:</strong> ${esc(blame.message)}</p></div>` : "";
  return `
  <section aria-labelledby="h-teach">
    ${ceroSays(state.attempt > 0 ? "pensando" : "curioso", `<strong>${esc(l.name)}:</strong> ${esc(l.intro)}`)}
    <h1 id="h-teach">Enséñale: ${esc(t.title)}</h1>
    <p class="lead">${esc(t.starter)}</p>
    ${hl}
    <label for="explanation" class="label">Tu explicación</label>
    <textarea id="explanation" class="notebook" data-testid="explanation" rows="9" placeholder="${esc(t.hint)}" aria-describedby="teach-help">${esc(state.text)}</textarea>
    <p id="teach-help" class="note"><span id="wordcount">0</span> palabras. Mínimo recomendado: 25. Cero solo usará lo que escribas aquí.</p>
    ${flashHtml()}
    <div class="cta-row">
      <button class="btn btn-primary btn-lg" data-action="teach-submit" data-testid="teach-submit">Enseñar a Cero</button>
      ${speech.supported ? `<button class="btn btn-secondary" data-action="dictate" aria-pressed="${speech.active}" data-testid="dictate">${speech.active ? `<span class="rec-dot" aria-hidden="true"></span> Detener dictado` : "Dictar por voz"}</button>` : ""}
    </div>
    <div class="aux-row">
      <button class="btn btn-ghost" data-action="demo-text" data-testid="demo-text" title="Rellena un ejemplo con un malentendido típico para probar la app">Cargar ejemplo de demo</button>
      ${state.attempt > 0 ? `<button class="btn btn-ghost" data-action="model-text">Ver una explicación de referencia</button>` : ""}
    </div>
  </section>`;
}

function viewReading() {
  const a = state.analysis;
  return `
  <section class="reading" aria-labelledby="h-read" aria-live="polite">
    ${cero("pensando", "cero-lg cero-think")}
    <h1 id="h-read">Cero está leyendo tu explicación…</h1>
    <p class="lead" data-testid="processing">Analizando en tu dispositivo: ${a.log.sentences} frases, ${a.log.matched} ideas clave reconocidas. No se envía nada a internet.</p>
    <div class="spinner" aria-hidden="true"><span></span><span></span><span></span></div>
  </section>`;
}

function viewReflect() {
  const t = topic();
  const a = state.analysis;
  const refl = reflect(t, a);
  const qs = questionsFor(t, a, state.level);
  return `
  <section aria-labelledby="h-reflect">
    <div class="cero-row cero-row-title">${cero(qs.length ? "curioso" : "feliz")}<h1 id="h-reflect">Esto es lo que entendí</h1></div>
    <ul class="understood" data-testid="understood">
      ${refl.map((r) => `
      <li class="card note-card ${r.state}">
        ${r.state === "missing" ? `<p><span class="badge badge-gap">No me lo dijiste</span> ${esc(t.concepts.find((c) => c.id === r.conceptId).label)}</p>` : `
        <p><span class="badge ${r.state === "known" ? "badge-ok" : "badge-warn"}">${r.state === "known" ? "Entendido" : "Entendí esto"}</span> ${esc(r.understood)}</p>
        <blockquote>«${esc(r.quote)}»</blockquote>`}
      </li>`).join("")}
    </ul>
    ${qs.length ? `<div class="questions" data-testid="questions"><h2 class="plan-title">Mis dudas</h2><ul>${qs.map((q) => `<li>${esc(q.text)}</li>`).join("")}</ul></div>` : `<p class="note">No tengo dudas. Creo que puedo intentarlo.</p>`}
    <div class="cta-row">
      <button class="btn btn-primary btn-lg" data-action="take-exam" data-testid="take-exam">Dejar que Cero haga el examen</button>
      <button class="btn btn-secondary" data-action="edit-text">Añadir o corregir mi explicación</button>
    </div>
  </section>`;
}

function viewExam() {
  const t = topic();
  const e = state.exam;
  const v = t.variants.find((x) => x.id === e.variantId);
  return `
  <section aria-labelledby="h-exam">
    <div class="cero-row cero-row-title">${cero("pensando")}<div><p class="kicker">Examen de transferencia: un caso que Cero nunca vio</p><h1 id="h-exam">Problema</h1></div></div>
    <div class="exam-paper"><p>${esc(v.context)}</p><p class="exam-q"><strong>${esc(v.question)}</strong></p></div>
    <h2>Así razona Cero (solo con lo que le enseñaste)</h2>
    <ol class="steps" data-testid="steps">
      ${e.steps.map((s) => `<li class="${s.ok ? "ok" : "bad"}"><span class="badge ${s.ok ? "badge-ok" : "badge-warn"}">${s.ok ? "Tú me lo enseñaste" : s.source === "user-wrong" ? "Eso me dijiste" : "Me faltó información"}</span> ${esc(s.text)}</li>`).join("")}
    </ol>
    ${e.rows.length ? `<div class="table-wrap" role="region" aria-label="Cálculo de Cero" tabindex="0"><table class="calc" data-testid="calc"><caption class="sr-only">Cálculo de Cero</caption><thead><tr><th scope="col">Paso</th><th scope="col">Cálculo</th><th scope="col">Resultado</th></tr></thead><tbody>${e.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.detail)}</td><td>${esc(r.total)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="answer" data-testid="cero-answer"><p class="answer-label">Respuesta de Cero</p><p class="big">${esc(e.answerText)}</p></div>
    <div class="cta-row"><button class="btn btn-primary btn-lg" data-action="see-result" data-testid="see-result">Ver si acertó</button></div>
  </section>`;
}

function viewResult() {
  const t = topic();
  const e = state.exam;
  if (e.passed) {
    return `
    <section class="verdict verdict-pass" aria-labelledby="h-res" data-testid="result-pass">
      <div class="verdict-head">${cero("feliz", "cero-xl cero-hop")}<p class="stamp stamp-ok" aria-hidden="true">Aprobado</p></div>
      <h1 id="h-res" class="display">¡Aprobé! 🎉</h1>
      <p class="lead">Cero resolvió un caso <strong>nuevo</strong> usando solo tu explicación. Respuesta correcta: <strong class="nowrap">${esc(e.expectedText)}</strong>.</p>
      <div class="cta-row">
        <button class="btn btn-primary btn-lg" data-action="finish" data-testid="finish">Ver mi ficha de dominio</button>
      </div>
    </section>`;
  }
  const b = e.blame;
  const spanish = b.state === "wrong";
  return `
  <section class="verdict verdict-fail" aria-labelledby="h-res" data-testid="result-fail">
    <div class="verdict-head">${cero("confundido", "cero-xl cero-shake")}<p class="kicker">Me equivoqué… y tiene arreglo</p></div>
    <h1 id="h-res" class="display">Reprobé por esto que me enseñaste.</h1>
    <div class="answers">
      <p class="ans ans-bad"><span class="ans-label">Respondí</span> <s>${esc(e.answerText)}</s></p>
      <p class="ans ans-good"><span class="ans-label">Lo correcto era</span> <strong>${esc(e.expectedText)}</strong></p>
    </div>
    ${spanish && b.sentence
      ? `<figure class="blame-fig"><figcaption class="pen-note">Tu frase, tal como me la enseñaste:</figcaption><blockquote class="blame" data-testid="blame">«<mark>${esc(b.sentence)}</mark>»</blockquote></figure>`
      : `<div class="blame blame-gap" data-testid="blame"><p><strong>Hueco detectado:</strong> ${esc(b.conceptLabel)}</p></div>`}
    <p class="blame-why">${esc(b.message)}</p>
    ${b.alsoFailing.length ? `<p class="note">También me faltó aclarar: ${b.alsoFailing.map((id) => esc(t.concepts.find((c) => c.id === id).label)).join("; ")}.</p>` : ""}
    <div class="cta-row">
      <button class="btn btn-primary btn-lg" data-action="start-practice" data-testid="start-practice">Practicar este punto (2 preguntas)</button>
      <button class="btn btn-secondary" data-action="edit-text">Reexplicarle directamente</button>
    </div>
  </section>`;
}

function viewPractice() {
  const t = topic();
  const p = state.practice;
  const bank = t.practice[p.conceptId] ?? [];
  const q = bank[p.index];
  if (!q) return "";
  const label = t.concepts.find((c) => c.id === p.conceptId).label;
  const answered = p.answers[p.index] !== undefined;
  const chosen = p.answers[p.index];
  const letters = "ABCDEFG";
  return `
  <section aria-labelledby="h-prac">
    <p class="kicker">Mini-práctica dirigida: ${esc(label)}</p>
    <h1 id="h-prac">Pregunta ${p.index + 1} de ${bank.length}</h1>
    <p class="lead q-text">${esc(q.q)}</p>
    <ul class="options" data-testid="options">
      ${q.options.map((o, i) => {
        const cls = answered ? (i === q.correct ? "correct" : i === chosen ? "wrong" : "") : "";
        const mark = answered && i === q.correct ? `<span class="sr-only"> (respuesta correcta)</span>` : answered && i === chosen ? `<span class="sr-only"> (tu respuesta)</span>` : "";
        return `
      <li><button class="btn option ${cls}" data-action="practice-answer" data-i="${i}" ${answered ? "disabled" : ""}><span class="opt-letter" aria-hidden="true">${letters[i]}</span><span class="opt-text">${esc(o)}${mark}</span></button></li>`;
      }).join("")}
    </ul>
    ${answered ? `<div class="feedback ${chosen === q.correct ? "ok" : "bad"}" role="status"><p><strong>${chosen === q.correct ? "¡Correcto!" : "No exactamente."}</strong> ${esc(q.why)}</p></div>
    <div class="cta-row"><button class="btn btn-primary btn-lg" data-action="practice-next" data-testid="practice-next">${p.index + 1 < bank.length ? "Siguiente pregunta" : "Volver a enseñarle a Cero"}</button></div>` : ""}
  </section>`;
}

function viewCard() {
  const t = topic();
  const m = state.mastered;
  return `
  <section aria-labelledby="h-card">
    <div class="cero-row cero-row-title">${cero("feliz")}<h1 id="h-card">Tu ficha de dominio</h1></div>
    <article class="mastery" data-testid="mastery-card" id="mastery-card">
      <header class="mastery-head">
        <p class="mastery-topic"><span aria-hidden="true">${esc(t.emoji)}</span> ${esc(t.title)}</p>
        <p class="mastery-date">Dominado el ${esc(new Date(m.at).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }))}</p>
      </header>
      <h2>Mi explicación (ya corregida)</h2>
      <blockquote class="own">${esc(m.text).replace(/\n/g, "<br />")}</blockquote>
      <h2>Conceptos que Cero usó correctamente</h2>
      <ul class="check">${m.concepts.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <h2>Tu acción para esta semana</h2>
      <p>${esc(t.action)}</p>
      <h2>Referencia</h2>
      <p><a href="${esc(t.reference.url)}" target="_blank" rel="noopener">${esc(t.reference.label)}<span class="sr-only"> (se abre en otra pestaña)</span></a><br /><small>${esc(t.reference.note)}</small></p>
      <p class="note">Intentos hasta aprobar: ${state.history.length}${state.history.some((h) => !h.passed) ? " (aprender de los errores también cuenta)" : ""}.</p>
    </article>
    <div class="cta-row">
      <button class="btn btn-primary" data-action="copy-card" data-testid="copy-card">Copiar ficha</button>
      <button class="btn btn-secondary" data-action="download-card">Descargar (.txt)</button>
      <button class="btn btn-secondary" data-action="print-card">Imprimir / PDF</button>
    </div>
    <p class="note">Compartir es opcional. Tu progreso queda guardado aquí; no necesitas crear una cuenta.</p>
    <button class="btn btn-ghost" data-action="another-topic">Dominar otro tema</button>
  </section>`;
}

const VIEWS = { welcome: viewWelcome, goal: viewGoal, frictions: viewFrictions, prefs: viewPrefs, teach: viewTeach, reading: viewReading, reflect: viewReflect, exam: viewExam, result: viewResult, practice: viewPractice, card: viewCard };

function render() {
  if (!STEPS.includes(state.screen)) state.screen = "welcome";
  // Guards: never render a screen whose data is missing (e.g. after a corrupted/partial save).
  const need = { frictions: "topicId", prefs: "topicId", teach: "topicId", reading: "analysis", reflect: "analysis", exam: "exam", result: "exam", practice: "practice", card: "mastered" };
  if (need[state.screen] && !state[need[state.screen]] && !(need[state.screen] === "topicId" && state.topicId)) {
    state.screen = state.topicId ? "teach" : "welcome";
  }
  const keep = focusKey(document.activeElement);
  root.dataset.screen = state.screen;
  root.innerHTML = `${header()}<main id="main" tabindex="-1">${state.screen === "welcome" || !flash || state.screen === "teach" || state.screen === "goal" ? "" : flashHtml()}${VIEWS[state.screen]()}</main>${footer()}`;
  const h = root.querySelector("main h1");
  if (h) { h.setAttribute("tabindex", "-1"); }
  // Move focus to the new screen's heading so keyboard and screen-reader users land on it.
  if (render.lastScreen && render.lastScreen !== state.screen && h) h.focus({ preventScroll: true });
  else if (keep && render.lastScreen === state.screen) restoreFocus(keep);
  render.lastScreen = state.screen;
  if (state.screen === "teach") updateWordCount();
  if (state.screen === "reading") {
    clearTimeout(render.timer);
    render.timer = setTimeout(() => { if (state.screen === "reading") go("reflect"); }, 1400);
  }
}

// Re-rendering replaces the DOM; keep keyboard focus on the equivalent control.
function focusKey(el) {
  if (!el || el === document.body || !root.contains(el)) return null;
  if (el.name && el.type === "radio") return `input[name="${el.name}"][value="${el.value}"]`;
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.dataset.action) {
    let sel = `[data-action="${el.dataset.action}"]`;
    for (const k of ["id", "val", "i"]) if (el.dataset[k] !== undefined) sel += `[data-${k}="${el.dataset[k]}"]`;
    return sel;
  }
  return null;
}
function restoreFocus(sel) {
  const el = root.querySelector(sel);
  const target = el && !el.disabled ? el : root.querySelector('[data-testid="practice-next"]') ?? root.querySelector("main h1");
  target?.focus({ preventScroll: true });
}

function updateWordCount() {
  const ta = document.getElementById("explanation");
  const out = document.getElementById("wordcount");
  if (ta && out) out.textContent = String(ta.value.trim().split(/\s+/).filter(Boolean).length);
}

/* -------------------------------- actions -------------------------------- */

function cardText() {
  const t = topic();
  const m = state.mastered;
  return [`ALUMNO CERO — Ficha de dominio: ${t.title}`, "", "Mi explicación (ya corregida):", m.text, "", "Conceptos que Cero usó correctamente:", ...m.concepts.map((c) => `- ${c}`), "", `Acción para esta semana: ${t.action}`, "", `Referencia: ${t.reference.label} — ${t.reference.url}`].join("\n");
}

const actions = {
  home() { go("welcome"); },
  start() { go("goal"); },
  resume() { go(state.screen === "welcome" ? (state.mastered ? "card" : state.analysis ? "reflect" : "teach") : state.screen); },
  back() {
    const prev = { goal: "welcome", frictions: "goal", prefs: "frictions", teach: "prefs" }[state.screen];
    if (prev) go(prev);
  },
  reset() {
    if (!confirm("¿Borrar tu progreso en este navegador y empezar de nuevo?")) return;
    clear(); state = initialState(); persist(); render();
  },
  "goal-next"() {
    if (!state.topicId) return setFlash("error", "Elige un tema para continuar.");
    if (!state.goal) return setFlash("error", "Cuéntame para qué lo necesitas; así adapto la sesión.");
    go("frictions");
  },
  friction(el) { state.frictions[el.dataset.id] = el.dataset.val === "1"; persist(); render(); },
  "fr-next"() { go("prefs"); },
  "prefs-next"() { go("teach"); },
  "demo-text"() {
    state.text = DEMO_BAD[state.topicId]; flash = null;
    persist(); render();
  },
  "model-text"() {
    if (!confirm("Esto reemplazará tu texto por una explicación de referencia. ¿Continuar?")) return;
    state.text = topic().modelExplanation; persist(); render();
  },
  "teach-submit"() {
    const ta = document.getElementById("explanation");
    state.text = ta ? ta.value : state.text;
    const check = validateExplanation(topic(), state.text);
    if (!check.ok) { persist(); return setFlash("error", check.message); }
    state.analysis = analyze(topic(), state.text);
    state.exam = null;
    go("reading");
  },
  "edit-text"() { go("teach"); },
  "take-exam"() {
    const variant = pickVariant(topic(), state.level, state.attempt);
    state.exam = takeExam(topic(), variant, state.analysis);
    go("exam");
  },
  "see-result"() {
    state.history.push({ attempt: state.attempt + 1, passed: state.exam.passed, variantId: state.exam.variantId, at: Date.now() });
    state.attempt += 1;
    go("result");
  },
  finish() {
    const t = topic();
    state.mastered = { text: state.text, concepts: knownConcepts(t, state.analysis).map((c) => c.label), at: Date.now() };
    go("card");
  },
  "start-practice"() {
    const id = state.exam.blame.conceptId;
    state.practice = { conceptId: id, index: 0, answers: [] };
    go("practice");
  },
  "practice-answer"(el) {
    state.practice.answers[state.practice.index] = Number(el.dataset.i);
    persist(); render();
  },
  "practice-next"() {
    const bank = topic().practice[state.practice.conceptId] ?? [];
    if (state.practice.index + 1 < bank.length) { state.practice.index += 1; persist(); render(); }
    else { state.practiced[state.practice.conceptId] = true; go("teach"); }
  },
  async "copy-card"() {
    try { await navigator.clipboard.writeText(cardText()); setFlash("info", "Ficha copiada al portapapeles."); }
    catch { setFlash("error", "Tu navegador no permitió copiar. Usa «Descargar (.txt)»."); }
  },
  "download-card"() {
    const blob = new Blob([cardText()], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `ficha-${state.topicId}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  "print-card"() { window.print(); },
  "another-topic"() {
    const keepLevel = state.level;
    state = { ...initialState(), level: keepLevel, screen: "goal" };
    persist(); render();
  },
  dictate() {
    if (!SR) return;
    if (speech.active) { speech.rec?.stop(); return; }
    const rec = new SR();
    rec.lang = "es-PE"; rec.continuous = true; rec.interimResults = false;
    const ta = document.getElementById("explanation");
    rec.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) { ta.value = `${ta.value} ${ev.results[i][0].transcript}`.trim(); state.text = ta.value; updateWordCount(); persist(); }
      }
    };
    rec.onerror = (ev) => {
      speech.active = false;
      setFlash("error", ev.error === "not-allowed" ? "No diste permiso al micrófono. Sin problema: puedes seguir escribiendo." : "No pude escuchar bien. Puedes intentar de nuevo o escribir.");
    };
    rec.onend = () => { speech.active = false; if (state.screen === "teach") render(); };
    speech.rec = rec; speech.active = true;
    try { rec.start(); render(); } catch { speech.active = false; }
  },
};

root.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  ev.preventDefault();
  const fn = actions[el.dataset.action];
  if (fn) fn(el);
});

root.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.name === "topic") { if (state.topicId !== t.value) { state.topicId = t.value; state.text = ""; state.analysis = null; state.exam = null; state.history = []; state.attempt = 0; } }
  else if (t.name === "goal") state.goal = t.value;
  else if (t.name === "level") state.level = t.value;
  else if (t.name === "mode") state.inputMode = t.value;
  else return;
  flash = null; persist(); render();
});

root.addEventListener("input", (ev) => {
  if (ev.target.id === "explanation") { state.text = ev.target.value; updateWordCount(); persist(); }
});

render();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
