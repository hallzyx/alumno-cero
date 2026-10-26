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

function header() {
  const step = PROGRESS[state.screen] ?? 0;
  const pct = Math.round((step / TOTAL) * 100);
  const canBack = ["goal", "frictions", "prefs", "teach"].includes(state.screen);
  return `
  <header class="topbar" data-testid="topbar">
    <a class="brand" href="#" data-action="home" aria-label="Alumno Cero, volver al inicio"><span class="brand-mark" aria-hidden="true">0</span> Alumno Cero</a>
    <div class="topbar-right">
      ${canBack ? `<button class="btn btn-ghost" data-action="back">← Atrás</button>` : ""}
      ${state.screen !== "welcome" ? `<button class="btn btn-ghost" data-action="reset" title="Borra tu progreso de este navegador">Empezar de nuevo</button>` : ""}
    </div>
  </header>
  ${state.screen !== "welcome" ? `
  <div class="progress" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="${TOTAL}" aria-valuenow="${step}" aria-valuetext="Paso ${step} de ${TOTAL}: ${STEP_LABEL[state.screen]}">
    <div class="progress-bar" style="width:${pct}%"></div>
    <p class="progress-label">Paso ${step} de ${TOTAL} · ${STEP_LABEL[state.screen]}</p>
  </div>` : ""}`;
}

function flashHtml() {
  if (!flash) return "";
  return `<div class="flash flash-${flash.kind}" role="${flash.kind === "error" ? "alert" : "status"}" data-testid="flash">${esc(flash.text)}</div>`;
}

function footer() {
  return `<footer class="footer">
    <p>Todo se guarda solo en este navegador. Sin cuenta. Sin enviar tus explicaciones a ningún servidor.${storageOk ? "" : " ⚠️ Tu navegador bloquea el almacenamiento: no podré recordar tu progreso."}</p>
    <p>Alumno Cero es una herramienta de práctica con temas seleccionados, no reemplaza a un docente.</p>
  </footer>`;
}

/* -------------------------------- screens -------------------------------- */

function viewWelcome() {
  const hasProgress = state.topicId && state.screen === "welcome" && (state.text || state.history.length);
  return `
  <section class="hero" aria-labelledby="h-welcome">
    <p class="eyebrow">Para quien lee, entiende… y aun así falla al aplicarlo</p>
    <h1 id="h-welcome">Aprende enseñándole a una IA que <em>no sabe nada</em>.</h1>
    <p class="lead">Explícale un tema a Cero. Él solo puede usar <strong>lo que tú le digas</strong>. Si se equivoca en un problema nuevo, te muestra <strong>qué frase tuya</strong> lo confundió.</p>
    <div class="cta-row">
      <button class="btn btn-primary btn-lg" data-action="start" data-testid="start">Empezar (2 minutos)</button>
      ${hasProgress ? `<button class="btn btn-secondary btn-lg" data-action="resume" data-testid="resume">Continuar donde lo dejé</button>` : ""}
    </div>
    <ul class="trust" aria-label="Garantías">
      <li>Gratis y sin registro</li><li>Funciona sin conexión una vez cargada</li><li>Tus datos no salen de tu dispositivo</li>
    </ul>
  </section>
  <section class="how" aria-labelledby="h-how">
    <h2 id="h-how">Cómo funciona</h2>
    <ol class="how-list">
      <li><strong>Enseñas.</strong> Con tus palabras, por texto o voz.</li>
      <li><strong>Cero lo intenta.</strong> Resuelve un problema nuevo usando solo tu explicación.</li>
      <li><strong>Ves tu hueco.</strong> Si falla, se resalta la frase que lo causó.</li>
      <li><strong>Lo corriges</strong> y te llevas tu ficha de dominio.</li>
    </ol>
    <p class="note">Referencia: el «efecto protegido» (Chase et al., 2009) muestra que enseñar a un agente aumenta el esfuerzo de aprendizaje. <a href="https://purl.stanford.edu/zm369yx3532" target="_blank" rel="noopener">Ver estudio</a>.</p>
  </section>`;
}

function viewGoal() {
  return `
  <section aria-labelledby="h-goal">
    <h1 id="h-goal">¿Qué quieres dominar?</h1>
    <fieldset class="cards" data-testid="topics">
      <legend class="sr-only">Tema</legend>
      ${TOPICS.map((t) => `
      <label class="card choice ${state.topicId === t.id ? "selected" : ""}">
        <input type="radio" name="topic" value="${t.id}" ${state.topicId === t.id ? "checked" : ""} />
        <span class="choice-emoji" aria-hidden="true">${t.emoji}</span>
        <span><strong>${esc(t.title)}</strong><br /><small>${esc(t.blurb)}</small></span>
      </label>`).join("")}
    </fieldset>
    <h2>¿Para qué lo necesitas?</h2>
    <fieldset class="cards" data-testid="goals">
      <legend class="sr-only">Objetivo</legend>
      ${GOALS.map((g) => `
      <label class="card choice ${state.goal === g.id ? "selected" : ""}">
        <input type="radio" name="goal" value="${g.id}" ${state.goal === g.id ? "checked" : ""} />
        <span>${esc(g.label)}</span>
      </label>`).join("")}
    </fieldset>
    ${flashHtml()}
    <button class="btn btn-primary" data-action="goal-next" data-testid="goal-next">Continuar</button>
  </section>`;
}

function viewFrictions() {
  const t = topic();
  return `
  <section aria-labelledby="h-fr">
    <h1 id="h-fr">¿Te pasa algo de esto con «${esc(t.title)}»?</h1>
    <p class="lead">Responde con «Sí me pasa» o «No». Puedes cambiarlo cuando quieras.</p>
    <ul class="friction-list" data-testid="frictions">
      ${FRICTIONS.map((f) => {
        const v = state.frictions[f.id];
        return `<li class="card friction">
          <p>${esc(f.text)}</p>
          <div class="seg" role="group" aria-label="${esc(f.text)}">
            <button class="btn ${v === true ? "btn-primary" : "btn-secondary"}" data-action="friction" data-id="${f.id}" data-val="1" aria-pressed="${v === true}">Sí me pasa</button>
            <button class="btn ${v === false ? "btn-primary" : "btn-secondary"}" data-action="friction" data-id="${f.id}" data-val="0" aria-pressed="${v === false}">No</button>
          </div>
        </li>`;
      }).join("")}
    </ul>
    <button class="btn btn-primary" data-action="fr-next" data-testid="fr-next">Continuar</button>
    <button class="btn btn-ghost" data-action="fr-next">Omitir</button>
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
    <fieldset class="cards" data-testid="levels">
      <legend class="sr-only">Nivel de Cero</legend>
      ${Object.values(LEVELS).map((l) => `
      <label class="card choice ${state.level === l.id ? "selected" : ""}">
        <input type="radio" name="level" value="${l.id}" ${state.level === l.id ? "checked" : ""} />
        <span><strong>${esc(l.name)}</strong><br /><small>${esc(l.tag)}</small></span>
      </label>`).join("")}
    </fieldset>
    <div class="card preview" aria-live="polite" data-testid="level-preview">
      <p class="eyebrow">Así preguntará Cero</p>
      <p class="bubble">«${esc(topic().concepts[1]?.ask[state.level] ?? topic().concepts[0].ask[state.level])}»</p>
    </div>
    <h2>Cómo prefieres enseñar</h2>
    <fieldset class="cards" data-testid="modes">
      <legend class="sr-only">Modo de entrada</legend>
      <label class="card choice ${state.inputMode === "text" ? "selected" : ""}"><input type="radio" name="mode" value="text" ${state.inputMode === "text" ? "checked" : ""} /><span>Escribiendo</span></label>
      <label class="card choice ${state.inputMode === "voice" ? "selected" : ""} ${speech.supported ? "" : "disabled"}"><input type="radio" name="mode" value="voice" ${state.inputMode === "voice" ? "checked" : ""} ${speech.supported ? "" : "disabled"} /><span>Dictando por voz${speech.supported ? "" : " (no disponible en este navegador)"}</span></label>
    </fieldset>
    ${state.inputMode === "voice" ? `<p class="note">🎤 Solo pediré el micrófono cuando pulses «Dictar», para transformar tu voz en texto en tu navegador. Puedes rechazar el permiso y seguir escribiendo.</p>` : ""}
    ${(bits.length || g) ? `<div class="card plan" data-testid="plan"><p class="eyebrow">Tu sesión personalizada</p><ul>${g ? `<li>${esc(g.cero)}</li>` : ""}${bits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}
    <button class="btn btn-primary" data-action="prefs-next" data-testid="prefs-next">Ir a enseñarle a Cero</button>
  </section>`;
}

function viewTeach() {
  const t = topic();
  const l = level();
  const last = state.history[state.history.length - 1];
  const blame = state.exam?.blame;
  const hl = blame?.sentence ? `<p class="callout" data-testid="retry-callout"><strong>Para corregir:</strong> la frase «${esc(blame.sentence)}» le enseñó algo incorrecto a Cero. Edítala abajo.</p>` : last && !last.passed && blame ? `<p class="callout" data-testid="retry-callout"><strong>Para corregir:</strong> ${esc(blame.message)}</p>` : "";
  return `
  <section aria-labelledby="h-teach">
    <div class="cero-row"><div class="cero-avatar" aria-hidden="true">0</div><p class="bubble"><strong>${esc(l.name)}:</strong> ${esc(l.intro)}</p></div>
    <h1 id="h-teach">Enséñale: ${esc(t.title)}</h1>
    <p class="lead">${esc(t.starter)}</p>
    ${hl}
    <label for="explanation" class="label">Tu explicación</label>
    <textarea id="explanation" data-testid="explanation" rows="9" placeholder="${esc(t.hint)}" aria-describedby="teach-help">${esc(state.text)}</textarea>
    <p id="teach-help" class="note"><span id="wordcount">0</span> palabras · mínimo recomendado: 25. Cero solo usará lo que escribas aquí.</p>
    ${flashHtml()}
    <div class="cta-row">
      <button class="btn btn-primary btn-lg" data-action="teach-submit" data-testid="teach-submit">Enseñar a Cero</button>
      ${speech.supported ? `<button class="btn btn-secondary" data-action="dictate" aria-pressed="${speech.active}" data-testid="dictate">${speech.active ? "■ Detener dictado" : "🎤 Dictar"}</button>` : ""}
      <button class="btn btn-ghost" data-action="demo-text" data-testid="demo-text" title="Rellena un ejemplo con un malentendido típico para probar la app">Cargar ejemplo de demo</button>
    </div>
    ${state.attempt > 0 ? `<button class="btn btn-ghost" data-action="model-text">Ver una explicación de referencia</button>` : ""}
  </section>`;
}

function viewReading() {
  const a = state.analysis;
  return `
  <section aria-labelledby="h-read" aria-live="polite">
    <h1 id="h-read">Cero está leyendo tu explicación…</h1>
    <p class="lead" data-testid="processing">Analizando en tu dispositivo: ${a.log.sentences} frases, ${a.log.matched} ideas clave reconocidas. No se envía nada a internet.</p>
    <div class="spinner" aria-hidden="true"></div>
  </section>`;
}

function viewReflect() {
  const t = topic();
  const a = state.analysis;
  const refl = reflect(t, a);
  const qs = questionsFor(t, a, state.level);
  return `
  <section aria-labelledby="h-reflect">
    <div class="cero-row"><div class="cero-avatar" aria-hidden="true">0</div><h1 id="h-reflect">Esto es lo que entendí</h1></div>
    <ul class="understood" data-testid="understood">
      ${refl.map((r) => `
      <li class="card ${r.state}">
        ${r.state === "missing" ? `<p><span class="badge badge-gap">No me lo dijiste</span> ${esc(t.concepts.find((c) => c.id === r.conceptId).label)}</p>` : `
        <p><span class="badge ${r.state === "known" ? "badge-ok" : "badge-warn"}">${r.state === "known" ? "Entendido" : "Entendí esto"}</span> ${esc(r.understood)}</p>
        <blockquote>«${esc(r.quote)}»</blockquote>`}
      </li>`).join("")}
    </ul>
    ${qs.length ? `<div class="card questions" data-testid="questions"><p class="eyebrow">Mis dudas</p><ul>${qs.map((q) => `<li>${esc(q.text)}</li>`).join("")}</ul></div>` : `<p class="note">No tengo dudas. Creo que puedo intentarlo.</p>`}
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
    <p class="eyebrow">Examen de transferencia · Caso nuevo</p>
    <h1 id="h-exam">Problema</h1>
    <div class="card case"><p>${esc(v.context)}</p><p><strong>${esc(v.question)}</strong></p></div>
    <h2>Así razona Cero (solo con lo que le enseñaste)</h2>
    <ol class="steps" data-testid="steps">
      ${e.steps.map((s) => `<li class="${s.ok ? "ok" : "bad"}"><span class="badge ${s.ok ? "badge-ok" : "badge-warn"}">${s.ok ? "Tú me lo enseñaste" : s.source === "user-wrong" ? "Eso me dijiste" : "Me faltó información"}</span> ${esc(s.text)}</li>`).join("")}
    </ol>
    ${e.rows.length ? `<table class="calc" data-testid="calc"><caption class="sr-only">Cálculo de Cero</caption><thead><tr><th scope="col">Paso</th><th scope="col">Cálculo</th><th scope="col">Resultado</th></tr></thead><tbody>${e.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.detail)}</td><td>${esc(r.total)}</td></tr>`).join("")}</tbody></table>` : ""}
    <div class="card answer" data-testid="cero-answer"><p class="eyebrow">Respuesta de Cero</p><p class="big">${esc(e.answerText)}</p></div>
    <button class="btn btn-primary btn-lg" data-action="see-result" data-testid="see-result">Ver si acertó</button>
  </section>`;
}

function viewResult() {
  const t = topic();
  const e = state.exam;
  const v = t.variants.find((x) => x.id === e.variantId);
  if (e.passed) {
    return `
    <section aria-labelledby="h-res" data-testid="result-pass">
      <h1 id="h-res">¡Aprobé! 🎉</h1>
      <p class="lead">Cero resolvió un caso <strong>nuevo</strong> usando solo tu explicación. Respuesta correcta: <strong>${esc(e.expectedText)}</strong>.</p>
      <div class="cta-row">
        <button class="btn btn-primary btn-lg" data-action="finish" data-testid="finish">Ver mi ficha de dominio</button>
      </div>
    </section>`;
  }
  const b = e.blame;
  const spanish = b.state === "wrong";
  return `
  <section aria-labelledby="h-res" data-testid="result-fail">
    <p class="eyebrow">Reprobé… y tiene arreglo</p>
    <h1 id="h-res">Reprobé por esto que me enseñaste.</h1>
    <p>Respondí <strong>${esc(e.answerText)}</strong>, pero lo correcto era <strong>${esc(e.expectedText)}</strong>.</p>
    ${spanish && b.sentence ? `<blockquote class="blame" data-testid="blame">«<mark>${esc(b.sentence)}</mark>»</blockquote>` : `<div class="blame blame-gap" data-testid="blame"><p><strong>Hueco detectado:</strong> ${esc(b.conceptLabel)}</p></div>`}
    <p>${esc(b.message)}</p>
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
  return `
  <section aria-labelledby="h-prac">
    <p class="eyebrow">Mini-práctica dirigida · ${esc(label)}</p>
    <h1 id="h-prac">Pregunta ${p.index + 1} de ${bank.length}</h1>
    <p class="lead">${esc(q.q)}</p>
    <ul class="options" data-testid="options">
      ${q.options.map((o, i) => `
      <li><button class="btn option ${answered ? (i === q.correct ? "correct" : i === chosen ? "wrong" : "") : ""}" data-action="practice-answer" data-i="${i}" ${answered ? "disabled" : ""}>${esc(o)}</button></li>`).join("")}
    </ul>
    ${answered ? `<div class="card feedback ${chosen === q.correct ? "ok" : "bad"}" role="status"><p><strong>${chosen === q.correct ? "¡Correcto!" : "No exactamente."}</strong> ${esc(q.why)}</p></div>
    <button class="btn btn-primary" data-action="practice-next" data-testid="practice-next">${p.index + 1 < bank.length ? "Siguiente" : "Volver a enseñarle a Cero"}</button>` : ""}
  </section>`;
}

function viewCard() {
  const t = topic();
  const m = state.mastered;
  return `
  <section aria-labelledby="h-card">
    <h1 id="h-card">Tu ficha de dominio</h1>
    <article class="mastery" data-testid="mastery-card" id="mastery-card">
      <p class="eyebrow">${esc(t.emoji)} ${esc(t.title)} · Dominado el ${esc(new Date(m.at).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }))}</p>
      <h2>Mi explicación (ya corregida)</h2>
      <blockquote class="own">${esc(m.text).replace(/\n/g, "<br />")}</blockquote>
      <h2>Conceptos que Cero usó correctamente</h2>
      <ul class="check">${m.concepts.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <h2>Tu acción para esta semana</h2>
      <p>${esc(t.action)}</p>
      <h2>Referencia</h2>
      <p><a href="${esc(t.reference.url)}" target="_blank" rel="noopener">${esc(t.reference.label)}</a><br /><small>${esc(t.reference.note)}</small></p>
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
  root.innerHTML = `${header()}<main id="main" tabindex="-1">${state.screen === "welcome" || !flash || state.screen === "teach" || state.screen === "goal" ? "" : flashHtml()}${VIEWS[state.screen]()}</main>${footer()}`;
  const h = root.querySelector("main h1");
  if (h) { h.setAttribute("tabindex", "-1"); }
  if (state.screen === "teach") updateWordCount();
  if (state.screen === "reading") {
    clearTimeout(render.timer);
    render.timer = setTimeout(() => { if (state.screen === "reading") go("reflect"); }, 1400);
  }
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
    state.text = DEMO_BAD[state.topicId];
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
