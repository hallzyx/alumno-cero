"use client";
// Alumno Cero — UI controller (React). Engine and topics are pure JS in src/lib.
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookCheck, Brain, Check, ClipboardList, Copy, Download, Dumbbell, Gift, Highlighter,
  House, Keyboard, Lightbulb, LoaderCircle, Lock, MessageCircle, MessageCircleQuestionMark, Mic, PencilLine,
  Calculator, FlaskConical, LogOut, Printer, RotateCcw, Search, SlidersHorizontal, Sparkles, Square, Star, Target, TriangleAlert, Trophy, Users, X,
} from "lucide-react";
import { LEVELS, TOPICS, getTopic } from "@/lib/topics";
import { SUBJECTS, subjectOf } from "@/lib/subjects";
import Mochila from "./Mochila";
import Hub from "./Hub";
import Auth from "./Auth";
import Avatar from "./Avatar";
import RewardToast from "./RewardToast";
import { analyze, knownConcepts, pickVariant, questionsFor, reflect, takeExam, validateExplanation } from "@/lib/engine";
import { clear, initialState, load, save } from "@/lib/store";
import { startRecording } from "@/lib/audio";
import { Cero, CeroSays } from "./Cero";

const STEPS = ["welcome", "auth", "hub", "goal", "frictions", "prefs", "teach", "reading", "reflect", "exam", "result", "practice", "card"];
const STEP_LABEL = { welcome: "Inicio", auth: "Tu cuenta", hub: "Mi hub", goal: "Elige tu tema", frictions: "¿Qué te cuesta?", prefs: "Ajusta a Cero", teach: "Enséñale", reading: "Cero está leyendo", reflect: "Cero te cuenta", exam: "El examen de Cero", result: "Resultado", practice: "Mini-práctica", card: "Tu ficha" };
const PROGRESS = { welcome: 0, auth: 0, hub: 0, goal: 1, frictions: 2, prefs: 3, teach: 4, reading: 5, reflect: 5, exam: 6, result: 7, practice: 7, card: 8 };
const TOTAL = 8;

// Every screen has its own URL: /hub, /temas, /aprender/<tema>/<paso>…
const SLUG = { frictions: "dificultades", prefs: "ajustes", teach: "ensenar", reading: "leyendo", reflect: "cero-responde", exam: "examen", result: "resultado", practice: "practica", card: "ficha" };
const SCREEN_OF = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));
function pathFor(screen, topicId) {
  if (screen === "welcome") return "/";
  if (screen === "auth") return "/cuenta";
  if (screen === "hub") return "/hub";
  if (screen === "goal") return "/temas";
  return topicId && SLUG[screen] ? `/aprender/${topicId}/${SLUG[screen]}` : "/";
}
function parsePath(path) {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { screen: "welcome" };
  if (parts.length === 1 && ["cuenta", "hub", "temas"].includes(parts[0])) return { screen: { cuenta: "auth", hub: "hub", temas: "goal" }[parts[0]] };
  if (parts.length === 3 && parts[0] === "aprender" && getTopic(parts[1]) && SCREEN_OF[parts[2]]) return { screen: SCREEN_OF[parts[2]], topicId: parts[1] };
  return null; // unknown URL: stay where we are
}
// Apply a URL to a state. A different topic in the URL means starting that topic.
function withUrl(s, parsed) {
  if (parsed.topicId && parsed.topicId !== s.topicId) {
    return { ...initialState(), level: s.level, topicId: parsed.topicId, sid: crypto.randomUUID(), locked: true, screen: "goal" };
  }
  return { ...s, screen: parsed.screen };
}
// One icon + short name per station of the path (stations 1..8).
const STATIONS = [
  { icon: Target, name: "Tema" },
  { icon: MessageCircleQuestionMark, name: "Tú" },
  { icon: SlidersHorizontal, name: "Ajustes" },
  { icon: PencilLine, name: "Enseñar" },
  { icon: Brain, name: "Cero lee" },
  { icon: ClipboardList, name: "Examen" },
  { icon: Dumbbell, name: "Repaso" },
  { icon: Trophy, name: "Ficha" },
];

const GOALS = [
  { id: "examen", icon: BookCheck, label: "Para una prueba o examen", cero: "Me enfocaré en que puedas aplicarlo en un problema nuevo." },
  { id: "trabajo", icon: House, label: "Para usarlo en la vida real", cero: "Los problemas del examen serán de la vida diaria." },
  { id: "ensenar", icon: MessageCircle, label: "Para explicárselo a alguien", cero: "Voy a pedirte frases claras y completas." },
  { id: "curiosidad", icon: Lightbulb, label: "Porque me da curiosidad", cero: "Preguntaré el porqué de cada paso." },
];

const LEVEL_ICON = { nino: Star, companero: Users, esceptico: Search };

const FRICTIONS = [
  { id: "leo", text: "Lo leo y lo entiendo, pero cuando tengo que usarlo me trabo." },
  { id: "bloqueo", text: "Me pongo en blanco en las pruebas aunque haya estudiado." },
  { id: "poco", text: "Tengo poco tiempo: prefiero practicar de a 10 minutos." },
  { id: "sinnet", text: "A veces no tengo buen internet." },
  { id: "nose", text: "Nadie me dice cuál es mi error exacto." },
];

const DEMO_BAD = {
  "interes-compuesto": "Un préstamo funciona así: el banco te presta dinero y te cobra una tasa de 10% anual. El interés se calcula sobre lo que pediste. Eso se repite cada año mientras dure el préstamo.",
  "descuentos-sucesivos": "Un descuento es un porcentaje del precio que se resta de ese precio. Si una tienda hace dos descuentos, los porcentajes se suman y se aplican de una vez sobre el precio original.",
  "fotosintesis": "La planta se alimenta de la tierra: de ahí saca su comida y su masa. El agua la absorben las raíces y la luz del sol le da la energía. Al final libera oxígeno y fabrica glucosa.",
};

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const wordsIn = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const MIN_WORDS = 25;

const I = ({ as: Icon, size = 22 }) => <Icon size={size} strokeWidth={2.4} aria-hidden="true" focusable="false" className="ico" />;

const Btn = ({ cls = "btn-primary", onClick, testid, children, ...rest }) => (
  <button className={`btn ${cls}`} onClick={onClick} data-testid={testid} {...rest}>{children}</button>
);
const Choice = ({ name, value, checked, onChange, disabled, children }) => (
  <label className={`card choice ${checked ? "selected" : ""} ${disabled ? "disabled" : ""}`}>
    <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} />
    {children}
  </label>
);

export default function AlumnoCero() {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [flash, setFlash] = useState(null); // {kind:"error"|"info", text}
  const [ai, setAi] = useState({ configured: false, voiceModel: null, writingModel: null });
  const [dict, setDict] = useState("idle"); // idle | recording | transcribing
  const [cero, setCero] = useState({ status: "idle", text: "" }); // LLM reading of the explanation
  const [srOk, setSrOk] = useState(false);
  const [busy, setBusy] = useState(null); // null | "analyze" | "exam": AI grading in flight
  const [learner, setLearner] = useState(null); // signed-in account (null = anonymous / local only)
  const [dbOk, setDbOk] = useState(true);
  const [reward, setReward] = useState(null);
  const [ready, setReady] = useState(false); // account + URL resolved
  const pending = useRef(false);
  const syncTimer = useRef(null);
  const rec = useRef(null);
  const lastScreen = useRef(null);
  const mainRef = useRef(null);

  const voiceOk = ai.configured || srOk;
  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const topic = getTopic(state.topicId);
  const level = LEVELS[state.level] ?? LEVELS.companero;
  const subject = subjectOf(topic);

  useEffect(() => {
    setSrOk(Boolean(SR));
    setHydrated(true);
    fetch("/api/status").then((r) => r.json()).then(setAi).catch(() => {});
    (async () => {
      let base = load();
      let who = null;
      let db = true;
      try {
        const r = await fetch("/api/me");
        const j = await r.json().catch(() => ({}));
        if (r.status === 503 || j.dbOk === false) db = false;
        else if (j.learner) {
          who = j.learner;
          // When signed in, the database is the source of truth.
          base = j.state ? { ...initialState(), ...j.state } : { ...initialState(), screen: "hub" };
        }
      } catch { db = false; }
      setDbOk(db);
      setLearner(who);
      const parsed = parsePath(location.pathname);
      let next = base;
      if (parsed?.screen === "welcome") next = { ...base, screen: who ? "hub" : "welcome" };
      else if (parsed) next = withUrl(base, parsed);
      setState(next);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (hydrated && !learner) setStorageOk(save(state));
  }, [state, hydrated, learner]);

  // Signed in: mirror the live state into MySQL (debounced). Browsing screens don't create a journey.
  useEffect(() => {
    if (!learner || !state.topicId || ["welcome", "auth", "hub", "goal"].includes(state.screen)) return;
    if (!state.sid) { set({ sid: crypto.randomUUID() }); return; }
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => pushState(state), 700);
    return () => clearTimeout(syncTimer.current);
  }, [state, learner]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushState = (s) =>
    fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: s.sid, state: s }) }).catch(() => {});

  // Permanent history + XP. Flushes the snapshot first so the journey row exists.
  async function track(snapshot, type, payload) {
    if (!learner || !snapshot.sid) return;
    try {
      await pushState(snapshot);
      const r = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, sid: snapshot.sid, payload }) });
      const j = await r.json();
      if (r.ok && j.reward) {
        setReward(j.reward);
        setLearner((l) => (l ? { ...l, level: j.reward.level } : l));
      }
    } catch { /* offline: the snapshot sync will catch up */ }
  }

  // Guards: never render a screen whose data is missing (e.g. after a corrupted/partial save).
  let screen = STEPS.includes(state.screen) ? state.screen : "welcome";
  if (screen === "hub" && !learner) screen = ready && dbOk ? "auth" : "welcome";
  const need = { reading: "analysis", reflect: "analysis", exam: "exam", result: "exam", practice: "practice", card: "mastered" };
  if (["frictions", "prefs", "teach"].includes(screen) && !state.topicId) screen = "welcome";
  else if (need[screen] && !state[need[screen]]) screen = state.topicId ? "teach" : "welcome";

  useEffect(() => {
    if (lastScreen.current && lastScreen.current !== screen) mainRef.current?.querySelector("h1")?.focus({ preventScroll: true });
    lastScreen.current = screen;
  }, [screen]);

  useEffect(() => {
    if (!ready) return;
    const want = pathFor(screen, state.topicId);
    if (location.pathname !== want) history[screen === "reading" ? "replaceState" : "pushState"](null, "", want);
  }, [screen, state.topicId, ready]);

  useEffect(() => {
    const onPop = () => {
      const parsed = parsePath(location.pathname);
      if (parsed) setState((s) => (parsed.screen === "welcome" && learner ? { ...s, screen: "hub" } : withUrl(s, parsed)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [learner]);

  useEffect(() => {
    if (screen !== "reading" || pending.current) return;
    const t = setTimeout(() => go("reflect"), 1400);
    return () => clearTimeout(t);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  function go(next) {
    setState((s) => ({ ...s, screen: next }));
    setFlash(null);
    window.scrollTo({ top: 0 });
  }

  /* -------------------------------- actions -------------------------------- */

  const cardText = () => {
    const m = state.mastered;
    return [`ALUMNO CERO — Ficha de dominio: ${topic.title}`, "", "Mi explicación (ya corregida):", m.text, "", "Conceptos que Cero usó correctamente:", ...m.concepts.map((c) => `- ${c}`), "", `Acción para esta semana: ${topic.action}`, "", `Referencia: ${topic.reference.label} — ${topic.reference.url}`].join("\n");
  };

  const insertText = (t) => {
    set((s) => ({ text: `${s.text}${s.text && !/\s$/.test(s.text) ? " " : ""}${t}` }));
    setTimeout(() => document.getElementById("explanation")?.focus(), 0);
  };

  const actions = {
    home: () => go(learner ? "hub" : "welcome"),
    start: () => go(learner ? "hub" : dbOk ? "auth" : "goal"),
    authDone: async () => {
      const j = await fetch("/api/me").then((r) => r.json());
      setLearner(j.learner);
      setDbOk(true);
      setState({ ...initialState(), level: state.level, screen: "hub" });
      setFlash(null);
      window.scrollTo({ top: 0 });
    },
    logout: async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      clear(); setLearner(null); setReward(null); setState(initialState()); setFlash(null);
    },
    continueSession: async (sid) => {
      const r = await fetch(`/api/state?sid=${sid}`);
      const j = await r.json();
      if (r.ok) { setState({ ...initialState(), ...j.state, sid }); setFlash(null); window.scrollTo({ top: 0 }); }
    },
    startTopic: (topicId) => {
      setState({ ...initialState(), level: state.level, topicId, sid: crypto.randomUUID(), locked: true, screen: "goal" });
      setFlash(null);
      window.scrollTo({ top: 0 });
    },
    resume: () => go(state.mastered ? "card" : state.analysis ? "reflect" : "teach"),
    back: () => { const prev = { goal: learner ? "hub" : "welcome", frictions: "goal", prefs: "frictions", teach: "prefs" }[screen]; if (prev) go(prev); },
    reset: () => {
      if (!confirm("¿Borrar tu progreso en este navegador y empezar de nuevo?")) return;
      clear(); setState(initialState()); setFlash(null);
    },
    goalNext: () => {
      if (!state.topicId) return setFlash({ kind: "error", text: "Elige un tema para continuar." });
      if (!state.goal) return setFlash({ kind: "error", text: "Cuéntame para qué lo quieres aprender; así preparo la sesión." });
      go("frictions");
    },
    demoText: () => { set({ text: DEMO_BAD[state.topicId] }); setFlash(null); },
    goodText: () => { set({ text: topic.modelExplanation }); setFlash(null); },
    teachSubmit: async () => {
      const check = validateExplanation(topic, state.text);
      if (!check.ok) return setFlash({ kind: "error", text: check.message });
      setCero({ status: "idle", text: "" });
      const local = analyze(topic, state.text);
      if (!ai.configured) { set({ analysis: local, exam: null }); return go("reading"); }
      // AI analysis; the local engine is the fallback if the model fails or returns something unverifiable.
      pending.current = true;
      setBusy("analyze");
      set({ analysis: local, exam: null });
      go("reading");
      let analysis = { ...local, log: { ...local.log, fallback: true } };
      try {
        const [r] = await Promise.all([
          fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: topic.id, text: state.text }) }),
          new Promise((res) => setTimeout(res, 900)),
        ]);
        const j = await r.json();
        if (r.ok && j.analysis) analysis = j.analysis;
      } catch { /* keep local analysis */ }
      pending.current = false;
      setBusy(null);
      set({ analysis });
      go("reflect");
    },
    takeExam: async () => {
      const variant = pickVariant(topic, state.level, state.attempt);
      const local = () => takeExam(topic, variant, state.analysis);
      if (!ai.configured || !state.analysis.log?.ai) { set({ exam: local() }); return go("exam"); }
      setBusy("exam");
      let exam = null;
      try {
        const r = await fetch("/api/exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: topic.id, variantId: variant.id, text: state.text, analysis: state.analysis }) });
        const j = await r.json();
        if (r.ok && j.exam) exam = j.exam;
      } catch { /* fall back below */ }
      setBusy(null);
      set({ exam: exam ?? { ...local(), fallback: true } });
      go("exam");
    },
    seeResult: () => {
      const next = { history: [...state.history, { attempt: state.attempt + 1, passed: state.exam.passed, variantId: state.exam.variantId, at: Date.now() }], attempt: state.attempt + 1 };
      set(next);
      go("result");
      track({ ...state, ...next, screen: "result" }, "attempt", { attemptNo: next.attempt, variantId: state.exam.variantId, explanation: state.text, analysis: state.analysis, exam: state.exam, passed: state.exam.passed });
    },
    finish: () => {
      const mastered = { text: state.text, concepts: knownConcepts(topic, state.analysis).map((c) => c.label), at: Date.now() };
      set({ mastered });
      go("card");
      track({ ...state, mastered, screen: "card" }, "mastered", { explanation: mastered.text, concepts: mastered.concepts, attempts: state.history.length });
    },
    startPractice: () => { set({ practice: { conceptId: state.exam.blame.conceptId, index: 0, answers: [] } }); go("practice"); },
    practiceAnswer: (i) => {
      const p = state.practice;
      const q = (topic.practice[p.conceptId] ?? [])[p.index];
      if (q && i === q.correct) track(state, "practice", { key: `${p.conceptId}:${p.index}` });
      set((s) => { const answers = [...s.practice.answers]; answers[s.practice.index] = i; return { practice: { ...s.practice, answers } }; });
    },
    practiceNext: () => {
      const bank = topic.practice[state.practice.conceptId] ?? [];
      if (state.practice.index + 1 < bank.length) set((s) => ({ practice: { ...s.practice, index: s.practice.index + 1 } }));
      else { set((s) => ({ practiced: { ...s.practiced, [s.practice.conceptId]: true } })); go("teach"); }
    },
    copyCard: async () => {
      try { await navigator.clipboard.writeText(cardText()); setFlash({ kind: "info", text: "¡Listo! Tu ficha está copiada." }); }
      catch { setFlash({ kind: "error", text: "Tu navegador no dejó copiar. Usa «Descargar»." }); }
    },
    downloadCard: () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([cardText()], { type: "text/plain;charset=utf-8" }));
      a.download = `ficha-${state.topicId}.txt`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    anotherTopic: () => { setState({ ...initialState(), level: state.level, screen: "goal" }); setFlash(null); },
    askCero: async () => {
      setCero({ status: "loading", text: "" });
      try {
        const r = await fetch("/api/cero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topic.title, level: level.name, text: state.text }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setCero({ status: "done", text: j.text });
      } catch (e) {
        setCero({ status: "error", text: e.message || "Cero no pudo responder ahora." });
      }
    },
  };

  const appendText = (t) => set((s) => ({ text: `${s.text} ${t}`.trim() }));

  async function dictate() {
    if (dict === "transcribing") return;
    if (dict === "recording") {
      if (rec.current?.sr) return rec.current.sr.stop();
      setDict("transcribing");
      try {
        const wav = await rec.current.api.stop();
        const body = new FormData();
        body.append("audio", wav, "dictado.wav");
        const r = await fetch("/api/transcribe", { method: "POST", body });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        appendText(j.text);
      } catch (e) {
        setFlash({ kind: "error", text: `${e.message || "No pude pasar tu voz a texto."} Prueba otra vez o escríbelo.` });
      }
      rec.current = null;
      return setDict("idle");
    }
    if (ai.configured && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        rec.current = { api: await startRecording() };
        setFlash(null); setDict("recording");
      } catch {
        setFlash({ kind: "error", text: "No diste permiso al micrófono. No pasa nada: puedes escribir." });
      }
    } else if (SR) {
      const r = new SR();
      r.lang = "es-PE"; r.continuous = true; r.interimResults = false;
      r.onresult = (ev) => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) appendText(ev.results[i][0].transcript); };
      r.onerror = (ev) => { setDict("idle"); setFlash({ kind: "error", text: ev.error === "not-allowed" ? "No diste permiso al micrófono. No pasa nada: puedes escribir." : "No te escuché bien. Prueba otra vez o escríbelo." }); };
      r.onend = () => { rec.current = null; setDict("idle"); };
      try { r.start(); rec.current = { sr: r }; setFlash(null); setDict("recording"); } catch { setDict("idle"); }
    }
  }

  /* --------------------------------- shared -------------------------------- */

  const flashEl = flash && (
    <div className={`flash flash-${flash.kind}`} role={flash.kind === "error" ? "alert" : "status"} data-testid="flash">{flash.text}</div>
  );

  /* --------------------------------- screens ------------------------------- */

  const views = {
    welcome() {
      const hasProgress = state.topicId && (state.text || state.history.length);
      return (
        <>
          <section className="hero" aria-labelledby="h-welcome">
            <div className="hero-copy">
              <p className="hero-kicker"><span className="tape-label">Aprende enseñando</span></p>
              <h1 id="h-welcome" className="display">Enséñale a Cero. <span className="hl">Si se equivoca,</span> descubres tu error.</h1>
              <p className="lead">Cero solo sabe lo que tú le explicas. Después hace un examen nuevo: si falla, te muestra la frase tuya que lo confundió.</p>
              <div className="cta-row cta-hero">
                <Btn cls="btn-primary btn-lg" onClick={actions.start} testid="start">¡Empezar! <span className="btn-hint">2 min</span> <I as={ArrowRight} /></Btn>
                {hasProgress && !learner && <Btn cls="btn-secondary btn-lg" onClick={actions.resume} testid="resume"><I as={RotateCcw} /> Seguir donde quedé</Btn>}
                {!learner && dbOk && <Btn cls="btn-secondary btn-lg" onClick={() => go("auth")} testid="welcome-login">Ya tengo cuenta</Btn>}
              </div>
              <ul className="trust" aria-label="Lo bueno de Alumno Cero">
                <li><I as={Gift} size={18} /> Gratis y sin registro</li>
                <li><I as={Lock} size={18} /> {ai.configured ? "Cero usa IA para leerte y hacer el examen" : "Tu texto se revisa en tu equipo"}</li>
                <li><I as={Mic} size={18} /> Voz e IA opcionales</li>
              </ul>
            </div>
            <figure className="specimen" aria-label="Ejemplo de lo que verás">
              <div className="specimen-paper">
                <span className="tape tape-tl" aria-hidden="true" />
                <Cero mood="confundido" cls="cero-lg" />
                <p className="specimen-quote">«El interés se calcula sobre <mark className="pen">lo que pediste</mark>.»</p>
                <p className="pen-note" aria-hidden="true">¡Fallé por esta frase!</p>
              </div>
              <figcaption>Así se ve: Cero calculó mal un préstamo y marcó la frase que lo confundió.</figcaption>
            </figure>
          </section>

          <dl className="pitch" data-testid="value-prop">
            <div className="sticky sticky-yellow"><dt>¿Es para ti?</dt><dd>Sí, si lees un tema, lo entiendes… y te trabas al usarlo.</dd></div>
            <div className="sticky sticky-pink"><dt>El problema</dt><dd>Releer parece suficiente, pero nadie te dice dónde está tu error.</dd></div>
            <div className="sticky sticky-mint"><dt>Te llevas</dt><dd>Tu frase a corregir, una práctica corta y tu ficha de dominio.</dd></div>
          </dl>

          <section className="how" aria-labelledby="h-how">
            <h2 id="h-how">¿Cómo funciona?</h2>
            <ol className="how-list">
              <li><span className="how-ico"><I as={PencilLine} size={26} /></span><strong>Enseñas</strong> Con tus palabras, escribiendo o hablando.</li>
              <li><span className="how-ico"><I as={Brain} size={26} /></span><strong>Cero lo intenta</strong> Resuelve un problema nuevo solo con lo que le dijiste.</li>
              <li><span className="how-ico"><I as={Highlighter} size={26} /></span><strong>Ves tu error</strong> Si falla, se marca la frase que lo confundió.</li>
              <li><span className="how-ico"><I as={Trophy} size={26} /></span><strong>Lo corriges</strong> Y te llevas tu ficha de dominio.</li>
            </ol>
            <p className="note">¿Por qué funciona? Enseñarle a alguien te hace pensar más (el «efecto protegido», Chase et al., 2009). <a href="https://purl.stanford.edu/zm369yx3532" target="_blank" rel="noopener">Ver estudio<span className="sr-only"> (se abre en otra pestaña)</span></a>.</p>
          </section>
        </>
      );
    },

    auth() {
      return <Auth dbOk={dbOk} onDone={actions.authDone} onSkip={() => go("goal")} />;
    },

    hub() {
      return <Hub onContinue={actions.continueSession} onStartTopic={actions.startTopic} />;
    },

    goal() {
      return (
        <section aria-labelledby="h-goal">
          <CeroSays mood="curioso">¡Hola! Soy Cero y no sé nada de nada. ¿Qué me vas a enseñar hoy?</CeroSays>
          {state.locked && topic ? (
            <div data-testid="topic-locked">
              <h1 id="h-goal"><span aria-hidden="true">{topic.emoji}</span> {topic.title}</h1>
              <p className="lead">{topic.blurb}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ locked: false })} data-testid="change-topic"><I as={RotateCcw} size={18} /> Cambiar de tema</button>
            </div>
          ) : (
            <>
          <h1 id="h-goal">Elige un tema</h1>
          <fieldset className="topics-by-subject" data-testid="topics">
            <legend className="sr-only">Tema</legend>
            {Object.values(SUBJECTS).map((sub) => (
              <div key={sub.id} className={`subject-group subject-${sub.tone}`}>
                <h2 className="subject-title">{sub.id === "matematica" ? <Calculator size={22} strokeWidth={2.5} aria-hidden="true" /> : <FlaskConical size={22} strokeWidth={2.5} aria-hidden="true" />} {sub.name} <small>{sub.tagline}</small></h2>
                <div className="cards cards-topics">
                  {TOPICS.filter((t) => t.subject === sub.id).map((t) => (
                    <Choice key={t.id} name="topic" value={t.id} checked={state.topicId === t.id} onChange={() => {
                      if (state.topicId !== t.id) set({ topicId: t.id, sid: crypto.randomUUID(), text: "", analysis: null, exam: null, history: [], attempt: 0, mastered: null, practice: null });
                      setFlash(null);
                    }}>
                      <span className="choice-emoji" aria-hidden="true">{t.emoji}</span>
                      <span className="choice-text"><strong>{t.title}</strong><small>{t.blurb}</small></span>
                    </Choice>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
            </>
          )}
          <h2>¿Para qué lo quieres aprender?</h2>
          <fieldset className="cards cards-goals" data-testid="goals">
            <legend className="sr-only">Objetivo</legend>
            {GOALS.map((g) => (
              <Choice key={g.id} name="goal" value={g.id} checked={state.goal === g.id} onChange={() => { set({ goal: g.id }); setFlash(null); }}>
                <span className="choice-ico"><I as={g.icon} /></span>
                <span className="choice-text"><strong>{g.label}</strong></span>
              </Choice>
            ))}
          </fieldset>
          {flashEl}
          <div className="cta-row"><Btn cls="btn-primary btn-lg" onClick={actions.goalNext} testid="goal-next">Continuar <I as={ArrowRight} /></Btn></div>
        </section>
      );
    },

    frictions() {
      return (
        <section aria-labelledby="h-fr">
          <CeroSays mood="curioso">Cuéntame qué te cuesta. Así preparo mejor mi examen.</CeroSays>
          <h1 id="h-fr">¿Te pasa algo de esto?</h1>
          <p className="lead">Con <strong>{topic.title}</strong>. Toca «Sí» o «No». También puedes saltarte este paso.</p>
          <ul className="friction-list" data-testid="frictions">
            {FRICTIONS.map((f) => {
              const v = state.frictions[f.id];
              const pick = (val) => set((s) => ({ frictions: { ...s.frictions, [f.id]: val } }));
              return (
                <li key={f.id} className={`card friction ${v === true ? "is-yes" : v === false ? "is-no" : ""}`}>
                  <p>{f.text}</p>
                  <div className="seg" role="group" aria-label={f.text}>
                    <button className={`btn seg-yes ${v === true ? "is-on" : ""}`} aria-pressed={v === true} onClick={() => pick(true)} data-action="friction" data-id={f.id} data-val="1"><I as={Check} size={20} /> Sí, me pasa</button>
                    <button className={`btn seg-no ${v === false ? "is-on" : ""}`} aria-pressed={v === false} onClick={() => pick(false)} data-action="friction" data-id={f.id} data-val="0"><I as={X} size={20} /> No</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="cta-row">
            <Btn cls="btn-primary btn-lg" onClick={() => go("prefs")} testid="fr-next">Continuar <I as={ArrowRight} /></Btn>
            <Btn cls="btn-ghost" onClick={() => go("prefs")}>Saltar este paso</Btn>
          </div>
        </section>
      );
    },

    prefs() {
      const yes = FRICTIONS.filter((f) => state.frictions[f.id] === true).map((f) => f.id);
      const bits = [];
      if (yes.includes("leo")) bits.push("el examen usará un caso nuevo, no el que ya viste");
      if (yes.includes("bloqueo")) bits.push("Cero te dará pistas antes de que falles");
      if (yes.includes("poco")) bits.push("verás una práctica corta de 2 preguntas");
      if (yes.includes("nose")) bits.push("te mostraré tu frase exacta que causó el error");
      if (yes.includes("sinnet")) bits.push(ai.configured ? "si falla internet, Cero usa su modo básico y sigues practicando" : "el análisis y el examen corren en tu equipo, sin depender de internet");
      const g = GOALS.find((x) => x.id === state.goal);
      const ask = topic.concepts[1]?.ask[state.level] ?? topic.concepts[0].ask[state.level];
      return (
        <section aria-labelledby="h-pref">
          <h1 id="h-pref">¿Cómo será Cero?</h1>
          <p className="lead">Elige cómo te pregunta. Esto también cambia su examen.</p>
          <fieldset className="cards cards-levels" data-testid="levels">
            <legend className="sr-only">Nivel de Cero</legend>
            {Object.values(LEVELS).map((l) => (
              <Choice key={l.id} name="level" value={l.id} checked={state.level === l.id} onChange={() => set({ level: l.id })}>
                <span className="choice-ico"><I as={LEVEL_ICON[l.id] ?? Star} /></span>
                <span className="choice-text"><strong>{l.name}</strong><small>{l.tag}</small></span>
              </Choice>
            ))}
          </fieldset>
          <div className="preview" aria-live="polite" data-testid="level-preview">
            <CeroSays mood="curioso"><span className="bubble-kicker">Así te preguntará:</span> «{ask}»</CeroSays>
          </div>
          <h2>¿Cómo le vas a enseñar?</h2>
          <fieldset className="cards cards-modes" data-testid="modes">
            <legend className="sr-only">Modo de entrada</legend>
            <Choice name="mode" value="text" checked={state.inputMode === "text"} onChange={() => set({ inputMode: "text" })}>
              <span className="choice-ico"><I as={Keyboard} /></span><span className="choice-text"><strong>Escribiendo</strong></span>
            </Choice>
            <Choice name="mode" value="voice" checked={state.inputMode === "voice"} disabled={!voiceOk} onChange={() => set({ inputMode: "voice" })}>
              <span className="choice-ico"><I as={Mic} /></span>
              <span className="choice-text"><strong>Hablando</strong>{!voiceOk && <small>No funciona en este navegador</small>}</span>
            </Choice>
          </fieldset>
          {state.inputMode === "voice" && (
            <p className="note note-box">
              {ai.configured
                ? "Solo usaré el micrófono cuando toques «Dictar». Tu audio se envía a OpenRouter para pasarlo a texto. Si no quieres, puedes escribir."
                : "Solo usaré el micrófono cuando toques «Dictar», y tu voz se pasa a texto en tu navegador. Si no quieres, puedes escribir."}
            </p>
          )}
          {(bits.length > 0 || g) && (
            <div className="plan sticky sticky-yellow" data-testid="plan"><h2 className="plan-title"><I as={Sparkles} size={20} /> Tu sesión, a tu medida</h2><ul>{g && <li>{g.cero}</li>}{bits.map((b) => <li key={b}>{b}</li>)}</ul></div>
          )}
          <div className="cta-row"><Btn cls="btn-primary btn-lg" onClick={() => go("teach")} testid="prefs-next">¡A enseñarle a Cero! <I as={ArrowRight} /></Btn></div>
        </section>
      );
    },

    teach() {
      const last = state.history[state.history.length - 1];
      const blame = state.exam?.blame;
      const callout = blame?.sentence
        ? <>la frase «<mark className="pen">{blame.sentence}</mark>» le enseñó algo incorrecto a Cero. Cámbiala abajo.</>
        : last && !last.passed && blame ? blame.message : null;
      const words = wordsIn(state.text);
      const pct = Math.min(100, Math.round((words / MIN_WORDS) * 100));
      const voiceMode = state.inputMode === "voice" && voiceOk;
      return (
        <section aria-labelledby="h-teach">
          <CeroSays mood={state.attempt > 0 ? "pensando" : "curioso"}><strong>{level.name}:</strong> {level.intro}</CeroSays>
          <h1 id="h-teach">Enséñale: {topic.title}</h1>
          <p className="lead">{topic.starter}</p>
          <div className="teach-grid">
          <div className="teach-side">
          <div className={`subject-help subject-${subject.tone}`} data-testid="subject-help"><span className="subject-ico" aria-hidden="true">{subject.mode === "steps" ? <Calculator size={22} strokeWidth={2.5} /> : <FlaskConical size={22} strokeWidth={2.5} />}</span><p><strong>{subject.teach.title}.</strong> {subject.teach.help}</p></div>
          <Mochila topic={topic} onInsert={insertText} />
          </div>
          <div className="teach-main">
          {callout && <div className="callout" data-testid="retry-callout"><span className="callout-ico"><I as={Highlighter} /></span><p><strong>Para corregir:</strong> {callout}</p></div>}
          <div className="seg mode-seg" role="group" aria-label="¿Cómo le vas a enseñar?">
            <button type="button" className={`btn ${!voiceMode ? "btn-primary" : "btn-secondary"}`} aria-pressed={!voiceMode} onClick={() => set({ inputMode: "text" })} data-testid="mode-text"><I as={Keyboard} size={20} /> Escribiendo</button>
            <button type="button" className={`btn ${voiceMode ? "btn-primary" : "btn-secondary"}`} aria-pressed={voiceMode} disabled={!voiceOk} onClick={() => set({ inputMode: "voice" })} data-testid="mode-voice" title={voiceOk ? "" : "Tu navegador no permite dictar"}><I as={Mic} size={20} /> Hablando</button>
          </div>
          {voiceMode ? (
            <div className={`mic-hero ${dict === "recording" ? "is-recording" : ""}`} data-testid="mic-hero">
              <button type="button" className="mic-big" onClick={dictate} aria-pressed={dict === "recording"} disabled={dict === "transcribing"} data-testid="dictate" aria-label={dict === "recording" ? "Parar de grabar" : "Empezar a hablar"}>
                {dict === "recording" ? <I as={Square} size={40} /> : dict === "transcribing" ? <span className="spin"><I as={LoaderCircle} size={40} /></span> : <I as={Mic} size={44} />}
              </button>
              <p className="mic-status" aria-live="polite">
                {dict === "recording" ? "Te estoy escuchando… toca otra vez para parar" : dict === "transcribing" ? "Pasando tu voz a texto…" : state.text ? "Toca el micrófono para seguir hablando" : "Toca el micrófono y explícale a Cero"}
              </p>
              <p className="mic-tip">Para empezar puedes decir: {subject.teach.starters.slice(0, 2).map((st) => `«${st.label}»`).join(" o ")}</p>
            </div>
          ) : (
            <div className="starters" role="group" aria-label="Para empezar a escribir">
              {subject.teach.starters.map((st) => <button key={st.label} type="button" className="starter" onClick={() => insertText(st.text)}>{st.label}</button>)}
            </div>
          )}
          <label htmlFor="explanation" className="label"><I as={PencilLine} size={20} /> {voiceMode ? "Lo que dijiste (puedes corregirlo)" : "Tu explicación"}</label>
          <textarea id="explanation" className="notebook" data-testid="explanation" rows={voiceMode ? 5 : 9} placeholder={voiceMode ? "Aquí aparecerá lo que digas…" : topic.hint} aria-describedby="teach-help" value={state.text} onChange={(e) => set({ text: e.target.value })} />
          <div className={`wordmeter ${words >= MIN_WORDS ? "is-full" : ""}`} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <p id="teach-help" className="note"><strong><span id="wordcount">{words}</span> palabras</strong> · Intenta llegar a {MIN_WORDS}. Cero solo usará lo que {voiceMode ? "digas" : "escribas"} aquí.</p>
          {flashEl}
          <div className="cta-row">
            <Btn cls="btn-primary btn-lg" onClick={actions.teachSubmit} testid="teach-submit">Enseñárselo a Cero <I as={ArrowRight} /></Btn>
          </div>
          <div className="aux-row">
            <Btn cls="btn-ghost" onClick={actions.demoText} testid="demo-text" title="Rellena una explicación con un error típico para ver cómo falla Cero"><I as={Lightbulb} size={20} /> Rellenar con una idea incorrecta</Btn>
            <Btn cls="btn-ghost" onClick={actions.goodText} testid="demo-good" title="Rellena una explicación correcta para ver cómo aprueba Cero"><I as={BookCheck} size={20} /> Rellenar con la explicación correcta</Btn>
          </div>
        </div>
          </div>
        </section>
      );
    },

    reading() {
      const a = state.analysis;
      return (
        <section className="reading" aria-labelledby="h-read" aria-live="polite">
          <Cero mood="pensando" cls="cero-xl cero-think" />
          <h1 id="h-read">Cero está leyendo…</h1>
          <p className="lead" data-testid="processing">{busy === "analyze" ? "Estoy leyendo tu explicación con IA para ver qué ideas me enseñaste…" : `Encontré ${a.log.sentences} frases y ${a.log.matched} ideas clave. Todo pasa en tu equipo, sin internet.`}</p>
          <div className="spinner" aria-hidden="true"><span /><span /><span /></div>
        </section>
      );
    },

    reflect() {
      const refl = reflect(topic, state.analysis);
      const qs = questionsFor(topic, state.analysis, state.level);
      return (
        <section aria-labelledby="h-reflect">
          <div className="cero-row cero-row-title"><Cero mood={qs.length ? "curioso" : "feliz"} cls="cero-lg" /><h1 id="h-reflect">Esto es lo que entendí</h1></div>
          {state.analysis.log?.ai && <p className="note"><I as={Sparkles} size={16} /> Analizado con IA ({ai.writingModel}). Cada cita es una frase tuya, verificada palabra por palabra.</p>}
          {state.analysis.log?.fallback && <p className="note">La IA no respondió bien, así que usé el análisis básico de tu dispositivo.</p>}
          <ul className="understood" data-testid="understood">
            {refl.map((r) => (
              <li key={r.conceptId} className={`card note-card ${r.state}`}>
                {r.state === "missing"
                  ? <p><span className="badge badge-gap"><I as={MessageCircleQuestionMark} size={16} /> No me lo dijiste</span> {topic.concepts.find((c) => c.id === r.conceptId).label}</p>
                  : <>
                      <p><span className={`badge ${r.state === "known" ? "badge-ok" : "badge-warn"}`}><I as={r.state === "known" ? Check : TriangleAlert} size={16} /> {r.state === "known" ? "Entendido" : "Entendí esto"}</span> {r.understood}</p>
                      <blockquote>«{r.quote}»</blockquote>
                    </>}
              </li>
            ))}
          </ul>
          {qs.length
            ? <div className="questions sticky sticky-yellow" data-testid="questions"><h2 className="plan-title"><I as={MessageCircleQuestionMark} size={20} /> Mis dudas</h2><ul>{qs.map((q) => <li key={q.conceptId}>{q.text}</li>)}</ul></div>
            : <p className="note note-box">No tengo dudas. ¡Creo que puedo intentarlo!</p>}
          {ai.configured && (
            <div className="ai-box" data-testid="cero-ai">
              <h2 className="plan-title"><I as={Sparkles} size={20} /> Cero con IA <small className="chip">{ai.writingModel}</small></h2>
              <p className="note">Cero te cuenta con sus propias palabras lo que entendió.</p>
              {cero.status === "done" && <div className="ai-reply"><Cero mood="curioso" decorative /><p className="bubble" data-testid="cero-ai-text">{cero.text}</p></div>}
              {cero.status === "error" && <p className="flash flash-error" role="alert">{cero.text}</p>}
              <button className="btn btn-secondary" onClick={actions.askCero} disabled={cero.status === "loading"} data-testid="ask-cero" aria-busy={cero.status === "loading"}>
                {cero.status === "loading"
                  ? <><span className="spin"><I as={LoaderCircle} /></span> Cero está escribiendo…</>
                  : <><I as={MessageCircle} /> {cero.status === "done" ? "Pedir otra respuesta" : "Que Cero lo cuente"}</>}
              </button>
              <p className="note small-print">Esto envía tu explicación a OpenRouter.</p>
            </div>
          )}
          <div className="cta-row">
            <Btn cls="btn-primary btn-lg" onClick={actions.takeExam} testid="take-exam" disabled={busy === "exam"}>{busy === "exam" ? <>Cero está resolviendo… <I as={LoaderCircle} /></> : <>¡Que Cero haga el examen! <I as={ArrowRight} /></>}</Btn>
            <Btn cls="btn-secondary" onClick={() => go("teach")}><I as={PencilLine} /> Cambiar mi explicación</Btn>
          </div>
        </section>
      );
    },

    exam() {
      const e = state.exam;
      const v = topic.variants.find((x) => x.id === e.variantId);
      return (
        <section aria-labelledby="h-exam">
          <div className="cero-row cero-row-title"><Cero mood="pensando" cls="cero-lg" /><div><p className="kicker">Un problema que Cero nunca vio</p><h1 id="h-exam">El examen</h1></div>
          {e.ai && <p className="note"><I as={Sparkles} size={16} /> Cero razonó con IA usando solo tu explicación; la aritmética se verifica por separado.</p>}
          {e.fallback && <p className="note">La IA no dio un razonamiento verificable, así que el examen usó el modo básico.</p>}</div>
          <div className="exam-paper"><span className="tape tape-tc" aria-hidden="true" /><p>{v.context}</p><p className="exam-q"><strong>{v.question}</strong></p></div>
          <h2>Así lo resuelve Cero <small className="h-sub">(solo con lo que le enseñaste)</small></h2>
          <p className="note">{subject.exam.intro}</p>
          <ol className="steps" data-testid="steps">
            {e.steps.map((s, i) => (
              <li key={i} className={s.ok ? "ok" : "bad"}><span className={`badge ${s.ok ? "badge-ok" : "badge-warn"}`}><I as={s.ok ? Check : TriangleAlert} size={16} /> {s.ok ? "Tú me lo enseñaste" : s.source === "user-wrong" ? "Eso me dijiste" : "Me faltó información"}</span> {s.text}</li>
            ))}
          </ol>
          {e.rows.length > 0 && (
            <div className="table-wrap" role="region" aria-label="Cálculo de Cero" tabIndex={0}>
              <table className="calc" data-testid="calc">
                <caption className="sr-only">Cálculo de Cero</caption>
                <thead><tr><th scope="col">Paso</th><th scope="col">Cálculo</th><th scope="col">Resultado</th></tr></thead>
                <tbody>{e.rows.map((r, i) => <tr key={i}><th scope="row">{r.label}</th><td>{r.detail}</td><td>{r.total}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <div className="answer" data-testid="cero-answer"><p className="answer-label">Respuesta de Cero</p><p className="big">{e.answerText}</p></div>
          <div className="cta-row"><Btn cls="btn-primary btn-lg" onClick={actions.seeResult} testid="see-result">¿Acertó? Ver resultado <I as={ArrowRight} /></Btn></div>
        </section>
      );
    },

    result() {
      const e = state.exam;
      if (e.passed) {
        return (
          <section className="verdict verdict-pass" aria-labelledby="h-res" data-testid="result-pass">
            <div className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <span key={i} />)}</div>
            <div className="verdict-head"><Cero mood="feliz" cls="cero-xl cero-hop" /><p className="stamp stamp-ok" aria-hidden="true">¡Aprobado!</p></div>
            <h1 id="h-res" className="display">¡Aprobé! 🎉</h1>
            <p className="lead">Resolví un problema <strong>nuevo</strong> solo con tu explicación. Respuesta correcta: <strong className="nowrap ok-text">{e.expectedText}</strong>.</p>
            <div className="cta-row"><Btn cls="btn-primary btn-lg" onClick={actions.finish} testid="finish"><I as={Trophy} /> Ver mi ficha de dominio</Btn></div>
          </section>
        );
      }
      const b = e.blame;
      return (
        <section className="verdict verdict-fail" aria-labelledby="h-res" data-testid="result-fail">
          <div className="verdict-head"><Cero mood="confundido" cls="cero-xl cero-shake" /><p className="kicker">Me equivoqué… ¡pero tiene arreglo!</p></div>
          <h1 id="h-res" className="display">Fallé por algo que me enseñaste.</h1>
          <div className="answers">
            <p className="ans ans-bad"><span className="ans-label"><I as={X} size={18} /> Yo respondí</span> <s>{e.answerText}</s></p>
            <p className="ans ans-good"><span className="ans-label"><I as={Check} size={18} /> Lo correcto era</span> <strong>{e.expectedText}</strong></p>
          </div>
          {b.state === "wrong" && b.sentence
            ? <figure className="blame-fig"><figcaption className="pen-note">Esta es tu frase:</figcaption><blockquote className="blame" data-testid="blame">«<mark>{b.sentence}</mark>»</blockquote></figure>
            : <div className="blame blame-gap" data-testid="blame"><p><strong>Te faltó explicarme:</strong> {b.conceptLabel}</p></div>}
          <p className="blame-why"><I as={Lightbulb} size={22} /> <span>{b.message}</span></p>
          {b.alsoFailing.length > 0 && <p className="note">También me faltó entender: {b.alsoFailing.map((id) => topic.concepts.find((c) => c.id === id).label).join("; ")}.</p>}
          <div className="cta-row">
            <Btn cls="btn-primary btn-lg" onClick={actions.startPractice} testid="start-practice"><I as={Dumbbell} /> Practicar esto (2 preguntas)</Btn>
            <Btn cls="btn-secondary" onClick={() => go("teach")}><I as={PencilLine} /> Corregir mi explicación ya</Btn>
          </div>
        </section>
      );
    },

    practice() {
      const p = state.practice;
      const bank = topic.practice[p.conceptId] ?? [];
      const q = bank[p.index];
      if (!q) return null;
      const label = topic.concepts.find((c) => c.id === p.conceptId).label;
      const chosen = p.answers[p.index];
      const answered = chosen !== undefined;
      const right = chosen === q.correct;
      return (
        <section aria-labelledby="h-prac">
          <p className="kicker"><I as={Dumbbell} size={18} /> Mini-práctica: {label}</p>
          <h1 id="h-prac">Pregunta {p.index + 1} de {bank.length}</h1>
          <div className="q-dots" aria-hidden="true">{bank.map((_, i) => <span key={i} className={i < p.index ? "done" : i === p.index ? "now" : ""} />)}</div>
          <p className="lead q-text">{q.q}</p>
          <ul className="options" data-testid="options">
            {q.options.map((o, i) => (
              <li key={i}>
                <button className={`btn option ${answered ? (i === q.correct ? "correct" : i === chosen ? "wrong" : "") : ""}`} disabled={answered} onClick={() => actions.practiceAnswer(i)}>
                  <span className="opt-letter" aria-hidden="true">{"ABCDEFG"[i]}</span>
                  <span className="opt-text">{o}{answered && i === q.correct ? <span className="sr-only"> (respuesta correcta)</span> : answered && i === chosen ? <span className="sr-only"> (tu respuesta)</span> : null}</span>
                  {answered && i === q.correct && <span className="opt-mark"><I as={Check} /></span>}
                  {answered && i === chosen && i !== q.correct && <span className="opt-mark"><I as={X} /></span>}
                </button>
              </li>
            ))}
          </ul>
          {answered && (
            <>
              <div className={`feedback ${right ? "ok" : "bad"}`} role="status"><span className="feedback-ico"><I as={right ? Check : X} /></span><p><strong>{right ? "¡Correcto!" : "Casi… no exactamente."}</strong> {q.why}</p></div>
              <div className="cta-row"><Btn cls="btn-primary btn-lg" onClick={actions.practiceNext} testid="practice-next" autoFocus>{p.index + 1 < bank.length ? "Siguiente pregunta" : "Volver a enseñarle a Cero"} <I as={ArrowRight} /></Btn></div>
            </>
          )}
        </section>
      );
    },

    card() {
      const m = state.mastered;
      return (
        <section aria-labelledby="h-card">
          <div className="cero-row cero-row-title"><Cero mood="feliz" cls="cero-lg" /><h1 id="h-card">Tu ficha de dominio</h1></div>
          <article className="mastery" data-testid="mastery-card" id="mastery-card">
            <span className="tape tape-tc" aria-hidden="true" />
            <p className="stamp stamp-ok stamp-card" aria-hidden="true">Dominado</p>
            <header className="mastery-head">
              <p className="mastery-topic"><span aria-hidden="true">{topic.emoji}</span> {topic.title}</p>
              <p className="mastery-date">Dominado el {new Date(m.at).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </header>
            <h2>Mi explicación (ya corregida)</h2>
            <blockquote className="own">{m.text.split("\n").map((line, i, a) => <span key={i}>{line}{i < a.length - 1 && <br />}</span>)}</blockquote>
            <h2>Lo que Cero usó bien</h2>
            <ul className="check">{m.concepts.map((c) => <li key={c}>{c}</li>)}</ul>
            <h2>Tu reto de esta semana</h2>
            <p>{topic.action}</p>
            <h2>Para saber más</h2>
            <p><a href={topic.reference.url} target="_blank" rel="noopener">{topic.reference.label}<span className="sr-only"> (se abre en otra pestaña)</span></a><br /><small>{topic.reference.note}</small></p>
            <p className="note">Intentos hasta aprobar: {state.history.length}{state.history.some((h) => !h.passed) ? " (equivocarse también es aprender)" : ""}.</p>
          </article>
          {flashEl}
          <div className="cta-row">
            <Btn onClick={actions.copyCard} testid="copy-card" cls="btn-primary btn-lg"><I as={Copy} /> Copiar ficha</Btn>
            <Btn cls="btn-secondary" onClick={actions.downloadCard}><I as={Download} /> Descargar</Btn>
            <Btn cls="btn-secondary" onClick={() => window.print()}><I as={Printer} /> Imprimir</Btn>
          </div>
          <p className="note">Tu progreso queda guardado aquí. No necesitas crear una cuenta.</p>
          <Btn cls="btn-ghost" onClick={actions.anotherTopic}><I as={RotateCcw} size={20} /> Aprender otro tema</Btn>
        </section>
      );
    },
  };

  /* ---------------------------------- shell -------------------------------- */

  const step = PROGRESS[screen] ?? 0;
  const canBack = ["goal", "frictions", "prefs", "teach"].includes(screen);
  const showTopFlash = flash && !["welcome", "teach", "goal", "card"].includes(screen);

  return (
    <div id="app" data-screen={screen}>
      <header className="topbar" data-testid="topbar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); actions.home(); }} aria-label="Alumno Cero, volver al inicio">
          <span className="brand-mark" aria-hidden="true"><Cero mood="curioso" decorative /></span>
          <span className="brand-name">Alumno <span>Cero</span></span>
        </a>
        <div className="topbar-right">
          {learner && <button className="btn btn-ghost btn-sm chip-me" onClick={() => go("hub")} aria-label={`Mi hub: nivel ${learner.level.n}`} data-testid="me-chip"><Avatar id={learner.avatar} size={28} /><span className="btn-label">Nv {learner.level.n}</span></button>}
          {canBack && <button className="btn btn-ghost btn-sm" onClick={actions.back}><I as={ArrowLeft} size={20} /> Atrás</button>}
          {learner && <button className="btn btn-ghost btn-sm" onClick={actions.logout} data-testid="logout"><I as={LogOut} size={20} /><span className="btn-label">Salir</span></button>}
          {!["welcome", "auth", "hub"].includes(screen) && <button className="btn btn-ghost btn-sm" onClick={actions.reset} title="Borra tu progreso de este navegador"><I as={RotateCcw} size={20} /><span className="btn-label">Empezar de nuevo</span></button>}
        </div>
      </header>
      {!["welcome", "auth", "hub"].includes(screen) && (
        <div className="progress" role="progressbar" aria-label="Progreso" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={step} aria-valuetext={`Paso ${step} de ${TOTAL}: ${STEP_LABEL[screen]}`}>
          <ol className="path" aria-hidden="true">
            {STATIONS.map((s, i) => {
              const n = i + 1;
              const st = n < step ? "done" : n === step ? "now" : "todo";
              const Icon = n < step ? Check : s.icon;
              return (
                <li key={n} className={`station ${st}`}>
                  <span className="station-dot"><Icon size={n === step ? 22 : 18} strokeWidth={2.6} /></span>
                  <span className="station-name">{s.name}</span>
                </li>
              );
            })}
          </ol>
          <p className="progress-label"><span className="progress-step">Paso {step} de {TOTAL}</span> <span className="progress-name">{STEP_LABEL[screen]}</span></p>
        </div>
      )}
      <main id="main" tabIndex={-1} ref={mainRef} className={screen === "welcome" ? "" : "sheet"}>
        {showTopFlash && flashEl}
        {views[screen]()}
      </main>
      <footer className="footer">
        <p>
          <strong>{learner ? "Tu progreso está a salvo:" : "Tu progreso se queda aquí:"}</strong> {learner ? "tu nivel, insignias y fichas se guardan en tu cuenta." : "sin cuenta, se guarda solo en este navegador."}{" "}
          {ai.configured
            ? "Para leer tu explicación, hacer el examen y dictar por voz, Cero envía tu texto o tu audio a OpenRouter (IA). Si la IA falla, usa un modo básico en tu equipo."
            : "Tus explicaciones no se envían a ningún servidor."}
          {!storageOk && <span className="warn-inline"> Tu navegador no deja guardar: no podré recordar tu progreso.</span>}
        </p>
        <p>Alumno Cero es para practicar con temas elegidos. No reemplaza a tu profe.</p>
      </footer>
      <RewardToast reward={reward} onClose={() => setReward(null)} />
    </div>
  );
}
