// Browser-only: a small LLM that runs on the learner's GPU (WebGPU) through WebLLM.
// Used (1) by guests, whose text never leaves the device, and (2) as the offline fallback of paid plans.
// The model is downloaded once (hundreds of MB) after the learner agrees, and cached by the browser.

const MODEL_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC";
const CONSENT_KEY = "alumno-cero:webgpu-consent";
export const MODEL_SIZE_TEXT = "cerca de 1 GB";

const SERVER = { checked: false, supported: false, f16: false, cached: false, phase: "idle", progress: 0, text: "", modelId: null, consent: false, error: null, lastError: null };
let snap = SERVER;
const subs = new Set();
const set = (patch) => { snap = { ...snap, ...patch }; subs.forEach((f) => f()); };

export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getSnapshot = () => snap;
export const getServerSnapshot = () => SERVER;

let engine = null;
let loading = null;

/** Detect WebGPU, pick the model that fits the GPU and see if it is already cached. Cheap: downloads nothing. */
export async function probe() {
  if (snap.checked) return snap;
  let supported = false;
  let f16 = false;
  try {
    if (typeof navigator !== "undefined" && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) { supported = true; f16 = adapter.features.has("shader-f16"); }
    }
  } catch { /* no WebGPU */ }
  const modelId = f16 ? MODEL_F16 : MODEL_F32;
  let cached = false;
  if (supported) {
    try { cached = await (await import("@mlc-ai/web-llm")).hasModelInCache(modelId); } catch { /* unknown */ }
  }
  let consent = false;
  try { consent = localStorage.getItem(CONSENT_KEY) === "1"; } catch { /* private mode */ }
  set({ checked: true, supported, f16, modelId, cached, consent, phase: cached ? "cached" : "idle" });
  return snap;
}

export function giveConsent() {
  try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* ignore */ }
  set({ consent: true });
}

/** Load (downloading first if needed) the model into the GPU. Resolves with the engine. */
export function loadEngine() {
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  loading = (async () => {
    const info = await probe();
    if (!info.supported) throw new Error("Este navegador no tiene WebGPU.");
    set({ phase: info.cached ? "loading" : "downloading", progress: 0, text: "", error: null });
    try {
      const web = await import("@mlc-ai/web-llm");
      engine = await web.CreateMLCEngine(info.modelId, {
        initProgressCallback: (r) => set({ progress: r.progress ?? 0, text: r.text ?? "" }),
      });
      set({ phase: "ready", cached: true, progress: 1 });
      return engine;
    } catch (e) {
      set({ phase: "error", error: e?.message ?? "No se pudo cargar la IA del navegador." });
      throw e;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/**
 * One JSON answer from the local model. `schema` (a JSON Schema object) constrains the output so even a small
 * model returns valid JSON; the caller still validates every field.
 */
export async function chatJson(messages, { schema, max_tokens = 900, timeoutMs = 120_000 } = {}) {
  const e = await loadEngine();
  set({ phase: "thinking", lastError: null });
  const timer = setTimeout(() => { try { e.interruptGenerate(); } catch { /* ignore */ } }, timeoutMs);
  try {
    const res = await e.chat.completions.create({
      messages,
      temperature: 0,
      max_tokens,
      response_format: schema ? { type: "json_object", schema: JSON.stringify(schema) } : { type: "json_object" },
    });
    set({ phase: "ready" });
    return res.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    // A lost GPU device leaves a dead engine: drop it and re-detect WebGPU on the next try.
    console.warn("[webgpu] la IA del navegador falló:", err);
    engine = null;
    set({ phase: "error", lastError: String(err?.message ?? err).slice(0, 200), checked: false });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** The model answered but its output could not be verified (kept to explain the fallback to the learner). */
export function reportUnverified() {
  set({ lastError: "su respuesta no pasó la verificación de citas", phase: snap.phase === "error" ? "ready" : snap.phase });
}
