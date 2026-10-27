"use client";
// Alumno Cero — UI controller (React). Engine and topics are pure JS in src/lib.
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookCheck, Brain, Check, CircleCheck, ClipboardList, Copy, Download, Dumbbell, Highlighter,
  House, Keyboard, Lightbulb, LoaderCircle, LogIn, MessageCircle, MessageCircleQuestionMark, Mic, PencilLine,
  Calculator, FlaskConical, LogOut, Printer, RotateCcw, Save, Search, SlidersHorizontal, Sparkles, Square, Star, Target, TriangleAlert, Trophy, UserPlus, Users, X,
} from "lucide-react";
import { LEVELS, TOPICS, getTopic } from "@/lib/topics";
import { SUBJECTS, subjectOf } from "@/lib/subjects";
import Mochila from "./Mochila";
import Hub from "./Hub";
import Auth from "./Auth";
import Avatar from "./Avatar";
import RewardToast from "./RewardToast";
import Landing, { LandingFooter, LandingNav } from "./Landing";
import { analyze, correctWork, knownConcepts, pickVariant, questionsFor, reflect, takeExam, validateExplanation } from "@/lib/engine";
import Cuaderno from "./Cuaderno";
import { addToJournal, clear, initialState, load, readJournal, save } from "@/lib/store";
import { DEMO_BAD } from "@/lib/demo";
import { buildMigration, hasProgress as hasLocalProgress, mergeRewards, progressSummary } from "@/lib/migrate";
import { startRecording } from "@/lib/audio";
import AccountMenu from "./AccountMenu";
import { ClassesPanel, FamilyPanel } from "./Panels";
import PlansScreen from "./PlansScreen";
import LocalAICard, { useLocalAI } from "./LocalAICard";
import { capabilities, planOf } from "@/lib/plans";
import { cacheAccount, cachedAccount, flushOutbox, forgetAccount, outboxSize, queueEvent, queueState, registerServiceWorker } from "@/lib/offline";
import { cloudAnalysis, cloudExam, webgpuAnalysis, webgpuExam } from "@/lib/ai-client";
import { Cero, CeroSays } from "./Cero";

const STEPS = ["welcome", "auth", "hub", "goal", "frictions", "prefs", "teach", "reading", "reflect", "exam", "result", "practice", "card", "notfound", "plans", "family", "classes"];
const STEP_LABEL = { welcome: "Inicio", auth: "Tu cuenta", hub: "Mi hub", goal: "Elige tu tema", frictions: "¿Qué te cuesta?", prefs: "Ajusta a Cero", teach: "Enséñale", reading: "Cero está leyendo", reflect: "Cero te cuenta", exam: "El examen de Cero", result: "Resultado", practice: "Mini-práctica", card: "Tu ficha", plans: "Mi plan", family: "Panel familiar", classes: "Panel docente" };
const PROGRESS = { welcome: 0, auth: 0, hub: 0, goal: 1, frictions: 2, prefs: 3, teach: 4, reading: 5, reflect: 5, exam: 6, result: 7, practice: 7, card: 8, plans: 0, family: 0, classes: 0 };
// Screens without the step path (not part of the learning journey).
const OFF_PATH = ["welcome", "auth", "hub", "notfound", "plans", "family", "classes"];
// A saved journey never resumes on a panel/off-path screen (hub, plans, family…): those are navigation, not progress.
const restore = (s) => ({ ...initialState(), ...s, screen: OFF_PATH.includes(s?.screen) ? "hub" : s?.screen });
// Stations the learner can jump back to, to change an earlier decision.
const STATION_SCREEN = { 1: "goal", 2: "frictions", 3: "prefs", 4: "teach" };
const AI_TIMEOUT = 30_000;
const TOTAL = 8;

// Every screen has its own URL: /hub, /temas, /aprender/<tema>/<paso>…
const SLUG = { frictions: "dificultades", prefs: "ajustes", teach: "ensenar", reading: "leyendo", reflect: "cero-responde", exam: "examen", result: "resultado", practice: "practica", card: "ficha" };
const SCREEN_OF = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));
function pathFor(screen, topicId) {
  if (screen === "welcome") return "/";
  if (screen === "auth") return "/cuenta";
  if (screen === "hub") return "/hub";
  if (screen === "plans") return "/planes";
  if (screen === "family") return "/familia";
  if (screen === "classes") return "/aulas";
  if (screen === "goal") return "/temas";
  return topicId && SLUG[screen] ? `/aprender/${topicId}/${SLUG[screen]}` : "/";
}
function parsePath(path) {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { screen: "welcome" };
  if (parts.length === 1 && ["cuenta", "hub", "temas", "planes", "familia", "aulas"].includes(parts[0])) return { screen: { cuenta: "auth", hub: "hub", temas: "goal", planes: "plans", familia: "family", aulas: "classes" }[parts[0]] };
  if (parts.length === 3 && parts[0] === "aprender" && getTopic(parts[1]) && SCREEN_OF[parts[2]]) return { screen: SCREEN_OF[parts[2]], topicId: parts[1] };
  return { screen: "notfound" }; // unknown URL: friendly 404 with a way back
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
  const [account, setAccount] = useState(null); // paying owner of the session: { username, nickname, plan }
  const [online, setOnline] = useState(true);
  const [basicChosen, setBasicChosen] = useState(false); // guest declined the in-browser AI: use the basic engine
  const [busyEngine, setBusyEngine] = useState(null); // "cloud" | "webgpu" while the AI works
  const [pendingSync, setPendingSync] = useState(0); // changes waiting for the connection (signed-in accounts)
  const [syncNote, setSyncNote] = useState(null);
  const [journal, setJournal] = useState([]); // mastery cards kept on this device
  const [busy, setBusy] = useState(null); // null | "analyze" | "exam": AI grading in flight
  const [learner, setLearner] = useState(null); // signed-in account (null = anonymous / local only)
  const [dbOk, setDbOk] = useState(true);
  const [reward, setReward] = useState(null);
  const [ready, setReady] = useState(false); // account + URL resolved
  const [authCtx, setAuthCtx] = useState({ mode: "register", save: false, returnTo: null }); // why the account screen was opened
  const [elapsed, setElapsed] = useState(0); // seconds waiting for the AI (real, shown to the learner)
  const [clar, setClar] = useState({}); // learner's answers to Cero's doubts, by concept id
  const pending = useRef(false);
  const syncTimer = useRef(null);
  const rec = useRef(null);
  const lastScreen = useRef(null);
  const mainRef = useRef(null);

  const caps = capabilities(account?.plan);
  const localAI = useLocalAI();
  const cloudAvailable = Boolean(learner && caps.cloudAI && ai.configured && online);
  const localReady = localAI.supported && (localAI.cached || localAI.phase === "ready");
  const voiceOk = Boolean(learner && caps.voice && ai.configured && online); // dictation is a plan feature (cloud transcription)
  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const topic = getTopic(state.topicId);
  const level = LEVELS[state.level] ?? LEVELS.companero;
  const subject = subjectOf(topic);

  const applyMe = (j) => {
    learnerRef.current = j.learner;
    setLearner(j.learner);
    setAccount(j.account);
    setDbOk(true);
  };

  useEffect(() => {
    setHydrated(true);
    setOnline(navigator.onLine);
    setJournal(readJournal());
    registerServiceWorker();
    fetch("/api/status").then((r) => r.json()).then(setAi).catch(() => {});
    (async () => {
      let base = load();
      let who = null;
      let acct = null;
      let db = true;
      const cached = cachedAccount();
      // Changes made offline go up first, so the server snapshot we read next already includes them.
      if (cached?.learner?.id && navigator.onLine && outboxSize(cached.learner.id)) await flushOutbox(cached.learner.id).catch(() => {});
      try {
        const r = await fetch("/api/me");
        const j = await r.json().catch(() => ({}));
        if (r.status === 503 || j.dbOk === false) db = false;
        else if (j.learner) {
          who = j.learner;
          acct = j.account;
          // When signed in and online, the database is the source of truth.
          base = j.state ? restore(j.state) : { ...initialState(), screen: "hub" };
        }
      } catch { db = false; } // no connection
      // No connection but this device knows the account: keep studying with the cached profile and local progress.
      if (!who && !db && cached?.learner && cached?.account?.plan) { who = cached.learner; acct = cached.account; }
      setDbOk(db || Boolean(who));
      learnerRef.current = who;
      setLearner(who);
      setAccount(acct);
      const parsed = parsePath(location.pathname);
      let next = base;
      if (parsed?.screen === "welcome") next = { ...base, screen: who ? "hub" : "welcome" };
      else if (parsed) next = withUrl(base, parsed);
      setState(next);
      if (who) setPendingSync(outboxSize(who.id));
      setReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connection coming and going. Back online: replay what was saved offline.
  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      const pid = learnerRef.current?.id;
      if (!pid || !outboxSize(pid)) return;
      const res = await flushOutbox(pid);
      setPendingSync(res.left);
      if (res.expired) return expire();
      if (res.sent) setSyncNote(`Listo: se sincronizaron ${res.sent} ${res.sent === 1 ? "cambio" : "cambios"} con tu cuenta.`);
      const last = res.rewards.at(-1);
      if (last) { setReward(mergeRewards(res.rewards)); setLearner((l) => (l ? { ...l, level: last.level } : l)); }
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the cached account fresh (plan, profile, level) so the app also opens without a connection.
  useEffect(() => { if (learner && account) cacheAccount({ learner, account }); }, [learner, account]);
  useEffect(() => {
    if (!syncNote) return;
    const t = setTimeout(() => setSyncNote(null), 6000);
    return () => clearTimeout(t);
  }, [syncNote]);

  useEffect(() => {
    // Progress always lives in this browser too: it is what lets the app work offline.
    if (hydrated && ready) setStorageOk(save(state));
  }, [state, hydrated, ready]);

  // Signed in: mirror the live state into MySQL (debounced). Browsing screens don't create a journey.
  useEffect(() => {
    if (!learner || !state.topicId || OFF_PATH.includes(state.screen) || state.screen === "goal") return;
    if (!state.sid) { set({ sid: crypto.randomUUID() }); return; }
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => pushState(state), 700);
    return () => clearTimeout(syncTimer.current);
  }, [state, learner]); // eslint-disable-line react-hooks/exhaustive-deps

  // The account session ended (expired or closed elsewhere): keep going without an account.
  const learnerRef = useRef(null);
  useEffect(() => { learnerRef.current = learner; }, [learner]);
  const expire = () => {
    if (!learnerRef.current) return;
    learnerRef.current = null;
    setLearner(null);
    setAccount(null);
    forgetAccount();
    setFlash({ kind: "error", text: "Tu sesión se cerró. Tu avance sigue guardado en este navegador; vuelve a entrar cuando quieras para guardarlo en tu cuenta." });
  };

  // Server writes that fail for lack of connection go to the outbox and are replayed when it returns.
  const pushState = async (s) => {
    const pid = learnerRef.current?.id;
    try {
      const r = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: s.sid, state: s }) });
      if (r.status === 401) expire();
      else if (r.status >= 500) { queueState(pid, s.sid, s); setPendingSync(outboxSize(pid)); }
      return r;
    } catch {
      queueState(pid, s.sid, s);
      setPendingSync(outboxSize(pid));
      return null;
    }
  };

  // Permanent history + XP. Flushes the snapshot first so the journey row exists.
  async function track(snapshot, type, payload) {
    const pid = learnerRef.current?.id;
    if (!learner || !snapshot.sid) return;
    const later = () => { queueEvent(pid, snapshot.sid, type, payload); setPendingSync(outboxSize(pid)); };
    try {
      const put = await pushState(snapshot);
      if (!put) return later(); // offline: both the snapshot and this event wait in the outbox
      if (put.status === 401 || put.status >= 500) return put.status === 401 ? undefined : later();
      const r = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, sid: snapshot.sid, payload }) });
      if (r.status === 401) return expire();
      if (r.status >= 500) return later();
      const j = await r.json();
      if (r.ok && j.reward) {
        setReward(j.reward);
        setLearner((l) => (l ? { ...l, level: j.reward.level } : l));
      }
    } catch { later(); }
  }

  // Guards: never render a screen whose data is missing (e.g. after a corrupted/partial save).
  let screen = STEPS.includes(state.screen) ? state.screen : "welcome";
  if (screen === "hub" && !learner) screen = ready && dbOk ? "auth" : "welcome";
  if (learner && !account?.plan && !["plans", "auth", "notfound"].includes(screen)) screen = "plans"; // an account must have a plan
  if (screen === "family" && !(learner && caps.family)) screen = learner ? "hub" : "welcome";
  if (screen === "classes" && !(learner && caps.classrooms)) screen = learner ? "hub" : "welcome";
  const need = { reading: "analysis", reflect: "analysis", exam: "exam", result: "exam", practice: "practice", card: "mastered" };
  if (["frictions", "prefs", "teach"].includes(screen) && !state.topicId) screen = "welcome";
  else if (need[screen] && !state[need[screen]]) screen = state.topicId ? "teach" : "welcome";

  useEffect(() => {
    // Move keyboard/screen-reader focus to the new screen's title (h1 needs tabindex to be focusable).
    if (lastScreen.current && lastScreen.current !== screen) {
      const h = mainRef.current?.querySelector("h1");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
    lastScreen.current = screen;
  }, [screen]);

  useEffect(() => {
    if (!ready || screen === "notfound") return;
    const want = pathFor(screen, state.topicId);
    if (location.pathname !== want) history[screen === "reading" ? "replaceState" : "pushState"](null, "", want);
  }, [screen, state.topicId, ready]);

  useEffect(() => {
    const onPop = () => {
      const parsed = parsePath(location.pathname);
      if (parsed?.screen === "auth") setAuthCtx({ mode: "register", returnTo: null });
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

  // Real waiting time while the AI works, so the screen can say what is happening.
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [busy]);

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

  // Late sign-up: copy this browser's journey into the new/existing account (state + history + mastery).
  async function migrateProgress(plan) {
    const rewards = [];
    try {
      const put = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: plan.sid, state: plan.snapshot }) });
      if (!put.ok) return { ok: false, reward: null };
      for (const ev of plan.events) {
        const r = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: ev.type, sid: plan.sid, payload: ev.payload }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return { ok: false, reward: mergeRewards(rewards) };
        rewards.push(j.reward);
      }
      return { ok: true, reward: mergeRewards(rewards) };
    } catch {
      return { ok: false, reward: mergeRewards(rewards) };
    }
  }

  // Read an explanation. Preference: cloud AI (paid plan, online) -> AI in the browser (WebGPU) -> basic engine.
  // Every provider's answer is verified (verbatim quotes, safe text); anything unusable falls through to the next.
  async function analyzeText(text) {
    setCero({ status: "idle", text: "" });
    setClar({});
    const basic = analyze(topic, text);
    if (!cloudAvailable && !localReady) { set({ analysis: basic, exam: null }); return go("reading"); }
    pending.current = true;
    setBusy("analyze");
    set({ analysis: basic, exam: null });
    go("reading");
    let analysis = null;
    const wait = new Promise((res) => setTimeout(res, 900));
    if (cloudAvailable) {
      setBusyEngine("cloud");
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), AI_TIMEOUT);
      try { analysis = await cloudAnalysis(topic.id, text, state.level, ctl.signal); } catch (e) { if (e.status === 401) expire(); }
      clearTimeout(timer);
    }
    if (!analysis && localReady) {
      setBusyEngine("webgpu");
      try { analysis = await webgpuAnalysis(topic, text, state.level); } catch { /* fall through to the basic engine */ }
    }
    await wait;
    pending.current = false;
    setBusy(null);
    setBusyEngine(null);
    set({ analysis: analysis ?? { ...basic, log: { ...basic.log, fallback: true } } });
    go("reflect");
  }

  const actions = {
    home: () => go(learner ? "hub" : "welcome"),
    // "Probar ahora": straight to the first real step. No account needed (it is offered after the first result).
    start: () => go(learner ? "hub" : "goal"),
    openAuth: (mode = "register", returnTo = screen, plan = null) => {
      setAuthCtx({ mode, returnTo, plan });
      go("auth");
    },
    authDone: async (migrate) => {
      let me = null;
      try { me = await fetch("/api/me").then((r) => r.json()); } catch { /* handled below */ }
      const who = me?.learner;
      if (!who) { setFlash({ kind: "error", text: "Entraste, pero no pude cargar tu cuenta. Recarga la página." }); return; }
      setAccount(me.account);
      setDbOk(true);
      const plan = migrate ? buildMigration(state, () => crypto.randomUUID()) : null;
      if (plan) {
        const back = authCtx.returnTo && STEPS.includes(authCtx.returnTo) && !OFF_PATH.includes(authCtx.returnTo) ? authCtx.returnTo : "hub";
        plan.snapshot = { ...plan.snapshot, screen: back };
        const res = await migrateProgress(plan);
        learnerRef.current = who;
        setLearner(who);
        setState(plan.snapshot);
        if (res.ok) clear(); // it now lives in the account
        if (res.reward) { setReward(res.reward); if (res.reward.level) setLearner((l) => (l ? { ...l, level: res.reward.level } : l)); }
        setFlash(res.ok
          ? { kind: "info", text: "¡Listo! Tu avance quedó guardado en tu cuenta." }
          : { kind: "error", text: "Entraste a tu cuenta, pero no pude guardar todo tu avance. Sigue también en este navegador; vuelve a intentarlo más tarde." });
      } else {
        learnerRef.current = who;
        setLearner(who);
        setState({ ...initialState(), level: state.level, screen: "hub" });
        setFlash(null);
      }
      window.scrollTo({ top: 0 });
    },
    authSkip: () => go(authCtx.returnTo && !OFF_PATH.includes(authCtx.returnTo) ? authCtx.returnTo : "goal"),
    logout: async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      clear(); forgetAccount(); learnerRef.current = null; setLearner(null); setAccount(null); setReward(null); setPendingSync(0); setState(initialState()); setFlash(null);
    },
    continueSession: async (sid) => {
      try {
        const r = await fetch(`/api/state?sid=${sid}`);
        if (r.status === 401) return expire();
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setState({ ...restore(j.state), sid }); setFlash(null); window.scrollTo({ top: 0 });
      } catch {
        setFlash({ kind: "error", text: "No pude abrir ese tema ahora. Revisa tu conexión y vuelve a intentarlo." });
      }
    },
    startTopic: (topicId) => {
      setState({ ...initialState(), level: state.level, topicId, sid: crypto.randomUUID(), locked: true, screen: "goal" });
      setFlash(null);
      window.scrollTo({ top: 0 });
    },
    // The account switches to another of its profiles (a child, or a student of a classroom).
    switchProfile: async (profileId) => {
      try {
        const r = await fetch("/api/profiles/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) });
        if (r.status === 401) return expire();
        if (!r.ok) throw new Error("switch");
        const me = await fetch("/api/me").then((x) => x.json());
        applyMe(me);
        setState({ ...(me.state ? restore(me.state) : initialState()), screen: "hub" });
        setReward(null);
        setFlash(null);
        setPendingSync(outboxSize(me.learner.id));
        window.scrollTo({ top: 0 });
      } catch {
        setFlash({ kind: "error", text: "No pude cambiar de perfil. Esto necesita internet." });
      }
    },
    // Plan chosen on /planes (the "payment" is simulated): reload the account with its new plan.
    planSet: async (plan) => {
      const me = await fetch("/api/me").then((r) => r.json());
      applyMe(me);
      go("hub");
      setFlash({ kind: "info", text: `¡Listo! Tu plan ahora es ${planOf(plan)?.name ?? plan} (simulado: no se cobró nada).` });
    },
    // From the landing pricing: guests create an account with that plan, accounts go to their plan page.
    choosePlan: (planId) => { if (learner) return go("plans"); actions.openAuth("register", "welcome", planId); },
    resume: () => go(state.mastered ? "card" : state.analysis ? "reflect" : "teach"),
    back: () => { if (screen === "auth") return go(authCtx.returnTo && authCtx.returnTo !== "auth" && authCtx.returnTo !== "notfound" ? authCtx.returnTo : "welcome"); const prev = { plans: learner ? "hub" : "welcome", family: "hub", classes: "hub", goal: learner ? "hub" : "welcome", frictions: "goal", prefs: "frictions", teach: "prefs" }[screen]; if (prev) go(prev); },
    reset: () => {
      if (!confirm("¿Borrar tu progreso en este navegador y empezar de nuevo?")) return;
      clear(); setState(initialState()); setFlash(null);
    },
    goalNext: () => {
      if (!state.topicId) return setFlash({ kind: "error", text: "Elige un tema para continuar." });
      if (!state.goal) return setFlash({ kind: "error", text: "Cuéntame para qué lo quieres aprender; así preparo la sesión." });
      go("frictions");
    },
    demoText: () => { set({ text: DEMO_BAD[state.topicId] ?? "" }); setFlash(null); },
    goodText: () => { set({ text: topic.modelExplanation }); setFlash(null); },
    teachSubmit: async () => {
      const check = validateExplanation(topic, state.text);
      if (!check.ok) return setFlash({ kind: "error", text: check.message });
      // Without cloud AI the in-browser AI needs a one-time download: ask first, or let the learner pick the basic engine.
      if (!cloudAvailable && localAI.checked && localAI.supported && !localReady && !basicChosen && localAI.phase !== "error") {
        setFlash({ kind: "error", text: "Antes de seguir, descarga la IA de tu navegador o elige el modo básico (en el recuadro de abajo)." });
        return document.querySelector('[data-testid="local-ai"]')?.scrollIntoView({ block: "center" });
      }
      await analyzeText(state.text);
    },
    // Cero asked questions: the learner's answers are added to the explanation and Cero re-reads everything.
    clarify: async () => {
      const qs = questionsFor(topic, state.analysis, state.level);
      const given = qs.map((q) => ({ q, a: (clar[q.conceptId] ?? "").replace(/\s+/g, " ").trim() })).filter((x) => x.a);
      if (!given.length) return setFlash({ kind: "error", text: "Escribe tu respuesta en al menos una de las dudas de Cero." });
      if (given.some((x) => wordsIn(x.a) < 4)) return setFlash({ kind: "error", text: "Cuéntale un poco más a Cero (al menos 4 palabras) para que pueda entenderte." });
      const text = `${state.text.trim()}\n${given.map((x) => x.a).join(" ")}`;
      set({ text });
      await analyzeText(text);
    },
    takeExam: async () => {
      const variant = pickVariant(topic, state.level, state.attempt);
      const basic = () => takeExam(topic, variant, state.analysis);
      const wantsAI = Boolean(state.analysis.log?.ai) && (cloudAvailable || localReady);
      if (!wantsAI) { set({ exam: basic() }); return go("exam"); }
      setBusy("exam");
      let exam = null;
      if (cloudAvailable) {
        setBusyEngine("cloud");
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), AI_TIMEOUT);
        try { exam = await cloudExam(topic.id, variant.id, state.text, state.analysis, ctl.signal); } catch (e) { if (e.status === 401) expire(); }
        clearTimeout(timer);
      }
      if (!exam && localReady) {
        setBusyEngine("webgpu");
        try { exam = await webgpuExam(topic, variant, state.analysis, state.text); } catch { /* fall through */ }
      }
      setBusy(null);
      setBusyEngine(null);
      set({ exam: exam ?? { ...basic(), fallback: true } });
      go("exam");
    },
    seeResult: () => {
      // Coming back to the exam with the browser's Back button must not count the same exam twice.
      if (state.exam.recorded) return go("result");
      const next = { history: [...state.history, { attempt: state.attempt + 1, passed: state.exam.passed, variantId: state.exam.variantId, at: Date.now() }], attempt: state.attempt + 1, exam: { ...state.exam, recorded: true } };
      set(next);
      go("result");
      track({ ...state, ...next, screen: "result" }, "attempt", { attemptNo: next.attempt, variantId: state.exam.variantId, explanation: state.text, analysis: state.analysis, exam: state.exam, passed: state.exam.passed });
    },
    finish: () => {
      const mastered = { text: state.text, concepts: knownConcepts(topic, state.analysis).map((c) => c.label), at: Date.now() };
      set({ mastered });
      addToJournal({ topicId: state.topicId, text: mastered.text, concepts: mastered.concepts, attempts: state.history.length, at: mastered.at });
      setJournal(readJournal());
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
    if (voiceOk && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        rec.current = { api: await startRecording() };
        setFlash(null); setDict("recording");
      } catch {
        setFlash({ kind: "error", text: "No diste permiso al micrófono. No pasa nada: puedes escribir." });
      }
    }
  }

  /* --------------------------------- shared -------------------------------- */

  const flashEl = flash && (
    <div className={`flash flash-${flash.kind}`} role={flash.kind === "error" ? "alert" : "status"} data-testid="flash" id="flash-msg">{flash.text}</div>
  );

  /* --------------------------------- screens ------------------------------- */

  const views = {
    welcome() {
      return (
        <Landing
          ai={ai}
          dbOk={dbOk}
          hasProgress={!learner && hasLocalProgress(state)}
          onStart={actions.start}
          onResume={actions.resume}
          onLogin={() => actions.openAuth("login")}
          onStartTopic={actions.startTopic}
          onChoosePlan={actions.choosePlan}
          journal={journal}
        />
      );
    },

    auth() {
      const saving = !learner && hasLocalProgress(state) && topic ? progressSummary(state, topic.title) : "";
      return (
        <Auth
          key={`${authCtx.mode}-${authCtx.plan ?? ""}`}
          initialPlan={authCtx.plan}
          dbOk={dbOk}
          initialMode={authCtx.mode}
          saving={saving}
          onDone={actions.authDone}
          onSkip={actions.authSkip}
          skipLabel={authCtx.returnTo && !OFF_PATH.includes(authCtx.returnTo) ? "Volver sin crear cuenta" : "Seguir sin cuenta"}
        />
      );
    },

    notfound() {
      return (
        <section aria-labelledby="h-404" className="notfound" data-testid="not-found">
          <Cero mood="confundido" cls="cero-xl" />
          <h1 id="h-404">Esta página no existe</h1>
          <p className="lead">Puede que el enlace esté incompleto o que el tema ya no exista. ¡Hasta Cero se perdió!</p>
          <div className="cta-row cta-center">
            <Btn cls="btn-primary btn-lg" onClick={() => go(learner ? "hub" : "welcome")} testid="notfound-home"><I as={House} /> Ir al inicio</Btn>
            <Btn cls="btn-secondary" onClick={() => go(learner ? "hub" : "goal")} testid="notfound-topics">Elegir un tema</Btn>
          </div>
        </section>
      );
    },

    hub() {
      return <Hub onContinue={actions.continueSession} onStartTopic={actions.startTopic} onExpired={expire} account={account} caps={caps} online={online} onGo={go} />;
    },

    plans() {
      return <PlansScreen account={account} forced={Boolean(learner && !account?.plan)} onPlanSet={actions.planSet} onSignup={(p) => actions.openAuth("register", "welcome", p)} onBack={() => go(learner ? "hub" : "welcome")} />;
    },

    family() {
      return <FamilyPanel onSwitch={actions.switchProfile} />;
    },

    classes() {
      return <ClassesPanel onSwitch={actions.switchProfile} />;
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
      const marked = FRICTIONS.filter((f) => state.frictions[f.id] !== undefined).length;
      return (
        <section aria-labelledby="h-fr">
          <CeroSays mood="curioso">Cuéntame qué te cuesta. Así sé cómo ayudarte.</CeroSays>
          <h1 id="h-fr">¿Te pasa algo de esto?</h1>
          <p className="lead">Con <strong>{topic.title}</strong>. Responde «Sí» o «No» en cada frase. En el siguiente paso verás qué cambia con tus respuestas. Puedes saltarte este paso.</p>
          <ul className="friction-list" data-testid="frictions">
            {FRICTIONS.map((f) => {
              const v = state.frictions[f.id];
              const pick = (val) => set((s) => ({ frictions: { ...s.frictions, [f.id]: s.frictions[f.id] === val ? undefined : val } }));
              return (
                <li key={f.id} className={`card friction ${v === true ? "is-yes" : v === false ? "is-no" : ""}`}>
                  <p id={`fr-${f.id}`}>{f.text}</p>
                  <div className="seg" role="group" aria-labelledby={`fr-${f.id}`}>
                    <button type="button" className={`btn seg-yes ${v === true ? "is-on" : ""}`} aria-pressed={v === true} onClick={() => pick(true)} data-action="friction" data-id={f.id} data-val="1"><I as={Check} size={20} /> Sí, me pasa</button>
                    <button type="button" className={`btn seg-no ${v === false ? "is-on" : ""}`} aria-pressed={v === false} onClick={() => pick(false)} data-action="friction" data-id={f.id} data-val="0"><I as={X} size={20} /> No</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="note fr-count" aria-live="polite">{marked ? `Respondiste ${marked} de ${FRICTIONS.length}. Toca otra vez una respuesta para quitarla.` : "Aún no respondes ninguna."}</p>
          <div className="cta-row">
            <Btn cls="btn-primary btn-lg" onClick={() => go("prefs")} testid="fr-next">Continuar <I as={ArrowRight} /></Btn>
            <Btn cls="btn-ghost" onClick={() => go("prefs")} testid="fr-skip">Saltar este paso</Btn>
          </div>
        </section>
      );
    },

    prefs() {
      const yes = FRICTIONS.filter((f) => state.frictions[f.id] === true).map((f) => f.id);
      const bits = [];
      if (yes.includes("leo")) bits.push("Te trabas al usarlo: el examen de Cero será un caso nuevo, no uno que ya viste.");
      if (yes.includes("bloqueo")) bits.push("Te pones en blanco: antes del examen, Cero te dirá sus dudas para que completes tu explicación con calma.");
      if (yes.includes("poco")) bits.push("Tienes poco tiempo: si Cero falla, la práctica es de solo 2 preguntas.");
      if (yes.includes("nose")) bits.push("Nadie te dice tu error: si Cero falla, verás marcada la frase exacta que lo confundió.");
      if (yes.includes("sinnet")) bits.push("Internet inestable: la app funciona sin conexión, tu avance se guarda en este dispositivo y Cero puede leerte con la IA del navegador.");
      const g = GOALS.find((x) => x.id === state.goal);
      const ask = topic.concepts[1]?.ask[state.level] ?? topic.concepts[0].ask[state.level];
      const voice = state.inputMode === "voice" && voiceOk;
      return (
        <section aria-labelledby="h-pref">
          <h1 id="h-pref">Ajusta a Cero</h1>
          <p className="lead">Tus elecciones cambian la siguiente pantalla. Puedes volver a cambiarlas cuando quieras.</p>
          <h2 className="h-first">¿Cómo será Cero?</h2>
          <p className="note">Cambia cómo te pregunta y qué problema le toca en el examen.</p>
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
              <span className="choice-ico"><I as={Keyboard} /></span><span className="choice-text"><strong>Escribiendo</strong><small>Un cuaderno y frases para empezar</small></span>
            </Choice>
            <Choice name="mode" value="voice" checked={state.inputMode === "voice"} disabled={!voiceOk} onChange={() => set({ inputMode: "voice" })}>
              <span className="choice-ico"><I as={Mic} /></span>
              <span className="choice-text"><strong>Hablando</strong><small>{voiceOk ? "Un botón grande de micrófono; luego puedes corregir el texto" : learner ? "Necesita internet" : "Disponible con un plan"}</small></span>
            </Choice>
          </fieldset>
          {voice && (
            <div className="priming" data-testid="mic-priming" aria-live="polite">
              <h3 className="plan-title"><I as={Mic} size={20} /> Antes de usar el micrófono</h3>
              <ul className="check">
                <li><strong>Para qué:</strong> para que le expliques a Cero hablando, como en clase.</li>
                <li><strong>Cuándo:</strong> solo mientras tocas el botón grande. Nunca escucha en segundo plano.</li>
                <li><strong>Qué pasa con tu voz:</strong> "se envía a un servicio de IA (OpenRouter) para pasarla a texto. Alumno Cero no guarda el audio."</li>
                <li><strong>Permiso:</strong> tu navegador te lo pedirá la primera vez. Si dices que no, puedes escribir igual.</li>
              </ul>
              <Btn cls="btn-secondary" onClick={() => set({ inputMode: "text" })} testid="mic-decline"><I as={Keyboard} size={20} /> Prefiero escribir</Btn>
            </div>
          )}
          {(bits.length > 0 || g) && (
            <div className="plan sticky sticky-yellow" data-testid="plan">
              <h2 className="plan-title"><I as={Sparkles} size={20} /> Tu sesión, según lo que respondiste</h2>
              <ul>{g && <li>{g.cero}</li>}{bits.map((b) => <li key={b}>{b}</li>)}</ul>
              <p className="note">¿Algo no va contigo? <button type="button" className="linkish" onClick={() => go("frictions")}>Cambia tus respuestas</button>.</p>
            </div>
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
          <p className="settings-line" data-testid="teach-settings">
            <span className="chip">{level.name}</span>
            <button type="button" className="linkish" onClick={() => go("prefs")} data-testid="teach-change-prefs">Cambiar ajustes</button>
          </p>
          <div className="teach-grid">
          <div className="teach-main">
          <div className={`subject-help subject-${subject.tone}`} data-testid="subject-help"><span className="subject-ico" aria-hidden="true">{subject.mode === "steps" ? <Calculator size={22} strokeWidth={2.5} /> : <FlaskConical size={22} strokeWidth={2.5} />}</span><p><strong>{subject.teach.title}.</strong> {subject.teach.help}</p></div>
          {callout && <div className="callout" data-testid="retry-callout"><span className="callout-ico"><I as={Highlighter} /></span><p><strong>Para corregir:</strong> {callout}</p></div>}
          <div className="seg mode-seg" role="group" aria-label="¿Cómo le vas a enseñar?">
            <button type="button" className={`btn ${!voiceMode ? "btn-primary" : "btn-secondary"}`} aria-pressed={!voiceMode} onClick={() => set({ inputMode: "text" })} data-testid="mode-text"><I as={Keyboard} size={20} /> Escribiendo</button>
            <button type="button" className={`btn ${voiceMode ? "btn-primary" : "btn-secondary"}`} aria-pressed={voiceMode} disabled={!voiceOk} onClick={() => set({ inputMode: "voice" })} data-testid="mode-voice" title={voiceOk ? "" : learner ? "Dictar necesita internet" : "El dictado por voz es parte de los planes"}><I as={Mic} size={20} /> Hablando</button>
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
          <textarea id="explanation" className="notebook" data-testid="explanation" rows={voiceMode ? 5 : 9} placeholder={voiceMode ? "Aquí aparecerá lo que digas…" : topic.hint} aria-describedby={flash?.kind === "error" ? "teach-help flash-msg" : "teach-help"} aria-invalid={flash?.kind === "error" ? true : undefined} value={state.text} onChange={(e) => { set({ text: e.target.value }); if (flash?.kind === "error") setFlash(null); }} />
          <div className={`wordmeter ${words >= MIN_WORDS ? "is-full" : ""}`} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <p id="teach-help" className="note"><strong><span id="wordcount">{words}</span> palabras</strong> · Intenta llegar a {MIN_WORDS}. Cero solo usará lo que {voiceMode ? "digas" : "escribas"} aquí.</p>
          {flashEl}
          {!cloudAvailable && <LocalAICard audience={learner ? "plan" : "guest"} declined={basicChosen} onDecline={() => setBasicChosen(true)} online={online} />}
          <div className="cta-row">
            <Btn cls="btn-primary btn-lg" onClick={actions.teachSubmit} testid="teach-submit">Enseñárselo a Cero <I as={ArrowRight} /></Btn>
          </div>
          <div className="aux-row">
            <Btn cls="btn-ghost" onClick={actions.demoText} testid="demo-text" title="Rellena una explicación con un error típico para ver cómo falla Cero"><I as={Lightbulb} size={20} /> Rellenar con una idea incorrecta</Btn>
            <Btn cls="btn-ghost" onClick={actions.goodText} testid="demo-good" title="Rellena una explicación correcta para ver cómo aprueba Cero"><I as={BookCheck} size={20} /> Rellenar con la explicación correcta</Btn>
          </div>
          </div>
          <aside className="teach-side" aria-label="Ayuda para enseñar">
            <Mochila topic={topic} onInsert={insertText} />
          </aside>
          </div>
        </section>
      );
    },

    reading() {
      const a = state.analysis;
      return (
        <section className="reading" aria-labelledby="h-read">
          <Cero mood="pensando" cls="cero-xl cero-think" />
          <h1 id="h-read">Cero está leyendo…</h1>
          <p className="lead" data-testid="processing" role="status">{busy === "analyze" ? (busyEngine === "webgpu" ? "Estoy leyendo tu explicación con la IA de tu navegador: tu texto no sale de este dispositivo." : "Estoy leyendo tu explicación con IA para ver qué ideas me enseñaste.") : "Revisé tu explicación en tu equipo, sin enviarla a ningún servidor."}</p>
          <ol className="proc-steps" data-testid="proc-steps">
            <li className="done"><span className="proc-ico"><I as={Check} size={18} /></span> Revisé tu texto: {a.log.sentences} {a.log.sentences === 1 ? "frase" : "frases"} y {a.log.matched} {a.log.matched === 1 ? "idea clave" : "ideas clave"}.</li>
            {busy === "analyze" && (
              <>
                <li className="now"><span className="proc-ico"><span className="spin"><I as={LoaderCircle} size={18} /></span></span> {busyEngine === "webgpu" ? <>Mi IA (en tu navegador, con WebGPU) está leyendo tu texto… <span className="proc-time" aria-hidden="true">{elapsed} s</span></> : <>Lo envié a la IA ({ai.writingModel}) y espero su lectura… <span className="proc-time" aria-hidden="true">{elapsed} s</span></>}</li>
                <li className="todo"><span className="proc-ico" aria-hidden="true">3</span> Después compruebo que cada cita sea una frase tuya, palabra por palabra.</li>
              </>
            )}
          </ol>
          {busy === "analyze" && busyEngine === "cloud" && elapsed >= 12 && <p className="note" data-testid="slow-note">La IA está tardando un poco. Si pasa de {AI_TIMEOUT / 1000} s, sigo con mi modo básico para que no esperes.</p>}
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
          {state.analysis.log?.ai && <p className="note" data-testid="ai-note"><I as={Sparkles} size={16} /> {state.analysis.log.provider === "webgpu" ? "Analizado con la IA de tu navegador (WebGPU): tu texto no salió de este dispositivo. Cada cita se verifica palabra por palabra." : `Analizado con IA en la nube (${ai.writingModel}). Cero escribió lo que entendió y sus dudas con IA, usando solo tus frases (cada cita se verifica palabra por palabra).`}</p>}
          {state.analysis.log?.fallback && <p className="note note-box" data-testid="ai-fallback">La IA no respondió a tiempo (o no respondió bien), así que usé el análisis básico de tu equipo. Puedes seguir igual.</p>}
          {!state.analysis.log?.ai && !state.analysis.log?.fallback && <p className="note" data-testid="basic-note">Cero te leyó con su modo básico: reglas del tema, sin IA.</p>}
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
            ? <div className="questions sticky sticky-yellow" data-testid="questions"><h2 className="plan-title"><I as={MessageCircleQuestionMark} size={20} /> Mis dudas</h2>
              <p className="note">Respóndeme aquí si quieres aclararme algo. Tus respuestas se suman a tu explicación y vuelvo a leerla.</p>
              <ul className="doubts">{qs.map((q) => (
                <li key={q.conceptId}>
                  <label htmlFor={`clar-${q.conceptId}`} className="doubt-q">{q.text}</label>
                  <textarea id={`clar-${q.conceptId}`} className="doubt-a" rows={2} placeholder="Escribe tu respuesta para Cero…" value={clar[q.conceptId] ?? ""} onChange={(e) => setClar((c) => ({ ...c, [q.conceptId]: e.target.value }))} data-testid={`doubt-${q.conceptId}`} />
                </li>
              ))}</ul>
              <Btn cls="btn-secondary" onClick={actions.clarify} testid="clarify"><I as={MessageCircle} size={20} /> Responderle a Cero</Btn>
            </div>
            : <p className="note note-box">No tengo dudas. ¡Creo que puedo intentarlo!</p>}
          {cloudAvailable && (
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
            <Btn cls="btn-secondary" onClick={() => go("teach")} disabled={busy === "exam"} testid="reflect-edit"><I as={PencilLine} /> Cambiar mi explicación</Btn>
          </div>
          <p className="note" role="status" data-testid="exam-status">{busy === "exam" && <>Cero está resolviendo un problema nuevo con IA. Suele tardar menos de 20 s; si la IA no responde, uso el modo básico. <span aria-hidden="true">({elapsed} s)</span></>}</p>
        </section>
      );
    },

    exam() {
      const e = state.exam;
      const v = topic.variants.find((x) => x.id === e.variantId);
      return (
        <section aria-labelledby="h-exam">
          <div className="cero-row cero-row-title"><Cero mood="pensando" cls="cero-lg" /><div><p className="kicker">Un problema que Cero nunca vio</p><h1 id="h-exam">El examen</h1></div></div>
          {e.ai && <p className="note" data-testid="exam-ai-note"><I as={Sparkles} size={16} /> {e.provider === "webgpu" ? "Cero razonó con la IA de tu navegador usando solo tu explicación; la aritmética se verifica por separado." : "Cero razonó con IA en la nube usando solo tu explicación; la aritmética se verifica por separado."}</p>}
          {e.fallback && <p className="note note-box" data-testid="exam-fallback">La IA no dio un razonamiento verificable a tiempo, así que el examen usó el modo básico. El resultado sigue siendo válido.</p>}
          <div className="exam-paper"><span className="tape tape-tc" aria-hidden="true" /><p>{v.context}</p><p className="exam-q"><strong>{v.question}</strong></p></div>
          <h2>Así lo resuelve Cero <small className="h-sub">(solo con lo que le enseñaste)</small></h2>
          <p className="note">{subject.exam.intro}</p>
          <ol className="steps" data-testid="steps">
            {e.steps.map((s, i) => (
              <li key={i} className={s.ok ? "ok" : "bad"}><span className={`badge ${s.ok ? "badge-ok" : "badge-warn"}`}><I as={s.ok ? Check : TriangleAlert} size={16} /> {s.ok ? "Tú me lo enseñaste" : s.source === "user-wrong" ? "Eso me dijiste" : "Me faltó información"}</span> {s.text}</li>
            ))}
          </ol>
          {e.work?.length > 0 && <Cuaderno work={e.work} title="El cuaderno de Cero" testid="notebook" />}
          {!e.work && e.rows.length > 0 && (
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
            {!learner && <p className="note">Tu ficha es tuya: podrás copiarla, descargarla o imprimirla. Si quieres, después la guardas en una cuenta gratis.</p>}
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
          {e.work?.length > 0 && (
            <div className="cn-pair" data-testid="notebooks">
              <Cuaderno work={e.work} title="Lo que escribió Cero" marks testid="notebook-cero" />
              {correctWork(topic, topic.variants.find((x) => x.id === e.variantId)) && <Cuaderno work={correctWork(topic, topic.variants.find((x) => x.id === e.variantId))} title="Así se hace bien" tone="fix" testid="notebook-fix" />}
            </div>
          )}
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
          {learner ? (
            <div className="save-box save-box-ok" data-testid="saved-box">
              <span className="save-ico"><I as={CircleCheck} size={26} /></span>
              <div>
                <h2 className="plan-title">Tu ficha está guardada en tu cuenta</h2>
                <p>Mira tu XP, tus insignias y todas tus fichas en tu hub.</p>
                <Btn cls="btn-secondary" onClick={() => go("hub")} testid="card-hub"><I as={House} size={20} /> Ir a mi hub</Btn>
              </div>
            </div>
          ) : dbOk ? (
            <div className="save-box" data-testid="save-progress-box">
              <span className="save-ico"><I as={Save} size={26} /></span>
              <div>
                <h2 className="plan-title">Guarda tu progreso (opcional)</h2>
                <p>Ahora tu ficha vive solo en este navegador. Con una cuenta gratis la guardas, ganas XP e insignias y la ves desde cualquier equipo. Sin correo: solo usuario y contraseña.</p>
                <div className="cta-row cta-tight">
                  <Btn cls="btn-primary" onClick={() => actions.openAuth("register", "card")} testid="save-progress"><I as={UserPlus} size={20} /> Crear mi cuenta gratis</Btn>
                  <Btn cls="btn-ghost" onClick={() => actions.openAuth("login", "card")} testid="save-progress-login"><I as={LogIn} size={20} /> Ya tengo cuenta</Btn>
                </div>
              </div>
            </div>
          ) : (
            <p className="note note-box" data-testid="save-unavailable">Las cuentas no están disponibles ahora mismo. Tu ficha queda guardada en este navegador; también puedes copiarla o descargarla.</p>
          )}
          <Btn cls="btn-ghost" onClick={actions.anotherTopic} testid="another-topic"><I as={RotateCcw} size={20} /> Aprender otro tema</Btn>
        </section>
      );
    },
  };

  /* ---------------------------------- shell -------------------------------- */

  const step = PROGRESS[screen] ?? 0;
  const canBack = ["goal", "frictions", "prefs", "teach", "plans", "family", "classes"].includes(screen) || (screen === "auth" && !learner);
  const showTopFlash = flash && !["welcome", "teach", "goal", "card"].includes(screen);
  const canJump = ["frictions", "prefs", "teach", "reflect"].includes(screen) && !busy;
  const footerNote = (
    <p>
      <strong>{learner ? "Tu progreso está a salvo:" : "Tu progreso se queda aquí:"}</strong> {learner ? "tu plan, nivel, insignias y fichas se guardan en tu cuenta, y también en este dispositivo para usarlos sin internet." : "como invitado, se guarda solo en este navegador."}{" "}
      {learner
        ? (ai.configured ? "Con tu plan, Cero envía tu texto o tu audio a OpenRouter (IA en la nube); sin internet usa la IA de tu navegador." : "La IA en la nube está apagada: Cero usa la IA de tu navegador.")
        : "La IA corre en tu dispositivo: tus textos no salen de aquí."}
      {!storageOk && <span className="warn-inline"> Tu navegador no deja guardar: no podré recordar tu progreso.</span>}
    </p>
  );

  return (
    <div id="app" data-screen={screen}>
      <header className="topbar" data-testid="topbar">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); actions.home(); }} aria-label="Alumno Cero, volver al inicio">
          <span className="brand-mark" aria-hidden="true"><Cero mood="curioso" decorative /></span>
          <span className="brand-name">Alumno <span>Cero</span></span>
        </a>
        {screen === "welcome" && !learner ? (
          <LandingNav dbOk={dbOk} onStart={actions.start} onLogin={() => actions.openAuth("login")} />
        ) : (
          <div className="topbar-right">
            {learner && account && <AccountMenu learner={learner} account={account} caps={caps} onSwitch={actions.switchProfile} onGo={go} onLogout={actions.logout} />}
            {canBack && <button type="button" className="btn btn-ghost btn-sm" onClick={actions.back} data-testid="back"><I as={ArrowLeft} size={20} /> Atrás</button>}
            {!learner && dbOk && !["auth", "notfound"].includes(screen) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.openAuth("login", screen)} data-testid="topbar-login"><I as={LogIn} size={20} /><span className="btn-label">Entrar</span></button>}
            
            {!OFF_PATH.includes(screen) && <button type="button" className="btn btn-ghost btn-sm" onClick={actions.reset} title="Borra tu progreso de este navegador" data-testid="reset"><I as={RotateCcw} size={20} /><span className="btn-label">Empezar de nuevo</span></button>}
          </div>
        )}
      </header>
      {(!online || pendingSync > 0 || syncNote) && (
        <div className={`net-banner ${online ? "ok" : "off"}`} role="status" data-testid="net-banner">
          {!online
            ? <>Sin conexión: tu avance se guarda en este dispositivo{learner ? " y se sincronizará cuando vuelva internet" : ""}. {localReady ? "Cero sigue leyéndote con la IA del navegador." : "Cero usa su modo básico."}</>
            : pendingSync > 0 ? `Sincronizando ${pendingSync} ${pendingSync === 1 ? "cambio" : "cambios"} con tu cuenta…` : syncNote}
        </div>
      )}
      {!OFF_PATH.includes(screen) && (
        <nav className="progress" aria-label="Pasos del recorrido" data-testid="progress">
          <ol className="path">
            {STATIONS.map((s, i) => {
              const n = i + 1;
              const st = n < step ? "done" : n === step ? "now" : "todo";
              const Icon = n < step ? Check : s.icon;
              const target = canJump && n < step ? STATION_SCREEN[n] : null;
              const inner = (
                <>
                  <span className="station-dot" aria-hidden="true"><Icon size={n === step ? 22 : 18} strokeWidth={2.6} /></span>
                  <span className="station-name">{s.name}</span>
                  <span className="sr-only">{st === "done" ? " (hecho)" : st === "now" ? " (paso actual)" : " (pendiente)"}</span>
                </>
              );
              return (
                <li key={n} className={`station ${st}`} aria-current={st === "now" ? "step" : undefined}>
                  {target
                    ? <button type="button" className="station-btn" onClick={() => go(target)} title={`Volver a: ${s.name}`} data-testid={`station-${n}`}>{inner}</button>
                    : <span className="station-btn">{inner}</span>}
                </li>
              );
            })}
          </ol>
          <p className="progress-label" aria-hidden="true"><span className="progress-step">Paso {step} de {TOTAL}</span> <span className="progress-name">{STEP_LABEL[screen]}</span></p>
        </nav>
      )}
      <main id="main" tabIndex={-1} ref={mainRef} className={screen === "welcome" ? "" : "sheet"}>
        {showTopFlash && flashEl}
        {views[screen]()}
      </main>
      {screen === "welcome" ? (
        <LandingFooter />
      ) : (
        <footer className="footer">
          {footerNote}
          <p>Alumno Cero es para practicar con temas elegidos. No reemplaza a tu profe.</p>
        </footer>
      )}
      <RewardToast reward={reward} onClose={() => setReward(null)} />
    </div>
  );
}
