// Persistence: everything stays in this browser (localStorage). No account, no server.
const KEY = "alumno-cero:v1";

export const initialState = () => ({
  v: 1,
  screen: "welcome",
  topicId: null,
  goal: null,            // "examen" | "trabajo" | "curiosidad" | "ensenar"
  frictions: {},         // id -> true (agree) | false (disagree)
  level: "companero",
  inputMode: "text",     // "text" | "voice"
  text: "",
  attempt: 0,
  analysis: null,
  exam: null,
  history: [],           // {attempt, passed, variantId, at}
  practice: null,        // {conceptId, index, answers:[]}
  practiced: {},         // conceptId -> true
  mastered: null,        // {text, concepts, at}
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const data = JSON.parse(raw);
    return data && data.v === 1 ? { ...initialState(), ...data } : initialState();
  } catch {
    return initialState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
